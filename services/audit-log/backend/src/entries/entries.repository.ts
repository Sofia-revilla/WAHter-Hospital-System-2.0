import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "ACCESS_DENIED",
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
  "AUDIT_QUERY",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditOutcome = "Success" | "Failure" | "Denied";

export interface EntryRow {
  id: string;
  event_type: string;
  source: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
  outcome: AuditOutcome;
  resource: string;
  occurred_at: Date;
}

export interface NewEntry {
  eventId: string | null;
  eventType: string;
  source: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  outcome: AuditOutcome;
  resource: string;
  occurredAt: string;
}

// US-42: by user (name or staff ID), action type, and date range
export interface EntryFilter {
  actor?: string;
  action?: AuditAction;
  // inclusive dates, YYYY-MM-DD, read as Philippine time
  from?: string;
  to?: string;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Builds the WHERE clause once for both the page query and the count
function where(filter: EntryFilter) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.actor) {
    params.push(`%${escapeLike(filter.actor)}%`);
    clauses.push(`(actor_name ILIKE $${params.length} OR actor_id ILIKE $${params.length})`);
  }
  if (filter.action) {
    params.push(filter.action);
    clauses.push(`action = $${params.length}`);
  }
  if (filter.from) {
    params.push(filter.from);
    clauses.push(`occurred_at >= ($${params.length}::date AT TIME ZONE 'Asia/Manila')`);
  }
  if (filter.to) {
    params.push(filter.to);
    clauses.push(`occurred_at < (($${params.length}::date + 1) AT TIME ZONE 'Asia/Manila')`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

@Injectable()
export class EntriesRepository {
  constructor(private readonly database: Database) {}

  async append(entry: NewEntry) {
    await this.database.query(
      `INSERT INTO entries (event_id, event_type, source, actor_id, actor_name, actor_role, action, outcome,
                            resource, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        entry.eventId,
        entry.eventType,
        entry.source,
        entry.actorId,
        entry.actorName,
        entry.actorRole,
        entry.action,
        entry.outcome,
        entry.resource,
        entry.occurredAt,
      ],
    );
  }

  // US-42 and UC-08 4a: one page at a time, with the total so the screen can
  // page through results bigger than it can show
  async page(filter: EntryFilter, page: number, pageSize: number) {
    const { sql, params } = where(filter);
    const [rows, count] = await Promise.all([
      this.database.query<EntryRow>(
        `SELECT * FROM entries ${sql}
          ORDER BY occurred_at DESC, id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
      this.database.one<{ total: string }>(`SELECT count(*) AS total FROM entries ${sql}`, params),
    ]);
    return { rows, total: Number(count?.total ?? 0) };
  }

  // US-43: everything matching, for the CSV. Capped so one export can't
  // take the service down; the screen says when the cap was hit.
  all(filter: EntryFilter, limit: number) {
    const { sql, params } = where(filter);
    return this.database.query<EntryRow>(
      `SELECT * FROM entries ${sql} ORDER BY occurred_at DESC, id DESC LIMIT $${params.length + 1}`,
      [...params, limit],
    );
  }
}
