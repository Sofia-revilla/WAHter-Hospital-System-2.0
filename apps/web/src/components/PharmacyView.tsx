"use client";

import { useState } from "react";
import { AlertTriangle, Package, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import type { InventoryItem } from "@/types";
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

const STAT_CARDS = [
  { title: "Active Orders", value: "18", sub: "Pending Dispensing", icon: Pill, trend: "High" },
  { title: "Low Stock", value: "05", sub: "Resupply Needed", icon: Package, trend: "Alert" },
  { title: "Expired Soon", value: "02", sub: "B-Blockers Batch", icon: AlertTriangle },
];

// Per the design: at minStock the bar sits at 50%, so anything past the
// halfway mark is above the reorder point. Capped so big stocks don't overflow.
function stockBarWidth(item: InventoryItem) {
  return Math.min((item.stock / item.minStock) * 50, 100);
}

export function PharmacyView() {
  const { inventory } = useData();
  const [worklist, setWorklist] = useState<WorklistOrder[]>(INITIAL_WORKLIST);

  const medications = inventory.filter((item) => item.category === "Medication");

  function dispense(orderId: string) {
    // TODO(Phase 5): POST the dispense to Orders & Diagnostics (controlled drugs need step-up, §13)
    setWorklist((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status: "Dispensed" } : order)),
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Pharmacy Module</p>
        <h2 className="text-3xl font-bold tracking-tight">Medication &amp; Inventory</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-[2rem] p-8 xl:col-span-8">
          <h3 className="mb-6 text-lg font-bold">Prescription Worklist</h3>

          <ul className="space-y-4">
            {worklist.map((order) => {
              const isDispensed = order.status === "Dispensed";
              return (
                <li
                  key={order.id}
                  className={cn(
                    "group flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5",
                    "border border-glass-border bg-glass-bg transition-colors hover:border-wah-purple/50",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="rounded-xl bg-wah-lavender/5 p-3 text-wah-neon">
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
                    <button
                      type="button"
                      onClick={isDispensed ? undefined : () => dispense(order.id)}
                      className={cn(
                        "rounded-xl bg-wah-purple px-4 py-2 text-[10px] font-black uppercase text-white",
                        "transition-colors hover:bg-wah-neon",
                      )}
                    >
                      {/* TODO(Phase 9b): VIEW opens the dispensing record */}
                      {isDispensed ? "View" : "Dispense"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="glass min-w-0 rounded-[2rem] p-8 xl:col-span-4">
          <h3 className="mb-6 text-lg font-bold">Drug Inventory</h3>

          {medications.length === 0 ? (
            <p className="text-sm text-text-muted">No medications on file.</p>
          ) : (
            <ul className="space-y-5">
              {medications.map((item) => (
                <li key={item.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span className="shrink-0 font-mono text-xs text-text-muted">
                      {item.stock.toLocaleString()} {item.unit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-bg">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.status === "Critical" ? "bg-rose-500" : "bg-wah-neon",
                      )}
                      style={{ width: `${stockBarWidth(item)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* TODO(Prompt: Inventory tab): link to the full inventory screen */}
          <button
            type="button"
            className={cn(
              "glass mt-8 w-full rounded-xl py-3",
              "text-xs font-black uppercase tracking-widest text-text-muted hover:text-foreground",
            )}
          >
            Stock Management
          </button>
        </aside>
      </div>
    </div>
  );
}
