"use client";

import { useState } from "react";
import { AlertTriangle, DollarSign, History, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import type { StaffRole } from "@/types";
import { useData } from "@/context/DataContext";
import { StatCard } from "./StatCard";

const STAT_CARDS = [
  { title: "Pending Claims", value: "124", sub: "PhilHealth YAKAP", icon: Receipt },
  {
    title: "Daily Collection",
    value: "₱ 84k",
    sub: "Cash & Card",
    icon: DollarSign,
    trend: "+12%",
  },
  { title: "Unbilled", value: "₱ 156k", sub: "Active Encounters", icon: History },
  {
    title: "Audit Alerts",
    value: "03",
    sub: "Data Incomplete",
    icon: AlertTriangle,
    trend: "Urgent",
  },
];

const QUEUE_SIZE = 5;

function randomBalance() {
  return Math.random() * 15000 + 5000;
}

function formatPeso(amount: number) {
  const formatted = amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₱ ${formatted}`;
}

interface BillingViewProps {
  role: StaffRole;
}

// Doctors and nurses get the paper's read-only "Financial Dashboard"; SOA and
// reconciliation are Billing Staff actions (UC-12 / UC-13).
export function BillingView({ role }: BillingViewProps) {
  const { patients } = useData();
  const canManageBilling = can(role, "manageBilling");
  const queue = patients.slice(0, QUEUE_SIZE);

  // TODO(Phase 6): real balances from the Billing service's invoices.
  // Generated once when the tab opens (lazy useState), not on every render.
  // Before this, hovering a row re-rendered and reshuffled all the amounts.
  const [balances] = useState(() => queue.map(() => randomBalance()));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Billing &amp; Claims</p>
        <h2 className="text-2xl font-bold tracking-tight">Financial Dashboard</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-8">
          <h3 className="mb-6 text-lg font-bold">Patient Billing Queue</h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr
                  className={cn(
                    "border-b border-glass-border",
                    "text-[10px] font-bold uppercase tracking-widest text-text-muted",
                  )}
                >
                  <th className="pb-4">Patient</th>
                  <th className="pb-4">Admission</th>
                  <th className="pb-4">Balance</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.map((patient, index) => (
                  <tr
                    key={patient.id}
                    className="group border-b border-glass-border/50 transition-colors hover:bg-glass-bg"
                  >
                    <td className="py-4 pr-4">
                      <p className="font-semibold">{patient.name}</p>
                      <p className="font-mono text-xs text-text-muted">{patient.id}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {new Date(patient.admittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 pr-4 font-mono text-sm">
                      {formatPeso(balances[index] ?? 0)}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          "rounded bg-yellow-500/10 px-2 py-1",
                          "text-[9px] font-bold uppercase text-yellow-600",
                        )}
                      >
                        Pending
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {canManageBilling && (
                        // TODO(Phase 7a): generate the eSOA (XML only, never PDF) via Interoperability
                        <button
                          type="button"
                          className={cn(
                            "text-xs font-bold text-wah-neon hover:underline",
                            "opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100",
                          )}
                        >
                          Generate SOA
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-4">
          <section className="glass rounded-xl border-l-4 border-l-wah-neon p-5">
            <h3 className="font-bold">PhilHealth 3.0 Ready</h3>
            <p className="mt-2 text-sm text-text-muted">
              Automatically mapping attributes for eClaims submission. 80% coverage on active cases.
            </p>
            <div className="mt-6 flex items-center justify-between text-xs">
              <span className="text-text-muted">System Sync</span>
              <span className="font-bold uppercase tracking-widest text-wah-neon">Live</span>
            </div>
          </section>

          <section className="rounded-xl bg-wah-purple/40 p-5 text-center">
            <DollarSign size={40} className="mx-auto mb-4 text-white" />
            <h3 className="font-bold text-white">End-of-Day Report</h3>
            <p className="mt-2 text-sm text-wah-lavender/80">
              Consolidate all departmental charges for financial closing.
            </p>
            {canManageBilling ? (
              // TODO(Phase 6): reconcile the day's charges against payments in Billing
              <button
                type="button"
                className={cn(
                  "mt-6 w-full rounded-lg bg-white py-3",
                  "font-bold uppercase text-wah-deep transition-transform hover:scale-105",
                )}
              >
                Reconcile All
              </button>
            ) : (
              <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-white/70">
                Done by the billing office
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
