import { BadRequestException, Controller, Get, Header, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { toCsv } from "./csv";
import { AUDIT_ACTIONS, EntriesRepository, type AuditAction, type EntryFilter, type EntryRow } from "./entries.repository";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
// US-43: big enough for a month of a Level 2 hospital's activity
const MAX_EXPORT_ROWS = 50_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Same shape as the web app's AuditEntry
function toAuditEntry(row: EntryRow) {
  return {
    id: `AU-${row.id}`,
    time: row.occurred_at.toISOString(),
    actorId: row.actor_id,
    actor: row.actor_name,
    role: row.actor_role,
    action: row.action,
    outcome: row.outcome,
    resource: row.resource,
  };
}

function parseFilter(actor?: string, action?: string, from?: string, to?: string): EntryFilter {
  if (action && !AUDIT_ACTIONS.includes(action as AuditAction)) throw new BadRequestException(`Unknown action ${action}`);
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) throw new BadRequestException("Dates are YYYY-MM-DD");
  if (from && to && from > to) throw new BadRequestException("The start date is after the end date");
  return {
    actor: actor?.trim().slice(0, 60) || undefined,
    action: (action as AuditAction) || undefined,
    from: from || undefined,
    to: to || undefined,
  };
}

function describe(filter: EntryFilter) {
  const parts = [
    filter.actor && `user "${filter.actor}"`,
    filter.action && `action ${filter.action}`,
    (filter.from || filter.to) && `${filter.from ?? "start"} to ${filter.to ?? "today"}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "everything";
}

@ApiTags("audit trail")
@ApiBearerAuth()
@Roles("SystemAdministrator")
@Controller("entries")
export class EntriesController {
  constructor(private readonly entries: EntriesRepository) {}

  // US-42. Every search is itself written to the trail before the results
  // come back, so nobody can browse the log without leaving a mark.
  @ApiQuery({ name: "actor", required: false, description: "Name or staff ID, partial match" })
  @ApiQuery({ name: "action", required: false, enum: AUDIT_ACTIONS })
  @ApiQuery({ name: "from", required: false, example: "2026-11-01" })
  @ApiQuery({ name: "to", required: false, example: "2026-11-30" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  @Get()
  async search(
    @CurrentUser() user: AuthUser,
    @Query("actor") actor?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = String(DEFAULT_PAGE_SIZE),
  ) {
    const filter = parseFilter(actor, action, from, to);
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE));

    await this.selfLog(user, "AUDIT_QUERY", `Audit search: ${describe(filter)}, page ${pageNumber}`);
    const { rows, total } = await this.entries.page(filter, pageNumber, size);
    return { items: rows.map(toAuditEntry), total, page: pageNumber, pageSize: size };
  }

  // US-43: the CSV is built here, from the database, not from whatever page
  // the screen happened to have, and the export itself is logged
  @ApiQuery({ name: "actor", required: false })
  @ApiQuery({ name: "action", required: false, enum: AUDIT_ACTIONS })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Get("export")
  async export(
    @CurrentUser() user: AuthUser,
    // only setHeader is needed, so no dependency on Express's types
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
    @Query("actor") actor?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const filter = parseFilter(actor, action, from, to);
    const rows = await this.entries.all(filter, MAX_EXPORT_ROWS);
    await this.selfLog(user, "EXPORT", `Audit log CSV: ${describe(filter)} (${rows.length} rows)`);
    const stamp = new Date().toISOString().slice(0, 10);
    response.setHeader("Content-Disposition", `attachment; filename="wahter-audit-${stamp}.csv"`);
    response.setHeader("X-Row-Limit-Hit", rows.length >= MAX_EXPORT_ROWS ? "true" : "false");
    return toCsv(rows);
  }

  private selfLog(user: AuthUser, action: AuditAction, resource: string) {
    return this.entries.append({
      eventId: null,
      eventType: action === "EXPORT" ? "audit.log.exported" : "audit.log.searched",
      source: "audit-log",
      actorId: user.id,
      actorName: user.name,
      actorRole: "System Administrator",
      action,
      outcome: "Success",
      resource,
      occurredAt: new Date().toISOString(),
    });
  }
}
