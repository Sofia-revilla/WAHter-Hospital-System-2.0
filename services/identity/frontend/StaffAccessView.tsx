"use client";

import { useEffect, useState } from "react";
import { KeyRound, Lock, ScrollText, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentSession, isApiMode } from "@/lib/api";
import { STAFF_ACCOUNTS } from "@/constants";
import type { StaffAccount } from "@/types";
import { StatCard } from "@/components/StatCard";
import { AuditLogPanel } from "@services/audit-log/frontend/AuditLogPanel";
import { fetchStaffAccounts, type StaffAccountResponse } from "./api";

// Identity sends an ISO timestamp; the table shows it the way the ward talks
function lastLoginLabel(iso: string | null) {
  if (!iso) return "Never";
  const when = new Date(iso);
  const time = when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor((Date.now() - when.getTime()) / 86_400_000);
  const isToday = when.toDateString() === new Date().toDateString();
  if (isToday) return `Today ${time}`;
  if (days <= 1) return `Yesterday ${time}`;
  return `${days} days ago`;
}

function toStaffAccount(account: StaffAccountResponse): StaffAccount {
  return {
    id: account.id,
    name: account.name,
    role: account.role as StaffAccount["role"],
    department: account.department,
    status: account.status,
    lastLogin: lastLoginLabel(account.lastLoginAt),
  };
}

interface StaffAccessViewProps {
  adminName: string;
}

// UC-16: user access (Identity) with the audit trail from the Audit Log
// service underneath. Two services, one IT screen.
export function StaffAccessView({ adminName }: StaffAccessViewProps) {
  const isLive = isApiMode && currentSession() !== null;
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(isLive ? [] : STAFF_ACCOUNTS);
  const [auditCount, setAuditCount] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLive) return;
    fetchStaffAccounts()
      .then((accounts) => setStaffAccounts(accounts.map(toStaffAccount)))
      .catch(() => setNotice("Couldn't reach the Identity service."));
  }, [isLive]);

  const activeAccounts = staffAccounts.filter((account) => account.status === "Active").length;

  function requestSensitiveChange(action: string, staffName: string) {
    // TODO(Phase 1): Identity service + step-up (a second admin enters their own credentials)
    setNotice(`${action} for ${staffName} needs a second administrator's approval (step-up).`);
  }

  const statCards = [
    { title: "Staff Accounts", value: String(staffAccounts.length), sub: `${activeAccounts} active`, icon: Users },
    { title: "Roles", value: "9", sub: "From the paper's user classes", icon: KeyRound },
    {
      title: "Audit Events",
      value: String(auditCount),
      sub: "Append-only",
      icon: ScrollText,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">System Administration</p>
        <h2 className="text-2xl font-bold tracking-tight">Staff &amp; Access</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <section className="glass rounded-xl p-5">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={18} className="text-wah-neon" /> Staff Accounts &amp; Roles
          </h3>
          <span className="text-xs text-text-muted">
            Role changes and deactivation need a second admin to approve.
          </span>
        </div>
        {notice && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-amber-400/10 px-4 py-3 text-sm text-amber-600">
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
              {staffAccounts.map((account) => (
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

      <AuditLogPanel adminName={adminName} onCountChange={setAuditCount} />
    </div>
  );
}
