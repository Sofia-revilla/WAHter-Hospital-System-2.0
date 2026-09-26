import { apiGet, apiPost } from "@/lib/api";
import type { AuditEntry } from "@/types";

// Calls to the Audit Log service (services/audit-log/backend). Both of these
// leave a trail themselves: a search is logged as AUDIT_QUERY and an export
// as EXPORT (UC-16 meta-audit).

export function searchAuditLog(search: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<AuditEntry[]>("audit-log", `/entries${query}`);
}

export const logAuditExport = (rowCount: number) =>
  apiPost<void>("audit-log", "/entries/exports", { rowCount });
