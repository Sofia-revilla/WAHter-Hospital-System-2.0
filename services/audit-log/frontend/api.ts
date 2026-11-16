import { apiDownload, apiGet } from "@/lib/api";
import type { AuditAction, AuditEntry } from "@/types";

// Calls to the Audit Log service (services/audit-log/backend). Both of these
// leave a trail themselves: a search is logged as AUDIT_QUERY and an export
// as EXPORT (UC-08 meta-audit).

export interface AuditFilter {
  actor?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function query(filter: AuditFilter, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filter, ...extra })) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const searchAuditLog = (filter: AuditFilter, page: number, pageSize: number) =>
  apiGet<AuditPage>("audit-log", `/entries${query(filter, { page: String(page), pageSize: String(pageSize) })}`);

// US-43: the server builds the CSV from everything that matches
export const exportAuditLog = (filter: AuditFilter) => apiDownload("audit-log", `/entries/export${query(filter)}`);
