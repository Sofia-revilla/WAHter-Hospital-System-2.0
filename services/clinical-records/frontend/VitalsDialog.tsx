"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { PLAUSIBLE_RANGES } from "@/lib/mews";
import {
  calculateMews,
  implausibleReadings,
  VITAL_LABELS,
  type Consciousness,
  type VitalSigns,
} from "@/lib/mews";
import type { Patient, VitalsRecord } from "@/types";
import { MewsChip } from "./MewsChip";

type NumericField = keyof typeof PLAUSIBLE_RANGES;

const NUMERIC_FIELDS: { key: NumericField; placeholder: string; step: string }[] = [
  { key: "respiratoryRate", placeholder: "16", step: "1" },
  { key: "oxygenSaturation", placeholder: "98", step: "1" },
  { key: "temperature", placeholder: "36.8", step: "0.1" },
  { key: "systolicBp", placeholder: "120", step: "1" },
  { key: "heartRate", placeholder: "72", step: "1" },
];

const CONSCIOUSNESS_OPTIONS: Consciousness[] = ["Alert", "Voice", "Pain", "Unresponsive"];

type Draft = Record<NumericField, string> & { consciousness: Consciousness };

const EMPTY_DRAFT: Draft = {
  respiratoryRate: "",
  oxygenSaturation: "",
  temperature: "",
  systolicBp: "",
  heartRate: "",
  consciousness: "Alert",
};

// Only returns a full VitalSigns once every number is filled in, since a
// partial set would give a misleadingly low score (UC-05.2 extension 1a).
function toVitals(draft: Draft): VitalSigns | null {
  const numbers = NUMERIC_FIELDS.map(({ key }) => Number.parseFloat(draft[key]));
  if (numbers.some((value) => Number.isNaN(value))) return null;
  const [respiratoryRate, oxygenSaturation, temperature, systolicBp, heartRate] = numbers;
  return {
    respiratoryRate,
    oxygenSaturation,
    temperature,
    systolicBp,
    heartRate,
    consciousness: draft.consciousness,
  };
}

interface VitalsDialogProps {
  patient: Patient | null;
  recordedBy: string;
  onClose: () => void;
}

