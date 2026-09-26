"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import { useData } from "@/context/DataContext";
import type { MedicationOrder, MedicationOrderStatus, StaffRole } from "@/types";
import { StatCard } from "@/components/StatCard";

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

function countByStatus(orders: MedicationOrder[], status: MedicationOrderStatus) {
  return String(orders.filter((order) => order.status === status).length).padStart(2, "0");
}

interface DispenseFormProps {
  order: MedicationOrder;
  staffName: string;
  onDone: () => void;
}

// UC-10: the pharmacist records how much actually went out (a partial fill
// is fine) and the order is released. Billing charges it from the event.
function DispenseForm({ order, staffName, onDone }: DispenseFormProps) {
  const { dispenseMedication } = useData();
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number.parseInt(quantity, 10);
    if (!Number.isInteger(amount) || amount < 1) {
      setError("Enter how many units you're releasing.");
      return;
    }
    setIsSaving(true);
    try {
      await dispenseMedication(order.id, amount, note.trim() || undefined, staffName);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't dispense. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const fieldClass = cn(
    "rounded-lg border border-glass-border bg-glass-bg px-3 py-2 text-xs",
    "text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-wrap items-start gap-2">
      <input
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        inputMode="numeric"
        placeholder="Quantity"
        aria-label={`Quantity of ${order.drug} to dispense`}
        className={cn(fieldClass, "w-28")}
      />
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note (optional), e.g. partial fill"
        aria-label="Dispensing note"
        className={cn(fieldClass, "min-w-0 flex-1")}
      />
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-lg bg-wah-purple px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-60"
      >
        {isSaving ? "Releasing…" : "Confirm dispense"}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-lg px-3 py-2 text-[10px] font-black uppercase text-text-muted"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs font-semibold text-rose-500">{error}</p>}
    </form>
  );
}

interface PharmacyViewProps {
  role: StaffRole;
  staffName: string;
}

export function PharmacyView({ role, staffName }: PharmacyViewProps) {
  const { medicationOrders: worklist } = useData();
  // UC-10: only the pharmacist dispenses; doctors and nurses see the same list read-only
  const canDispense = can(role, "dispenseMedication");
  const [dispensingId, setDispensingId] = useState<string | null>(null);

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
                      <p className="font-bold">
                        {order.drug}
                        {order.isControlled && (
                          <span className="ml-2 rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-500">
                            RA 9165
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-text-muted">
                        {order.patientName} • {order.dose} {order.frequency}
                      </p>
                      {isDispensed && order.dispensedBy && (
                        <p className="text-xs text-text-muted">
                          {order.dispensedQuantity} released by {order.dispensedBy}
                        </p>
                      )}
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
                    {canDispense && order.status === "Pending" && dispensingId !== order.id && (
                      <button
                        type="button"
                        onClick={() => setDispensingId(order.id)}
                        className={cn(
                          "rounded-lg bg-wah-purple px-4 py-2 text-[10px] font-black uppercase text-white",
                          "transition-colors hover:bg-wah-neon",
                        )}
                      >
                        Dispense
                      </button>
                    )}
                  </div>
                  {dispensingId === order.id && (
                    <DispenseForm order={order} staffName={staffName} onDone={() => setDispensingId(null)} />
                  )}
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
