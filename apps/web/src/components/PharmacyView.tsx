"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import type { StaffRole } from "@/types";
import { StatCard } from "./StatCard";

type WorklistStatus = "Pending" | "Dispensed" | "Review";

interface WorklistOrder {
  id: string;
  patient: string;
  med: string;
  dose: string;
  status: WorklistStatus;
}

// TODO(Phase 5): pull the dispensing queue from Orders & Diagnostics
const INITIAL_WORKLIST: WorklistOrder[] = [
  {
    id: "RX-7721",
    patient: "James Smith",
    med: "Amoxicillin 500mg",
    dose: "1 tab TID",
    status: "Pending",
  },
  {
    id: "RX-7722",
    patient: "Mary Johnson",
    med: "Paracetamol 500mg",
    dose: "1 tab PRN",
    status: "Dispensed",
  },
  {
    id: "RX-7723",
    patient: "Robert Williams",
    med: "Metformin 500mg",
    dose: "1 tab OD",
    status: "Review",
  },
];

// Pharmacy is dispensing-only in WAH2.0 (paper limitation d, master prompt §1),
// so there's no stock or expiry here on purpose. These are the checks the
// pharmacist runs before releasing a drug, taken from UC-10 and its rules.
const DISPENSING_CHECKS = [
  "A valid physician order exists for this patient (no order, no dispensing)",
  "Patient identity matches the order",
  "Drug, dose, route, frequency, and prescriber match the order",
  "Controlled or dangerous drugs (RA 9165) need a second staff approval",
  "Partial fills are recorded separately from full dispensing",
  "Any mismatch goes back to the prescribing doctor for clarification",
];

function countByStatus(orders: WorklistOrder[], status: WorklistStatus) {
  return String(orders.filter((order) => order.status === status).length).padStart(2, "0");
}

interface PharmacyViewProps {
  role: StaffRole;
}

export function PharmacyView({ role }: PharmacyViewProps) {
  const [worklist, setWorklist] = useState<WorklistOrder[]>(INITIAL_WORKLIST);
  const canDispense = can(role, "dispenseMedication");

  // counted from the worklist so the cards always agree with the list below
  const statCards = [
    {
      title: "Pending Dispensing",
      value: countByStatus(worklist, "Pending"),
      sub: "Awaiting pharmacist",
      icon: Clock,
    },
    {
      title: "Dispensed",
      value: countByStatus(worklist, "Dispensed"),
      sub: "Released to the ward",
      icon: CheckCircle2,
    },
    {
      title: "For Review",
      value: countByStatus(worklist, "Review"),
      sub: "Needs prescriber check",
      icon: AlertTriangle,
      trend: "Review",
    },
  ];

  function dispense(orderId: string) {
    // TODO(Phase 5): POST the dispense to Orders & Diagnostics (controlled drugs need step-up, §13)
    setWorklist((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: "Dispensed" } : order)),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Pharmacy Module</p>
        <h2 className="text-2xl font-bold tracking-tight">Medication Dispensing</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Prescription Worklist</h3>
            {!canDispense && (
              <span className="text-xs text-text-muted">
                View only. Dispensing is done by the pharmacist.
              </span>
            )}
          </div>

          <ul className="space-y-4">
            {worklist.map((order) => {
              const isDispensed = order.status === "Dispensed";
              return (
                <li
                  key={order.id}
                  className={cn(
                    "group flex flex-wrap items-center justify-between gap-4 rounded-xl p-5",
                    "border border-glass-border bg-glass-bg transition-colors hover:border-wah-purple/50",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="rounded-lg bg-wah-lavender/5 p-3 text-wah-neon">
                      <Pill size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold">{order.med}</p>
                      <p className="text-sm text-text-muted">
                        {order.patient} • {order.dose}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                        isDispensed
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-wah-purple/15 text-wah-neon",
                      )}
                    >
                      {order.status}
                    </span>
                    {canDispense && (
                      <button
                        type="button"
                        onClick={isDispensed ? undefined : () => dispense(order.id)}
                        className={cn(
                          "rounded-lg bg-wah-purple px-4 py-2 text-[10px] font-black uppercase text-white",
                          "transition-colors hover:bg-wah-neon",
                        )}
                      >
                        {/* TODO(Phase 9b): VIEW opens the dispensing record */}
                        {isDispensed ? "View" : "Dispense"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="glass min-w-0 rounded-xl p-5 xl:col-span-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-wah-purple/15 p-2.5 text-wah-neon">
              <ClipboardCheck size={20} />
            </div>
            <h3 className="text-lg font-bold">Dispensing Checks</h3>
          </div>

          <ol className="space-y-3">
            {DISPENSING_CHECKS.map((check, index) => (
              <li key={check} className="flex gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    "bg-wah-purple/10 text-[10px] font-black text-wah-neon",
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-text-muted">{check}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