export function VitalsDialog({ patient, recordedBy, onClose }: VitalsDialogProps) {
  const { recordVitals, vitalsRecords } = useData();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [hasVerifiedReadings, setHasVerifiedReadings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<VitalsRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const vitals = toVitals(draft);
  const preview = vitals ? calculateMews(vitals) : null;
  const flagged = implausibleReadings(
    Object.fromEntries(
      NUMERIC_FIELDS.map(({ key }) => [key, Number.parseFloat(draft[key])]),
    ) as Partial<VitalSigns>,
  );
  const history = patient
    ? vitalsRecords.filter((record) => record.patientId === patient.id).slice(0, 3)
    : [];

  function close() {
    setDraft(EMPTY_DRAFT);
    setHasVerifiedReadings(false);
    setError(null);
    setSaved(null);
    onClose();
  }

  function updateField(key: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    // changing a value means any earlier "I checked it" no longer applies
    setHasVerifiedReadings(false);
    setSaved(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient) return;

    if (!vitals) {
      setError("All six vital signs are needed to compute MEWS.");
      return;
    }
    if (flagged.length > 0 && !hasVerifiedReadings) {
      setError("Please re-check the highlighted readings and confirm them before saving.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      setSaved(await recordVitals(patient.id, vitals, recordedBy, hasVerifiedReadings));
      setDraft(EMPTY_DRAFT);
      setHasVerifiedReadings(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach Clinical Records. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass = cn(
    "w-full rounded-lg border bg-glass-bg p-3 text-sm text-foreground outline-none",
    "focus:ring-1 focus:ring-wah-purple",
  );

  // Portaled to <body>: the tab content wrapper animates with a transform,
  // and a transformed parent traps position:fixed children inside it (the
  // dialog ended up centered in the main column, under the sidebar).
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {patient && (
        <>
          {/* backdrop: clicking outside closes the dialog without saving */}
          <motion.div
            key="vitals-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="vitals-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "pointer-events-none fixed inset-0 z-[260]",
              "flex items-center justify-center overflow-y-auto p-4",
            )}
          >
            <form
              onSubmit={handleSave}
              noValidate
              role="dialog"
              aria-modal="true"
              aria-labelledby="vitals-title"
              className="glass pointer-events-auto w-full max-w-2xl rounded-xl bg-card-bg p-5 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-wah-purple">Chart Vital Signs</p>
                  <h2 id="vitals-title" className="text-2xl font-bold">
                    {patient.name}
                  </h2>
                  <p className="font-mono text-xs text-text-muted">
                    {patient.id} · {patient.department}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close vitals entry"
                  className="rounded-lg p-2 text-text-muted hover:bg-glass-bg hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {NUMERIC_FIELDS.map((field) => {
                  const range = PLAUSIBLE_RANGES[field.key];
                  const isFlagged = flagged.includes(field.key);
                  return (
                    <label key={field.key} className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        {VITAL_LABELS[field.key]} ({range.unit})
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={field.step}
                        value={draft[field.key]}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        aria-invalid={isFlagged}
                        className={cn(
                          inputClass,
                          isFlagged ? "border-orange-400" : "border-glass-border",
                        )}
                      />
                    </label>
                  );
                })}

                <label className="block space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Consciousness (AVPU)
                  </span>
                  <select
                    value={draft.consciousness}
                    onChange={(event) => updateField("consciousness", event.target.value)}
                    className={cn(inputClass, "border-glass-border")}
                  >
                    {CONSCIOUSNESS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {flagged.length > 0 && (
                <div className="mt-5 rounded-xl border border-orange-400/40 bg-orange-400/10 p-4 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-orange-500">
                    <AlertTriangle size={16} /> Please verify:{" "}
                    {flagged.map((key) => VITAL_LABELS[key]).join(", ")}{" "}
                    {flagged.length > 1 ? "look" : "looks"} outside the normal range.
                  </p>
                  <label className="mt-2 flex items-center gap-2 text-text-muted">
                    <input
                      type="checkbox"
                      checked={hasVerifiedReadings}
                      onChange={(event) => setHasVerifiedReadings(event.target.checked)}
                    />
                    I re-checked this reading at the bedside and it is correct
                  </label>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <Activity size={18} className="text-wah-neon" />
                  <span className="font-semibold">MEWS</span>
                  {preview ? (
                    <MewsChip risk={preview.risk} score={preview.score} />
                  ) : (
                    <span className="text-text-muted">fill in all six to calculate</span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "rounded-lg bg-wah-purple px-6 py-3 text-xs font-black uppercase text-white",
                    "shadow-lg shadow-wah-purple/20 transition-colors hover:bg-wah-neon disabled:opacity-60",
                  )}
                >
                  {isSaving ? "Saving…" : "Save Vitals"}
                </button>
              </div>

              {error && <p className="mt-4 text-sm font-semibold text-rose-500">{error}</p>}
              {saved && (
                <p className="mt-4 text-sm font-semibold text-emerald-600">
                  Saved. MEWS {saved.mewsScore} ({saved.risk})
                  {saved.risk !== "Low" && ", alert sent to the MEWS alerts list"}.
                </p>
              )}

              {history.length > 0 && (
                <div className="mt-6 border-t border-glass-border pt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Recent vitals
                  </p>
                  <ul className="space-y-1.5 font-mono text-xs text-text-muted">
                    {history.map((record) => (
                      <li key={record.id} className="flex flex-wrap items-center gap-2">
                        <span>{new Date(record.recordedAt).toLocaleTimeString()}</span>
                        <span>
                          {[
                            `RR ${record.vitals.respiratoryRate}`,
                            `SpO2 ${record.vitals.oxygenSaturation}`,
                            `T ${record.vitals.temperature}`,
                            `SBP ${record.vitals.systolicBp}`,
                            `HR ${record.vitals.heartRate}`,
                            record.vitals.consciousness,
                          ].join(" · ")}
                        </span>
                        <MewsChip risk={record.risk} score={record.mewsScore} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
