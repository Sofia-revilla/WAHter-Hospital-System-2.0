import { Injectable } from "@nestjs/common";
import { Database } from "@wahter/shared";

export type AuditAction = "LOGIN" | "VIEW" | "CREATE" | "UPDATE" | "EXPORT" | "AUDIT_QUERY";

export interface EntryRow {
  id: string;
  event_type: string;
  source: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
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
  resource: string;
  occurredAt: string;
}

@Injectable()
export class EntriesRepository {
  constructor(private readonly database: Database) {}

  async append(entry: NewEntry) {
    await this.database.query(
      `INSERT INTO entries (event_id, event_type, source, actor_id, actor_name, actor_role, action, resource, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (event_id) DO NOTHING`,
      [
        entry.eventId,
        entry.eventType,
        entry.source,
        entry.actorId,
        entry.actorName,
        entry.actorRole,
        entry.action,
        entry.resource,
        entry.occurredAt,
      ],
    );
  }

  // Plain ILIKE over the text columns; fine at prototype volume. A real
  // deployment would want a tsvector index.
  search(term: string | undefined, limit: number) {
    const pattern = term ? `%${term.replace(/[%_]/g, "\\$&")}%` : null;
    return this.database.query<EntryRow>(
      `SELECT * FROM entries
        WHERE $1::text IS NULL
           OR actor_name ILIKE $1 OR actor_role ILIKE $1 OR action ILIKE $1 OR resource ILIKE $1
        ORDER BY occurred_at DESC, id DESC
        LIMIT $2`,
      [pattern, limit],
    );
  }
}
