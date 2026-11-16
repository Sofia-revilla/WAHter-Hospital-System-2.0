"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, BedDouble, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { bedLabel, wardLabel } from "@/lib/beds";
import { useData } from "@/context/DataContext";
import { PatientPicker } from "@/components/PatientPicker";
import type { AdmissionType, Patient } from "@/types";

const ADMISSION_TYPES: AdmissionType[] = ["Direct admit", "ER-to-ward transfer"];

// what the dialog is opened with; everything is optional so any button can
// open it (header button = blank, a free bed square = ward + bed filled in)
export interface AdmitPreset {
  wardId?: string;
  bedIndex?: number;
}

const fieldClass = cn(
  "w-full rounded-lg border border-glass-border bg-glass-bg p-3 text-sm text-foreground",
  "outline-none focus:ring-1 focus:ring-wah-purple",
);

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-text-muted";

interface AdmitDialogProps {
  // null = closed
  preset: AdmitPreset | null;
  onClose: () => void;
}

export function AdmitDialog({ preset, onClose }: AdmitDialogProps) {
  const { patients, wards, bedAssignments, occupiedBeds, assignBed, providers } = useData();
  // attending physicians come from the provider registry, by ID
  const physicians = providers.filter((provider) => provider.role === "Physician");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [wardId, setWardId] = useState("");
  const [bedIndex, setBedIndex] = useState<number | "">("");
  const [admissionType, setAdmissionType] = useState<AdmissionType>("Direct admit");
  const [physicianId, setPhysicianId] = useState("");
  const [confirmIcu, setConfirmIcu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedPreset, setAppliedPreset] = useState<AdmitPreset | null>(null);

  // Pick up a new preset when the dialog opens. Done during render (not in an
  // effect) so the first frame already shows the chosen ward and bed.
  if (preset && preset !== appliedPreset) {
    setAppliedPreset(preset);
    setWardId(preset.wardId ?? "");
    setBedIndex(preset.bedIndex ?? "");
    setPatient(null);
    setError(null);
    setConfirmIcu(false);
  }

  const ward = wards.find((candidate) => candidate.id === wardId);
  const taken = ward ? occupiedBeds(ward.id) : [];
  const freeBeds = ward
    ? Array.from({ length: ward.capacity }, (_, index) => index).filter((index) => !taken.includes(index))
    : [];
  const currentAssignment = patient
    ? bedAssignments.find((assignment) => assignment.patientId === patient.id)
    : undefined;
  const currentWard = currentAssignment
    ? wards.find((candidate) => candidate.id === currentAssignment.wardId)
    : undefined;
  // UC-04.3 2a: soft warning when the bed class doesn't fit the patient
  const needsIcuConfirm = ward?.name.includes("ICU") && patient !== null && patient.status !== "Critical";

  function describePatient(candidate: Patient) {
    const assignment = bedAssignments.find((item) => item.patientId === candidate.id);
    if (!assignment) return null;
    const assignedWard = wards.find((item) => item.id === assignment.wardId);
    return assignedWard ? `in ${bedLabel(assignedWard, assignment.bedIndex)}` : null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // UC-04.1: admitting department, admission type, and attending provider are required
    if (!patient || !ward || bedIndex === "" || !physicianId) {
      setError("Choose a patient, ward, bed, and attending physician.");
      return;
    }
    if (needsIcuConfirm && !confirmIcu) {
      setError("This patient isn't marked Critical. Confirm the ICU bed below to continue.");
      return;
    }

    const result = await assignBed({
      patientId: patient.id,
      wardId: ward.id,
      bedIndex,
      admissionType,
      attendingPhysicianId: physicianId,
    });
    if (!result.ok) {
      setError(result.reason);
      setBedIndex("");
      return;
    }
    onClose();
  }

  // Portaled to <body>: the tab content wrapper animates with a transform,
  // and a transformed parent traps position:fixed children inside it (the
  // dialog ended up centered in the main column, under the sidebar).
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {preset && (
        <>
          {/* backdrop: clicking outside closes without saving */}
          <motion.div
            key="admit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="admit-dialog"
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
              onSubmit={handleSubmit}
              noValidate
              role="dialog"
              aria-modal="true"
              aria-labelledby="admit-title"
              className="glass pointer-events-auto w-full max-w-xl rounded-xl bg-card-bg p-5 shadow-2xl"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-wah-purple">Bed Management</p>
                  <h2 id="admit-title" className="flex items-center gap-2 text-2xl font-bold">
                    <BedDouble size={22} className="text-wah-neon" />
                    {currentAssignment ? "Transfer Patient" : "Admit & Assign Bed"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg p-2 text-text-muted hover:bg-glass-bg hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className={labelClass}>Patient</p>
                  <PatientPicker
                    patients={patients}
                    selected={patient}
                    onSelect={(next) => {
                      setPatient(next);
                      setError(null);
                      setConfirmIcu(false);
                    }}
                    describe={describePatient}
                  />
                  {currentAssignment && currentWard && (
                    <p className="text-xs text-amber-600">
                      Already in {bedLabel(currentWard, currentAssignment.bedIndex)}. Saving moves
                      them to the new bed and frees the old one.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className={labelClass}>Ward</span>
                    <select
                      value={wardId}
                      onChange={(event) => {
                        setWardId(event.target.value);
                        setBedIndex("");
                        setConfirmIcu(false);
                      }}
                      className={fieldClass}
                    >
                      <option value="">Select a ward…</option>
                      {wards.map((option) => {
                        const free = option.capacity - occupiedBeds(option.id).length;
                        return (
                          <option key={option.id} value={option.id} disabled={free === 0}>
                            {wardLabel(option)} · {free} free
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className={labelClass}>Bed</span>
                    <select
                      value={bedIndex}
                      onChange={(event) =>
                        setBedIndex(event.target.value === "" ? "" : Number(event.target.value))
                      }
                      disabled={!ward}
                      className={cn(fieldClass, "disabled:opacity-50")}
                    >
                      <option value="">{ward ? "Select a free bed…" : "Pick a ward first"}</option>
                      {ward &&
                        freeBeds.map((index) => (
                          <option key={index} value={index}>
                            {bedLabel(ward, index)}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className={labelClass}>Admission type</span>
                    <select
                      value={admissionType}
                      onChange={(event) => setAdmissionType(event.target.value as AdmissionType)}
                      className={fieldClass}
                    >
                      {ADMISSION_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className={labelClass}>Attending physician</span>
                    <select
                      value={physicianId}
                      onChange={(event) => setPhysicianId(event.target.value)}
                      className={fieldClass}
                    >
                      <option value="">Choose a physician</option>
                      {physicians.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name} · {provider.department}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {needsIcuConfirm && (
                  <label
                    className={cn(
                      "flex items-start gap-2 rounded-lg border border-orange-400/40 bg-orange-400/10 p-3",
                      "text-sm text-orange-600",
                    )}
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1">
                      ICU bed for a patient who isn&apos;t marked Critical. Confirm this is intended.
                    </span>
                    <input
                      type="checkbox"
                      checked={confirmIcu}
                      onChange={(event) => setConfirmIcu(event.target.checked)}
                      aria-label="Confirm ICU bed"
                      className="mt-1"
                    />
                  </label>
                )}

                {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-5 py-3 text-xs font-bold uppercase text-text-muted hover:bg-glass-bg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      "rounded-lg bg-wah-purple px-6 py-3 text-xs font-black uppercase text-white",
                      "shadow-lg shadow-wah-purple/20 transition-colors hover:bg-wah-neon",
                    )}
                  >
                    {currentAssignment ? "Transfer" : "Admit Patient"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
