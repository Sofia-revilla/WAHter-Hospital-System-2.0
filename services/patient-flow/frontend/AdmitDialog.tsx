"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BedDouble } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import { patientIdentifiers } from "@/components/PatientPicker";
import { PatientSearch } from "@services/patient-registry/frontend/PatientSearch";
import type { AdmissionType } from "@/types";
import { postAdmission, type FreeBed } from "./api";

// UC-02 steps 2 to 10: admit a registered patient and assign a bed. The
// patient comes from the Patient Registry (UC-02 includes UC-01), so anyone
// not found there is registered first on the Registration tab.

const ADMISSION_TYPES: AdmissionType[] = ["Direct admit", "ER-to-ward transfer", "Scheduled"];

export interface AdmitPreset {
  bedId?: string;
  patient?: { id: string; name: string; birthDate: string };
  appointmentId?: string;
  physicianId?: string;
}

interface AdmitDialogProps {
  // null = closed
  preset: AdmitPreset | null;
  onClose: () => void;
  onAdmitted: (message: string) => void;
}

type FieldErrors = Partial<Record<string, string>>;

// local time for <input type="datetime-local">, which has no time zone
function localNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function AdmitDialog({ preset, onClose, onAdmitted }: AdmitDialogProps) {
  const { bedBoard, providers, refreshNow } = useData();
  const physicians = providers.filter((provider) => provider.role === "Physician");

  const [patient, setPatient] = useState<{ id: string; name: string; birthDate: string } | null>(null);
  const [bedId, setBedId] = useState("");
  const [physicianId, setPhysicianId] = useState("");
  const [admissionType, setAdmissionType] = useState<AdmissionType>("Direct admit");
  const [diagnosis, setDiagnosis] = useState("");
  const [admittedAt, setAdmittedAt] = useState(localNow());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<FreeBed[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // a new preset (another bed clicked, or an appointment) starts a fresh form
  useEffect(() => {
    if (!preset) return;
    setPatient(preset.patient ?? null);
    setBedId(preset.bedId ?? "");
    setPhysicianId(preset.physicianId ?? "");
    setAdmissionType(preset.appointmentId ? "Scheduled" : "Direct admit");
    setDiagnosis("");
    setAdmittedAt(localNow());
    setErrors({});
    setFormError(null);
    setAlternatives([]);
  }, [preset]);

  const freeBeds = bedBoard.flatMap((ward) =>
    ward.rooms.flatMap((room) =>
      room.beds.filter((bed) => bed.status === "Available" || bed.id === bedId).map((bed) => ({ bed, ward, room })),
    ),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // UC-02 8a: say what's missing before anything is sent
    const missing: FieldErrors = {};
    if (!patient) missing.patientId = "Pick the patient";
    if (!physicianId) missing.attendingPhysicianId = "Pick the attending physician";
    if (!bedId) missing.bedId = "Pick a bed";
    if (diagnosis.trim().length < 3) missing.admittingDiagnosis = "Write the admitting diagnosis";
    setErrors(missing);
    if (Object.keys(missing).length > 0) {
      setFormError("Some admission details are missing. They're marked in red.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const admission = await postAdmission({
        patientId: patient!.id,
        attendingPhysicianId: physicianId,
        bedId,
        admissionType,
        admittingDiagnosis: diagnosis.trim(),
        admittedAt: new Date(admittedAt).toISOString(),
        appointmentId: preset?.appointmentId,
      });
      refreshNow();
      onAdmitted(`Admitted ${patient!.name} to bed ${admission.bedCode} (${admission.admissionId}).`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const body = caught.body as { fields?: FieldErrors; alternatives?: FreeBed[] } | null;
        if (caught.status === 409 && body?.alternatives) {
          // UC-02 6a/6b: someone else took it; show what's still free
          setAlternatives(body.alternatives);
          setBedId("");
          refreshNow();
        }
        if (body?.fields) setErrors(body.fields);
        setFormError(caught.message);
      } else {
        setFormError("Couldn't reach Patient Flow. Try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  const errorClass = (field: string) => errors[field] && "border-rose-500 ring-1 ring-rose-500";
  const errorText = (field: string) =>
    errors[field] && (
      <span role="alert" className="block text-xs font-semibold text-rose-600">
        {errors[field]}
      </span>
    );

  return (
    <Modal isOpen={preset !== null} title="Admit and assign a bed" eyebrow="Admission (UC-02)" onClose={onClose} width="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-2">
          <p className={cn(labelClass, errors.patientId && "text-rose-600")}>Patient</p>
          {patient ? (
            <div className={cn(fieldClass, "flex items-center justify-between gap-3")}>
              <div>
                <p className="font-semibold">{patient.name}</p>
                <p className="font-mono text-[10px] text-text-muted">{patientIdentifiers(patient)}</p>
              </div>
              {!preset?.appointmentId && (
                <button type="button" onClick={() => setPatient(null)} className="text-xs font-semibold text-wah-purple hover:underline">
                  Change
                </button>
              )}
            </div>
          ) : (
            <>
              <PatientSearch onSelect={(found) => setPatient(found)} />
              <p className="text-xs text-text-muted">Not found? Register them on the Registration tab first.</p>
            </>
          )}
          {errorText("patientId")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className={cn(labelClass, errors.bedId && "text-rose-600")}>Bed</span>
            <select value={bedId} onChange={(event) => setBedId(event.target.value)} className={cn(fieldClass, errorClass("bedId"))}>
              <option value="">Choose a free bed</option>
              {freeBeds.map(({ bed, ward, room }) => (
                <option key={bed.id} value={bed.id}>
                  {bed.code} · {ward.name} ({ward.type}) · {room.code}
                </option>
              ))}
            </select>
            {errorText("bedId")}
          </label>
          <label className="block space-y-1">
            <span className={cn(labelClass, errors.attendingPhysicianId && "text-rose-600")}>Attending physician</span>
            <select
              value={physicianId}
              onChange={(event) => setPhysicianId(event.target.value)}
              className={cn(fieldClass, errorClass("attendingPhysicianId"))}
            >
              <option value="">Choose a physician</option>
              {physicians.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} · {provider.department}
                </option>
              ))}
            </select>
            {errorText("attendingPhysicianId")}
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Admission type</span>
            <select value={admissionType} onChange={(event) => setAdmissionType(event.target.value as AdmissionType)} className={fieldClass}>
              {ADMISSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className={cn(labelClass, errors.admittedAt && "text-rose-600")}>Admitted on</span>
            <input
              type="datetime-local"
              value={admittedAt}
              onChange={(event) => setAdmittedAt(event.target.value)}
              className={cn(fieldClass, errorClass("admittedAt"))}
            />
            {errorText("admittedAt")}
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className={cn(labelClass, errors.admittingDiagnosis && "text-rose-600")}>Admitting diagnosis</span>
            <input
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="e.g. Community-acquired pneumonia"
              className={cn(fieldClass, errorClass("admittingDiagnosis"))}
            />
            {errorText("admittingDiagnosis")}
          </label>
        </div>

        {alternatives.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-700">Free beds that fit instead:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {alternatives.map((bed) => (
                <button
                  key={bed.bedId}
                  type="button"
                  onClick={() => {
                    setBedId(bed.bedId);
                    setAlternatives([]);
                    setFormError(null);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-glass-border bg-card-bg px-3 py-1.5 text-xs font-semibold hover:border-wah-purple"
                >
                  <BedDouble size={12} /> {bed.code} · {bed.wardName}
                </button>
              ))}
            </div>
          </div>
        )}

        {formError && (
          <p role="alert" className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-600">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {isSaving ? "Admitting…" : "Admit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
