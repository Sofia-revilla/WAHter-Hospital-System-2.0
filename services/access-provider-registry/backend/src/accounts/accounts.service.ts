import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import argon2 from "argon2";
import { Database, EVENT_TYPES, EventBus, type AuthUser, type StaffRole } from "@wahter/shared";
import { canDecide, removesLastAdmin } from "./access-rules";
import { AccountsRepository, type AccountRow } from "./accounts.repository";
import type { CreateAccountDto, RequestApprovalDto, UpdateAccountDto } from "./accounts.dto";

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";

const LAST_ADMIN_MESSAGE = "At least one active System Administrator has to remain, so this change isn't allowed.";

export interface ApprovalRow {
  id: string;
  kind: "RoleChange" | "Disable";
  account_id: string;
  details: { newRole?: StaffRole; fromRole?: StaffRole };
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  requested_by_id: string;
  requested_at: Date;
  decided_by_id: string | null;
  decided_at: Date | null;
  decision_note: string | null;
}

// What the System Administrator's Users and Roles screen gets. Never the
// password hash.
function toAccountDto(row: AccountRow) {
  return {
    id: row.id,
    staffId: row.staff_id,
    username: row.username,
    email: row.email,
    name: row.name,
    role: row.role,
    department: row.department,
    license: row.license,
    status: row.status,
    isLocked: row.locked_at !== null,
    failedAttempts: row.failed_attempts,
    lastLoginAt: row.last_login_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

function toApprovalDto(row: ApprovalRow) {
  return {
    id: row.id,
    kind: row.kind,
    accountId: row.account_id,
    newRole: row.details.newRole ?? null,
    fromRole: row.details.fromRole ?? null,
    reason: row.reason,
    status: row.status,
    requestedById: row.requested_by_id,
    requestedAt: row.requested_at.toISOString(),
    decidedById: row.decided_by_id,
    decidedAt: row.decided_at?.toISOString() ?? null,
    decisionNote: row.decision_note,
  };
}

// UC-08 main flow, access management side: create, modify, disable, and
// restore accounts and role assignments.
@Injectable()
export class AccountsService {
  constructor(
    private readonly accounts: AccountsRepository,
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  async list() {
    return (await this.accounts.findAll(false)).map(toAccountDto);
  }

  async create(body: CreateAccountDto, admin: AuthUser) {
    let accountId: string;
    try {
      accountId = await this.database.transaction(async (client) =>
        this.accounts.create(client, {
          name: body.name.trim(),
          role: body.role,
          department: body.department.trim(),
          license: body.license ?? null,
          username: body.username,
          email: body.email.trim().toLowerCase(),
          passwordHash: await argon2.hash(body.temporaryPassword, { type: argon2.argon2id }),
          createdById: admin.id,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException("That username, or someone with that name and role, already exists.");
      }
      throw error;
    }
    const account = (await this.accounts.findById(accountId))!;
    this.bus.publish(
      EVENT_TYPES.accountCreated,
      { accountId, staffId: account.staff_id, role: account.role },
      admin,
    );
    return toAccountDto(account);
  }

  // Name, department, license, email: no second admin needed for these
  async update(id: string, body: UpdateAccountDto, admin: AuthUser) {
    await this.require(id);
    const fields = Object.entries(body)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    if (fields.length === 0) return toAccountDto((await this.accounts.findById(id))!);
    await this.accounts.updateDetails(id, {
      name: body.name?.trim(),
      department: body.department?.trim(),
      license: body.license,
      email: body.email?.trim().toLowerCase(),
    });
    this.bus.publish(EVENT_TYPES.accountUpdated, { accountId: id, fields }, admin);
    return toAccountDto((await this.accounts.findById(id))!);
  }

  async unlock(id: string, admin: AuthUser) {
    await this.require(id);
    if (!(await this.accounts.unlock(id))) throw new ConflictException("This account isn't locked.");
    this.bus.publish(EVENT_TYPES.accountUnlocked, { accountId: id }, admin);
    return toAccountDto((await this.accounts.findById(id))!);
  }

  // Bringing an account back is direct; taking access away needs approval
  async restore(id: string, admin: AuthUser) {
    await this.require(id);
    if (!(await this.accounts.restore(id))) throw new ConflictException("This account isn't disabled.");
    this.bus.publish(EVENT_TYPES.accountRestored, { accountId: id }, admin);
    return toAccountDto((await this.accounts.findById(id))!);
  }

  // ─── second-admin approvals ───

  async listApprovals(status?: string) {
    const rows = await this.database.query<ApprovalRow>(
      `SELECT * FROM approval_requests WHERE ($1::text IS NULL OR status = $1) ORDER BY requested_at DESC LIMIT 200`,
      [status ?? null],
    );
    return rows.map(toApprovalDto);
  }

  async requestApproval(accountId: string, body: RequestApprovalDto, admin: AuthUser) {
    const account = await this.require(accountId);
    if (account.staff_id === admin.id) {
      throw new ForbiddenException("Ask another System Administrator to change your own account.");
    }
    if (body.kind === "Disable" && account.status === "Disabled") {
      throw new ConflictException("This account is already disabled.");
    }
    if (body.kind === "RoleChange" && body.newRole === account.role) {
      throw new ConflictException(`This account is already ${body.newRole}.`);
    }

    // UC-08 3a, checked when asked and again when approved
    const snapshot = (await this.accounts.findAll(false)).map((row) => ({ id: row.id, role: row.role, status: row.status }));
    const change = body.kind === "Disable" ? { kind: "Disable" as const } : { kind: "RoleChange" as const, newRole: body.newRole! };
    if (removesLastAdmin(snapshot, accountId, change)) throw new ConflictException(LAST_ADMIN_MESSAGE);

    const details = body.kind === "RoleChange" ? { newRole: body.newRole, fromRole: account.role } : {};
    let row: ApprovalRow | null;
    try {
      row = await this.database.one<ApprovalRow>(
        `INSERT INTO approval_requests (id, kind, account_id, details, reason, requested_by_id)
         VALUES ('APR-' || lpad(nextval('approval_number')::text, 4, '0'), $1, $2, $3, $4, $5)
         RETURNING *`,
        [body.kind, accountId, JSON.stringify(details), body.reason.trim(), admin.id],
      );
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException("There's already a pending request for this account.");
      }
      throw error;
    }
    this.bus.publish(EVENT_TYPES.approvalRequested, { requestId: row!.id, kind: body.kind, accountId }, admin);
    return toApprovalDto(row!);
  }

  async decide(requestId: string, decision: "Approved" | "Rejected", note: string | undefined, admin: AuthUser) {
    const result = await this.database.transaction(async (client) => {
      const { rows } = await client.query<ApprovalRow>(
        "SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE",
        [requestId],
      );
      const request = rows[0];
      if (!request) throw new NotFoundException(`No request ${requestId}`);
      if (request.status !== "Pending") throw new ConflictException(`This request was already ${request.status.toLowerCase()}.`);

      const target = await this.accounts.findById(request.account_id);
      const refusal = canDecide(
        { requestedById: request.requested_by_id, targetStaffId: target!.staff_id },
        admin.id,
        decision,
      );
      if (refusal) throw new ForbiddenException(refusal);

      if (decision === "Approved") {
        // re-checked with the account rows locked: things may have changed since the request
        const snapshot = await this.accounts.snapshotForUpdate(client);
        const change =
          request.kind === "Disable"
            ? { kind: "Disable" as const }
            : { kind: "RoleChange" as const, newRole: request.details.newRole! };
        if (removesLastAdmin(snapshot, request.account_id, change)) throw new ConflictException(LAST_ADMIN_MESSAGE);
        if (request.kind === "Disable") await this.accounts.setStatus(client, request.account_id, "Disabled");
        else await this.accounts.setRole(client, request.account_id, request.details.newRole!);
      }

      const updated = await client.query<ApprovalRow>(
        `UPDATE approval_requests
            SET status = $2, decided_by_id = $3, decided_at = now(), decision_note = $4
          WHERE id = $1
          RETURNING *`,
        [requestId, decision, admin.id, note?.trim() || null],
      );
      return updated.rows[0];
    });

    this.bus.publish(
      EVENT_TYPES.approvalDecided,
      { requestId, kind: result.kind, accountId: result.account_id, decision },
      admin,
    );
    if (decision === "Approved" && result.kind === "Disable") {
      this.bus.publish(EVENT_TYPES.accountDisabled, { accountId: result.account_id, requestId }, admin);
    }
    if (decision === "Approved" && result.kind === "RoleChange") {
      this.bus.publish(
        EVENT_TYPES.roleChanged,
        {
          accountId: result.account_id,
          fromRole: result.details.fromRole ?? "",
          toRole: result.details.newRole ?? "",
          requestId,
        },
        admin,
      );
    }
    return toApprovalDto(result);
  }

  private async require(id: string) {
    const account = await this.accounts.findById(id);
    if (!account || account.is_demo) throw new NotFoundException(`No account ${id}`);
    return account;
  }
}
