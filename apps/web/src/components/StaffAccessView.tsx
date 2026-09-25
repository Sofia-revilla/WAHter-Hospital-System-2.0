"use client";

import { useState } from "react";
import { Download, KeyRound, Lock, ScrollText, Search, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUDIT_LOG, STAFF_ACCOUNTS } from "@/constants";
import type { AuditAction, AuditEntry } from "@/types";
import { StatCard } from "./StatCard";

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

// Plain CSV, quoted, so resources with commas don't break the columns
function toCsv(rows: AuditEntry[]) {
  const header = ["id", "time", "actor", "role", "action", "resource"];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [row.id, row.time, row.actor, row.role, row.action, row.resource].map(escape).join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

interface StaffAccessViewProps {
  adminName: string;
}

// UC-16: user access and the audit trail. Audit rows are append-only here;
// there's deliberately no edit or delete anywhere on this screen.
export function StaffAccessView({ adminName }: StaffAccessViewProps) {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(AUDIT_LOG);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<(typeof ACTION_FILTERS)[number]>("All");
  const [notice, setNotice] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const visibleAudit = auditLog.filter(
    (entry) =>
      (actionFilter === "All" || entry.action === actionFilter) &&
      (!needle ||
        [entry.actor, entry.role, entry.resource].some((field) =>
          field.toLowerCase().includes(needle),
        )),
  );
  const activeAccounts = STAFF_ACCOUNTS.filter((account) => account.status === "Active").length;

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
    const criteria = [needle && `text "${needle}"`, actionFilter !== "All" && `action ${actionFilter}`]
      .filter(Boolean)
      .join(", ");
    logAdminAction("AUDIT_QUERY", `Audit search (${criteria || "no filters"})`);
  }

  function exportCsv() {
    const blob = new Blob([toCsv(visibleAudit)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wahter-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    logAdminAction("EXPORT", `Audit log CSV (${visibleAudit.length} rows)`);
  }

  function requestSensitiveChange(action: string, staffName: string) {
    // TODO(Phase 1): Identity service + step-up (a second admin enters their own credentials)
    setNotice(`${action} for ${staffName} needs a second administrator's approval (step-up).`);
  }

  const statCards = [
    { title: "Staff Accounts", value: String(STAFF_ACCOUNTS.length), sub: `${activeAccounts} active`, icon: Users },
    { title: "Roles", value: "9", sub: "From the paper's user classes", icon: KeyRound },
    {
      title: "Audit Events",
      value: String(auditLog.length),
      sub: "Append-only",
      icon: ScrollText,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-wah-purple">System Administration</p>
        <h2 className="text-3xl font-bold tracking-tight">Staff &amp; Access</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <section className="glass rounded-[2rem] p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={18} className="text-wah-neon" /> Staff Accounts &amp; Roles
          </h3>
          <span className="text-xs text-text-muted">
            Role changes and deactivation need a second admin to approve.
          </span>
        </div>
        {notice && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-600">
            <Lock size={14} /> {notice}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr
                className={cn(
                  "border-b border-glass-border",
                  "text-[10px] font-bold uppercase tracking-widest text-text-muted",
                )}
              >
                <th className="pb-4">Staff</th>
                <th className="pb-4">Role</th>
                <th className="pb-4">Department</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Last Login</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {STAFF_ACCOUNTS.map((account) => (
                <tr key={account.id} className="group border-b border-glass-border/50 hover:bg-glass-bg">
                  <td className="py-3 pr-4">
                    <p className="font-semibold">{account.name}</p>
                    <p className="font-mono text-xs text-text-muted">{account.id}</p>
                  </td>
                  <td className="py-3 pr-4 text-sm">{account.role}</td>
                  <td className="py-3 pr-4 text-sm text-text-muted">{account.department}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                        account.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-slate-500/10 text-text-muted",
                      )}
                    >
                      {account.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-text-muted">{account.lastLogin}</td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => requestSensitiveChange("Changing the role", account.name)}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-wah-neon hover:bg-wah-purple/10"
                      >
                        Change Role
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestSensitiveChange(
                            account.status === "Active" ? "Deactivating the account" : "Reactivating the account",
                            account.name,
                          )
                        }
                        className="rounded-lg px-2 py-1 text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-500/10"
                      >
                        {account.status === "Active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-[2rem] p-8">
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
              "flex flex-1 items-center gap-3 rounded-xl border border-glass-border bg-glass-bg px-4 py-2",
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
            className="rounded-xl border border-glass-border bg-glass-bg px-3 py-2 text-sm"
          >
            {ACTION_FILTERS.map((option) => (
              <option key={option} value={option}>
                {option === "All" ? "All actions" : option}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visibleAudit.length === 0}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl bg-wah-purple px-4 py-2",
              "text-xs font-bold uppercase text-white disabled:opacity-50",
            )}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

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
                    <td className="py-3 pr-4 font-mono text-xs text-text-muted">{entry.time}</td>
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
    </div>
  );
}
