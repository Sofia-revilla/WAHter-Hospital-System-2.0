"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, FileText, Receipt, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import { ApiError, timeAgo } from "@/lib/api";
import { useData } from "@/context/DataContext";
import type { Charge, StaffRole } from "@/types";
import { StatCard } from "@/components/StatCard";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

// where a charge came from, in the words the billing office uses
const SOURCE_LABELS: Record<string, string> = {
  "patient.admitted": "Room",
  "diagnostic.ordered": "Diagnostics",
  "medication.dispensed": "Pharmacy",
};

const SOURCE_BADGE: Record<string, string> = {
  Room: "bg-wah-purple/10 text-wah-purple",
  Diagnostics: "bg-blue-500/10 text-blue-500",
  Pharmacy: "bg-emerald-500/10 text-emerald-600",
};

interface Account {
  patientId: string;
  patientName: string;
  total: number;
  items: number;
  unpriced: number;
}

// Per-patient running totals, worked out from the charge lines so the list
// and the table can never disagree
function toAccounts(charges: Charge[]): Account[] {
  const byPatient = new Map<string, Account>();
  for (const charge of charges) {
    const account = byPatient.get(charge.patientId) ?? {
      patientId: charge.patientId,
      patientName: charge.patientName,
      total: 0,
      items: 0,
      unpriced: 0,
    };
    account.total += charge.amount;
    account.items += 1;
    if (charge.isUnpriced) account.unpriced += 1;
    byPatient.set(charge.patientId, account);
  }
  return [...byPatient.values()].sort((a, b) => b.unpriced - a.unpriced || b.total - a.total);
}

interface PriceFormProps {
  charge: Charge;
  onDone: () => void;
}

// UC-12: an unpriced line gets its price here, with a reason that goes into
// the service's adjustment log
function PriceForm({ charge, onDone }: PriceFormProps) {
  const { priceCharge } = useData();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unitAmount = Number.parseFloat(amount);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      setError("Enter the unit price in pesos.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Say where the price came from, e.g. the supplier invoice.");
      return;
    }
    setIsSaving(true);
    try {
      await priceCharge(charge.id, unitAmount, reason.trim());
      onDone();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't save the price. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const fieldClass = cn(
    "rounded-lg border border-glass-border bg-glass-bg px-3 py-2 text-xs",
    "text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-wrap items-start gap-2">
      <input
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        inputMode="decimal"
        placeholder="Unit price (₱)"
        aria-label={`Unit price for ${charge.description}`}
        className={cn(fieldClass, "w-32")}
      />
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason, e.g. supplier invoice #2231"
        aria-label="Reason for the price"
        className={cn(fieldClass, "min-w-0 flex-1")}
      />
      <button
        type="submit"
        disabled={isSaving}
        className="rounded-lg bg-wah-purple px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save price"}
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

interface BillingViewProps {
  role: StaffRole;
}

export function BillingView({ role }: BillingViewProps) {
  const { charges } = useData();
  const canManage = can(role, "manageBilling");
  const [patientFilter, setPatientFilter] = useState("all");
  const [pricingId, setPricingId] = useState<string | null>(null);

  const accounts = toAccounts(charges);
  const visibleCharges =
    patientFilter === "all" ? charges : charges.filter((charge) => charge.patientId === patientFilter);
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const unpricedCount = charges.filter((charge) => charge.isUnpriced).length;

  const statCards = [
    { title: "Charges Captured", value: peso.format(total), sub: `${charges.length} line items`, icon: Wallet },
    { title: "Open Accounts", value: String(accounts.length), sub: "Admitted patients", icon: Users },
    {
      title: "Unpriced Items",
      value: String(unpricedCount).padStart(2, "0"),
      sub: "Need a price before billing",
      icon: AlertTriangle,
      trend: unpricedCount > 0 ? "Action" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Billing Office</p>
        <h2 className="text-2xl font-bold tracking-tight">Patient Accounts</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Receipt size={18} className="text-wah-neon" /> Captured Charges
              </h3>
              <p className="text-xs text-text-muted">
                Posted automatically from admissions, test orders, and dispensing.
              </p>
            </div>
            <select
              value={patientFilter}
              onChange={(event) => setPatientFilter(event.target.value)}
              aria-label="Show patient"
              className={cn(
                "rounded-lg border border-glass-border bg-glass-bg px-3 py-2 text-sm",
                "text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
              )}
            >
              <option value="all">All patients</option>
              {accounts.map((account) => (
                <option key={account.patientId} value={account.patientId}>
                  {account.patientName} ({account.patientId})
                </option>
              ))}
            </select>
          </div>

          {visibleCharges.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">No charges yet.</p>
          ) : (
            <ul className="space-y-3">
              {visibleCharges.map((charge) => {
                const source = SOURCE_LABELS[charge.source] ?? "Other";
                return (
                  <li
                    key={charge.id}
                    className={cn(
                      "rounded-xl border p-4",
                      charge.isUnpriced
                        ? "border-amber-400/40 bg-amber-400/5"
                        : "border-glass-border bg-glass-bg",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {charge.description}
                          {charge.quantity > 1 && <span className="text-text-muted"> × {charge.quantity}</span>}
                        </p>
                        <p className="font-mono text-[10px] text-text-muted">
                          {charge.id} · {charge.patientName} · {timeAgo(charge.postedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                            SOURCE_BADGE[source] ?? "bg-slate-500/10 text-text-muted",
                          )}
                        >
                          {source}
                        </span>
                        {charge.isUnpriced ? (
                          canManage && pricingId !== charge.id ? (
                            <button
                              type="button"
                              onClick={() => setPricingId(charge.id)}
                              className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-black uppercase text-white"
                            >
                              Set price
                            </button>
                          ) : (
                            <span className="text-xs font-bold uppercase text-amber-600">Unpriced</span>
                          )
                        ) : (
                          <span className="font-mono text-sm font-bold">{peso.format(charge.amount)}</span>
                        )}
                      </div>
                    </div>
                    {pricingId === charge.id && (
                      <PriceForm charge={charge} onDone={() => setPricingId(null)} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-4">
          <section className="glass rounded-xl p-5">
            <h3 className="mb-4 text-lg font-bold">Accounts</h3>
            <ul className="space-y-2">
              {accounts.map((account) => (
                <li key={account.patientId}>
                  <button
                    type="button"
                    onClick={() => setPatientFilter(account.patientId)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left",
                      "transition-colors hover:bg-wah-purple/5",
                      patientFilter === account.patientId && "bg-wah-purple/10",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{account.patientName}</span>
                      <span className="font-mono text-[10px] text-text-muted">
                        {account.items} item{account.items === 1 ? "" : "s"}
                        {account.unpriced > 0 && (
                          <span className="text-amber-600"> · {account.unpriced} unpriced</span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold">{peso.format(account.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass rounded-xl p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <FileText size={16} className="text-wah-neon" /> PhilHealth eClaims
            </h3>
            {/* TODO(Phase 7a): statement of account and eClaims 3.0 XML (UC-13) from these charges */}
            <p className="mt-2 text-sm text-text-muted">
              Statements of account and the eClaims 3.0 package are built from these charges in a later
              phase. Prices here are made up for the prototype.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
