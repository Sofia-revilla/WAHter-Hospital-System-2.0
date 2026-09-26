"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, timeAgo } from "@/lib/api";
import { useData } from "@/context/DataContext";

interface PrescriptionDraft {
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

const EMPTY_DRAFT: PrescriptionDraft = {
  patientId: "",
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  route: "",
  instructions: "",
};

// the four short fields share one layout, so they're driven from a list
const DOSING_FIELDS: { key: keyof PrescriptionDraft; label: string; placeholder: string }[] = [
  { key: "dosage", label: "Dosage", placeholder: "e.g. 500mg" },
  { key: "frequency", label: "Frequency", placeholder: "e.g. TID" },
  { key: "duration", label: "Duration", placeholder: "e.g. 7 days" },
  { key: "route", label: "Route", placeholder: "e.g. PO" },
];

const inputClass = cn(
  "w-full rounded-lg border border-glass-border bg-glass-bg p-3",
  "text-sm text-foreground outline-none transition-colors",
  "placeholder:text-text-secondary focus:border-wah-purple",
);

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-text-muted";

interface PrescriptionViewProps {
  staffName: string;
}

export function PrescriptionView({ staffName }: PrescriptionViewProps) {
  const { patients, formulary, medicationOrders, prescribe } = useData();
  const [draft, setDraft] = useState<PrescriptionDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);


  function updateField(key: keyof PrescriptionDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSentMessage(null);

    // route and duration can be left to pharmacy defaults; these four can't
    const isMissingRequired =
      !draft.patientId || !draft.medication.trim() || !draft.dosage.trim() || !draft.frequency.trim();
    if (isMissingRequired) {
      setError("Patient, medication, dosage, and frequency are required before signing.");
      return;
    }

    setIsSending(true);
    try {
      // UC-09: goes to Orders & Diagnostics, which tells the pharmacy over the bus
      const order = await prescribe({
        patientId: draft.patientId,
        drug: draft.medication.trim(),
        dose: draft.dosage.trim(),
        frequency: draft.frequency.trim(),
        route: draft.route.trim() || undefined,
        duration: draft.duration.trim() || undefined,
        instructions: draft.instructions.trim() || undefined,
        prescribedBy: staffName,
      });
      setSentMessage(`Signed and sent ${order.id}: ${order.drug} ${order.dose} for ${order.patientName}.`);
      setError(null);
      setDraft(EMPTY_DRAFT);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach Orders & Diagnostics. Try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Electronic Prescription Pad</p>
        <h2 className="text-2xl font-bold tracking-tight">E-Prescribing</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <form
          onSubmit={handleSend}
          noValidate
          className="glass min-w-0 rounded-xl p-5 xl:col-span-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold">Compose New Prescription</h3>
            {/* TODO(Phase 9a): open the patient's prescription history */}
            <button
              type="button"
              aria-label="Prescription history"
              className="glass rounded-lg p-2 text-text-muted hover:text-wah-neon"
            >
              <History size={18} />
            </button>
          </div>

          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Patient Selection</span>
                <select
                  value={draft.patientId}
                  onChange={(event) => updateField("patientId", event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a patient…</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} ({patient.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className={labelClass}>Medication</span>
                <input
                  value={draft.medication}
                  onChange={(event) => updateField("medication", event.target.value)}
                  placeholder="Search the formulary…"
                  list="medication-suggestions"
                  className={inputClass}
                />
                {/* native datalist gives us type-ahead from the drug list without a combobox library */}
                <datalist id="medication-suggestions">
                  {formulary.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {DOSING_FIELDS.map((field) => (
                <label key={field.key} className="block space-y-2">
                  <span className={labelClass}>{field.label}</span>
                  <input
                    value={draft[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-2">
              <span className={labelClass}>Instructions / Sig.</span>
              <textarea
                value={draft.instructions}
                onChange={(event) => updateField("instructions", event.target.value)}
                placeholder="Enter special instructions…"
                className={cn(inputClass, "h-32 resize-none rounded-xl")}
              />
            </label>

            {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
            {sentMessage && (
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                <CheckCircle2 size={16} /> {sentMessage}
              </p>
            )}

            <div className="flex justify-end gap-4">
              {/* TODO(Phase 5): prescription templates live with the drug catalog */}
              <button
                type="button"
                className={cn(
                  "rounded-lg px-5 py-3 text-xs font-bold uppercase tracking-widest",
                  "text-text-secondary transition-colors hover:bg-glass-bg hover:text-foreground",
                )}
              >
                Save as Template
              </button>
              <button
                type="submit"
                disabled={isSending}
                className={cn(
                  "rounded-lg bg-wah-purple px-5 py-3 text-xs font-bold uppercase tracking-widest text-white",
                  "shadow-lg shadow-wah-purple/20 transition-transform hover:scale-105 disabled:opacity-60",
                )}
              >
                {isSending ? "Sending…" : <>E-Sign &amp; Send</>}
              </button>
            </div>
          </div>
        </form>

        <aside className="glass min-w-0 rounded-xl p-5 xl:col-span-4">
          <h3 className="mb-6 text-lg font-bold">Recent Prescriptions</h3>
          <ul className="space-y-3">
            {medicationOrders.slice(0, 6).map((order) => (
              <li key={order.id} className="rounded-xl border border-glass-border bg-glass-bg p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{order.drug}</p>
                  <span className="shrink-0 font-mono text-[10px] uppercase text-text-muted">
                    {timeAgo(order.orderedAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  {order.patientName} · {order.dose} {order.frequency}
                </p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
