import type { EntryRow } from "./entries.repository";

// US-43: the audit export. Every field quoted, so a resource with a comma or
// a quote in it can't shift the columns; and a field starting with = + - @
// gets a leading quote mark so a spreadsheet won't run it as a formula
// (CSV injection).
const HEADER = ["id", "time", "actor_id", "actor", "role", "action", "outcome", "resource", "source", "event_type"];

function cell(value: string | null) {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: EntryRow[]) {
  const lines = rows.map((row) =>
    [
      `AU-${row.id}`,
      row.occurred_at.toISOString(),
      row.actor_id,
      row.actor_name,
      row.actor_role,
      row.action,
      row.outcome,
      row.resource,
      row.source,
      row.event_type,
    ]
      .map(cell)
      .join(","),
  );
  return [HEADER.join(","), ...lines].join("\r\n") + "\r\n";
}
