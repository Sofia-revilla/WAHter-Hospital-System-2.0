import { Injectable } from "@nestjs/common";
import { Database, type PoolClient, type StaffRole } from "@wahter/shared";

// One account with the registry details of the person it belongs to
export interface AccountRow {
  id: string;
  staff_id: string;
  username: string;
  email: string;
  password_hash: string;
  status: "Active" | "Disabled";
  failed_attempts: number;
  locked_at: Date | null;
  is_demo: boolean;
  last_login_at: Date | null;
  created_at: Date;
  name: string;
  role: StaffRole;
  department: string;
  license: string | null;
}

export interface ChallengeRow {
  id: string;
  account_id: string;
  role: StaffRole;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
}

const SELECT_ACCOUNT = `SELECT a.*, s.name, s.role, s.department, s.license
                          FROM accounts a JOIN staff s ON s.id = a.staff_id`;

// Data access only. The rules about who may sign in or change what live in
// the services and in access-rules.ts.
@Injectable()
export class AccountsRepository {
  constructor(private readonly database: Database) {}

  findAll(includeDemo: boolean) {
    return this.database.query<AccountRow>(
      `${SELECT_ACCOUNT} WHERE ($1 OR NOT a.is_demo) ORDER BY s.name`,
      [includeDemo],
    );
  }

  findById(id: string) {
    return this.database.one<AccountRow>(`${SELECT_ACCOUNT} WHERE a.id = $1`, [id]);
  }

  findByStaffId(staffId: string) {
    return this.database.one<AccountRow>(`${SELECT_ACCOUNT} WHERE a.staff_id = $1`, [staffId]);
  }

  findByUsername(username: string) {
    return this.database.one<AccountRow>(`${SELECT_ACCOUNT} WHERE lower(a.username) = lower($1)`, [username.trim()]);
  }

  // Returns the new count. Locking happens in the same statement, so two
  // wrong guesses at the same moment can't both slip under the limit.
  async recordFailure(id: string, lockAt: number) {
    const row = await this.database.one<{ failed_attempts: number; locked_at: Date | null }>(
      `UPDATE accounts
          SET failed_attempts = failed_attempts + 1,
              locked_at = CASE WHEN failed_attempts + 1 >= $2 AND locked_at IS NULL THEN now() ELSE locked_at END
        WHERE id = $1
        RETURNING failed_attempts, locked_at`,
      [id, lockAt],
    );
    return row!;
  }

  async recordSuccess(id: string) {
    await this.database.query(
      "UPDATE accounts SET failed_attempts = 0, last_login_at = now() WHERE id = $1",
      [id],
    );
  }

  async createChallenge(challenge: { id: string; accountId: string; role: StaffRole; codeHash: string; expiresAt: Date }) {
    await this.database.query(
      `INSERT INTO login_challenges (id, account_id, role, code_hash, expires_at) VALUES ($1, $2, $3, $4, $5)`,
      [challenge.id, challenge.accountId, challenge.role, challenge.codeHash, challenge.expiresAt],
    );
  }

  findChallenge(id: string) {
    return this.database.one<ChallengeRow>("SELECT * FROM login_challenges WHERE id = $1", [id]);
  }

  async countChallengeAttempt(id: string) {
    await this.database.query("UPDATE login_challenges SET attempts = attempts + 1 WHERE id = $1", [id]);
  }

  // null if someone already used it, so one key can't open two sessions
  consumeChallenge(id: string) {
    return this.database.one<{ id: string }>(
      "UPDATE login_challenges SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL RETURNING id",
      [id],
    );
  }

  async create(
    client: PoolClient,
    account: {
      name: string;
      role: StaffRole;
      department: string;
      license: string | null;
      username: string;
      email: string;
      passwordHash: string;
      createdById: string;
    },
  ) {
    const staff = await client.query<{ id: string }>(
      `INSERT INTO staff (id, name, role, department, license)
       VALUES ('EMP-' || lpad(nextval('staff_number')::text, 4, '0'), $1, $2, $3, $4)
       RETURNING id`,
      [account.name, account.role, account.department, account.license],
    );
    const created = await client.query<{ id: string }>(
      `INSERT INTO accounts (id, staff_id, username, email, password_hash, created_by_id)
       VALUES ('ACC-' || lpad(nextval('account_number')::text, 4, '0'), $1, $2, $3, $4, $5)
       RETURNING id`,
      [staff.rows[0].id, account.username, account.email, account.passwordHash, account.createdById],
    );
    return created.rows[0].id;
  }

  async updateDetails(id: string, details: { name?: string; department?: string; license?: string | null; email?: string }) {
    await this.database.transaction(async (client) => {
      if (details.email !== undefined) {
        await client.query("UPDATE accounts SET email = $2 WHERE id = $1", [id, details.email]);
      }
      await client.query(
        `UPDATE staff
            SET name = coalesce($2, name),
                department = coalesce($3, department),
                license = CASE WHEN $5 THEN $4 ELSE license END
          WHERE id = (SELECT staff_id FROM accounts WHERE id = $1)`,
        [id, details.name ?? null, details.department ?? null, details.license ?? null, details.license !== undefined],
      );
    });
  }

  async setStatus(client: PoolClient, id: string, status: "Active" | "Disabled") {
    await client.query("UPDATE accounts SET status = $2 WHERE id = $1", [id, status]);
  }

  async setRole(client: PoolClient, id: string, role: StaffRole) {
    await client.query("UPDATE staff SET role = $2 WHERE id = (SELECT staff_id FROM accounts WHERE id = $1)", [
      id,
      role,
    ]);
  }

  async unlock(id: string) {
    return this.database.one<{ id: string }>(
      "UPDATE accounts SET locked_at = NULL, failed_attempts = 0 WHERE id = $1 AND locked_at IS NOT NULL RETURNING id",
      [id],
    );
  }

  async restore(id: string) {
    return this.database.one<{ id: string }>(
      "UPDATE accounts SET status = 'Active' WHERE id = $1 AND status = 'Disabled' RETURNING id",
      [id],
    );
  }

  // every non-demo account's role and status, for the last-admin check,
  // read inside the caller's transaction with the rows locked
  async snapshotForUpdate(client: PoolClient) {
    const { rows } = await client.query<{ id: string; role: StaffRole; status: "Active" | "Disabled" }>(
      `SELECT a.id, s.role, a.status
         FROM accounts a JOIN staff s ON s.id = a.staff_id
        WHERE NOT a.is_demo
        FOR UPDATE OF a`,
    );
    return rows;
  }
}
