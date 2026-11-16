"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Download, Lock, ScrollText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, saveFile } from "@/lib/api";
import { AUDIT_ACTIONS, type AuditAction, type AuditEntry } from "@/types";
import { fieldClass, labelClass } from "@/components/Modal";
import { exportAuditLog, searchAuditLog, type AuditFilter } from "./api";

// UC-08 audit management, US-41 to US-43. The System Administrator searches by
// user, date, and action; big results come a page at a time (UC-08 4a); the
// CSV export is built by the service from everything that matches and is
// logged. Nothing here can edit or delete an entry: the table is append-only
// in the database itself.

const PAGE_SIZE = 25;

const ACTION_BADGE: Record<AuditAction, string> = {
  LOGIN: "bg-blue-500/10 text-blue-500",
  LOGIN_FAILED: "bg-rose-500/10 text-rose-600",
  LOGOUT: "bg-slate-500/10 text-text-muted",
  ACCESS_DENIED: "bg-rose-500/15 text-rose-600",
  VIEW: "bg-slate-500/10 text-text-muted",
  CREATE: "bg-emerald-500/10 text-emerald-600",
  UPDATE: "bg-orange-400/15 text-orange-500",
  DELETE: "bg-rose-500/10 text-rose-600",
  EXPORT: "bg-wah-purple/10 text-wah-purple",
  AUDIT_QUERY: "bg-wah-neon/10 text-wah-neon",
};

const OUTCOME_TEXT: Record<AuditEntry["outcome"], string> = {
  Success: "text-emerald-600",
  Failure: "text-rose-600",
  Denied: "text-rose-600",
};

function displayTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AuditLogView() {
  // what's typed in the form vs. what the shown page was searched with
  const [draft, setDraft] = useState<AuditFilter>({});
  const [filter, setFilter] = useState<AuditFilter>({});
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async (nextFilter: AuditFilter, nextPage: number) => {
    setIsLoading(true);
    try {
      const result = await searchAuditLog(nextFilter, nextPage, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
      setFilter(nextFilter);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "Couldn't reach the Audit Log." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({}, 1);
  }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    void load(
      {
        actor: draft.actor?.trim() || undefined,
        action: draft.action || undefined,
        from: draft.from || undefined,
        to: draft.to || undefined,
      },
      1,
    );
  }

  async function exportCsv() {
    setIsExporting(true);
    setNotice(null);
    try {
      const { blob, filename, headers } = await exportAuditLog(filter);
      saveFile(blob, filename);
      setNotice({
        tone: "ok",
        text:
          headers.get("x-row-limit-hit") === "true"
            ? "Exported the first 50,000 matching entries. Narrow the dates to export the rest."
            : "Exported. The export itself is now in the audit log.",
      });
      // the export shows up as its own entry
      await load(filter, 1);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof ApiError ? error.message : "The export didn't go through." });
    } finally {
      setIsExporting(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">System Administration</p>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
      </div>

      <section className="glass rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ScrollText size={18} className="text-wah-neon" /> Search the trail
          </h3>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Lock size={12} /> Read-only. Entries can&apos;t be edited or deleted, and every search is logged.
          </span>
        </div>

        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-end">
          <label className="space-y-1">
            <span className={labelClass}>User</span>
            <input
              value={draft.actor ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, actor: event.target.value }))}
              placeholder="Name or staff ID"
              className={fieldClass}
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Action</span>
            <select
              value={draft.action ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, action: (event.target.value || undefined) as AuditAction | undefined }))
              }
              className={fieldClass}
            >
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelClass}>From</span>
            <input
              type="date"
              value={draft.from ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>To</span>
            <input
              type="date"
              value={draft.to ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            className="flex h-[46px] items-center justify-center gap-2 rounded-lg bg-wah-purple px-4 text-sm font-semibold text-white"
          >
            <Search size={14} /> Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">
            {total.toLocaleString()} matching {total === 1 ? "entry" : "entries"}
          </p>
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={isExporting || total === 0}
            className="flex items-center gap-2 rounded-lg border border-wah-purple/40 px-4 py-2 text-xs font-bold uppercase text-wah-purple hover:bg-wah-purple/10 disabled:opacity-50"
          >
            <Download size={14} /> {isExporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>

        {notice && (
          <p
            className={cn(
              "mt-3 rounded-lg px-4 py-2 text-sm",
              notice.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600",
            )}
          >
            {notice.text}
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className={cn("w-full min-w-[760px] text-left", isLoading && "opacity-60")}>
            <thead>
              <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
                <th className="pb-3">Time</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Outcome</th>
                <th className="pb-3">Record</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-text-muted">
                    No matching entries.
                  </td>
                </tr>
              ) : (
                items.map((entry) => (
                  <tr key={entry.id} className="border-b border-glass-border/50 text-sm">
                    <td className="py-3 pr-4 font-mono text-xs text-text-muted">{displayTime(entry.time)}</td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{entry.actor}</p>
                      <p className="text-xs text-text-muted">
                        {entry.role}
                        {entry.actorId && ` · ${entry.actorId}`}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-md px-2 py-1 text-[10px] font-black uppercase", ACTION_BADGE[entry.action])}>
                        {entry.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className={cn("py-3 pr-4 text-xs font-semibold", OUTCOME_TEXT[entry.outcome])}>{entry.outcome}</td>
                    <td className="py-3 font-mono text-xs">{entry.resource}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <button
            type="button"
            onClick={() => void load(filter, page - 1)}
            disabled={page <= 1 || isLoading}
            aria-label="Previous page"
            className="rounded-lg border border-glass-border p-2 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-text-muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => void load(filter, page + 1)}
            disabled={page >= pageCount || isLoading}
            aria-label="Next page"
            className="rounded-lg border border-glass-border p-2 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
