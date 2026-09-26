"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Lock, ScrollText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { isApiMode, currentSession } from "@/lib/api";
import { AUDIT_LOG } from "@/constants";
import type { AuditAction, AuditEntry } from "@/types";
import { logAuditExport, searchAuditLog } from "./api";

const ACTION_FILTERS: ("All" | AuditAction)[] = [
  "All",
  "LOGIN",
  "VIEW",
  "CREATE",
  "UPDATE",
  "EXPORT",
  "AUDIT_QUERY",
];

const ACTION_BADGE: Record<AuditAction, string> = {
  LOGIN: "bg-blue-500/10 text-blue-500",
  VIEW: "bg-slate-500/10 text-text-muted",
  CREATE: "bg-emerald-500/10 text-emerald-600",
  UPDATE: "bg-orange-400/15 text-orange-500",
  EXPORT: "bg-wah-purple/10 text-wah-purple",
  AUDIT_QUERY: "bg-wah-neon/10 text-wah-neon",
};

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// The service sends ISO timestamps; the offline mock already has "08:14"
function displayTime(time: string) {
  if (!time.includes("T")) return time;
  return new Date(time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Plain CSV, quoted, so resources with commas don't break the columns
function toCsv(rows: AuditEntry[]) {
  const header = ["id", "time", "actor", "role", "action", "resource"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [row.id, row.time, row.actor, row.role, row.action, row.resource].map(escape).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

interface AuditLogPanelProps {
  adminName: string;
  // the Staff & Access page shows the count in its stat cards
  onCountChange: (count: number) => void;
}

// UC-16's audit trail, owned by the Audit Log service. Rows are append-only;
// there's deliberately no edit or delete anywhere on this panel.
export function AuditLogPanel({ adminName, onCountChange }: AuditLogPanelProps) {
  const isLive = isApiMode && currentSession() !== null;
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(isLive ? [] : AUDIT_LOG);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<(typeof ACTION_FILTERS)[number]>("All");
  const [loadError, setLoadError] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const visibleAudit = auditLog.filter(
    (entry) =>
      (actionFilter === "All" || entry.action === actionFilter) &&
      (!needle ||
        [entry.actor, entry.role, entry.resource].some((field) =>
          field.toLowerCase().includes(needle),
        )),
  );

  useEffect(() => {
    onCountChange(auditLog.length);
  }, [auditLog.length, onCountChange]);

  const loadFromService = useCallback(async (search: string) => {
    try {
      // the service writes this search to the trail before answering
      setAuditLog(await searchAuditLog(search));
      setLoadError(null);
    } catch {
      setLoadError("Couldn't reach the Audit Log service.");
    }
  }, []);

  useEffect(() => {
    if (isLive) void loadFromService("");
  }, [isLive, loadFromService]);

  // Looking at the audit log is itself logged (UC-16 BR-02, meta-audit)
  function logAdminAction(action: AuditAction, resource: string) {
    setAuditLog((current) => [
      {
        id: `AU-${1013 + current.length - AUDIT_LOG.length}`,
        time: nowTime(),
        actor: adminName,
        role: "System Administrator",
        action,
        resource,
      },
      ...current,
    ]);
  }

  function runSearch() {
    if (isLive) {
      void loadFromService(needle);
      return;
    }
    const criteria = [needle && `text "${needle}"`, actionFilter !== "All" && `action ${actionFilter}`]
      .filter(Boolean)
      .join(", ");
    logAdminAction("AUDIT_QUERY", `Audit search (${criteria || "no filters"})`);
  }

  async function exportCsv() {
    const blob = new Blob([toCsv(visibleAudit)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wahter-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    if (isLive) {
      await logAuditExport(visibleAudit.length).catch(() => undefined);
      await loadFromService(needle);
    } else {
      logAdminAction("EXPORT", `Audit log CSV (${visibleAudit.length} rows)`);
    }
  }

  return (
    <section className="glass rounded-xl p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <ScrollText size={18} className="text-wah-neon" /> Audit Log
        </h3>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <Lock size={12} /> Read-only. Entries can&apos;t be edited or deleted.
        </span>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row">
        <div
          className={cn(
            "flex flex-1 items-center gap-3 rounded-lg border border-glass-border bg-glass-bg px-4 py-2",
            "focus-within:ring-2 focus-within:ring-wah-purple/40",
          )}
        >
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && runSearch()}
            placeholder="Search by staff, role, or record (Enter to log the search)"
            aria-label="Search audit log"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value as (typeof ACTION_FILTERS)[number])}
          aria-label="Filter by action"
          className="rounded-lg border border-glass-border bg-glass-bg px-3 py-2 text-sm"
        >
          {ACTION_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? "All actions" : option}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={visibleAudit.length === 0}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg bg-wah-purple px-4 py-2",
            "text-xs font-bold uppercase text-white disabled:opacity-50",
          )}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {loadError && <p className="mb-4 text-sm font-semibold text-rose-500">{loadError}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr
              className={cn(
                "border-b border-glass-border",
                "text-[10px] font-bold uppercase tracking-widest text-text-muted",
              )}
            >
              <th className="pb-3">Time</th>
              <th className="pb-3">Staff</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Record</th>
            </tr>
          </thead>
          <tbody>
            {visibleAudit.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-text-muted">
                  No matching records.
                </td>
              </tr>
            ) : (
              visibleAudit.map((entry) => (
                <tr key={entry.id} className="border-b border-glass-border/50 text-sm">
                  <td className="py-3 pr-4 font-mono text-xs text-text-muted">{displayTime(entry.time)}</td>
                  <td className="py-3 pr-4">
                    <p className="font-semibold">{entry.actor}</p>
                    <p className="text-xs text-text-muted">{entry.role}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                        ACTION_BADGE[entry.action],
                      )}
                    >
                      {entry.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-xs">{entry.resource}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
