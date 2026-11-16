"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Flag, GitMerge, Pencil, RefreshCw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, timeAgo } from "@/lib/api";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import { formatBirthDate } from "@/components/PatientPicker";
import { fetchPatient, reportDuplicate, type PatientIdentity, type PatientProfile } from "./api";
import { RegistrationForm } from "./RegistrationForm";

// UC-01 step 10: the patient's identity profile, with where it stands with
// WAH Systems (step 9, extension 9a) and its merge history. Opening it is
// logged as a view (US-41).

const EXCHANGE_LABEL: Record<PatientIdentity["exchangeStatus"], { text: string; tone: string }> = {
  Sent: { text: "Shared with WAH Systems", tone: "bg-emerald-500/10 text-emerald-700" },
  Pending: { text: "Waiting to share with WAH Systems", tone: "bg-amber-500/10 text-amber-700" },
  Rejected: { text: "WAH Systems rejected it", tone: "bg-rose-500/10 text-rose-600" },
};

interface PatientProfileCardProps {
  patientId: string;
  canEdit: boolean;
  canReportDuplicate: boolean;
  onOpen: (patientId: string) => void;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}

export function PatientProfileCard({ patientId, canEdit, canReportDuplicate, onOpen }: PatientProfileCardProps) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPatient(await fetchPatient(patientId));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach the Patient Registry.");
    }
  }, [patientId]);

  useEffect(() => {
    setNotice(null);
    setIsEditing(false);
    void load();
  }, [load]);

  if (error) return <p className="rounded-lg bg-rose-500/10 p-4 text-sm text-rose-600">{error}</p>;
  if (!patient) return <p className="p-4 text-sm text-text-muted">Loading…</p>;

  const exchange = EXCHANGE_LABEL[patient.exchangeStatus];
  const address = [patient.address.street, patient.address.barangay, patient.address.municipality, patient.address.province]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="glass space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-text-muted">MPI {patient.id}</p>
          <h3 className="text-xl font-bold">{patient.name}</h3>
          <p className="text-sm text-text-muted">
            {patient.sex} · born {formatBirthDate(patient.birthDate)} · registered {timeAgo(patient.registeredAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !patient.mergedInto && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 rounded-lg border border-glass-border px-3 py-1.5 text-xs font-bold hover:bg-glass-bg"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {canReportDuplicate && !patient.mergedInto && (
            <button
              type="button"
              onClick={() => setIsReporting(true)}
              className="flex items-center gap-1 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/10"
            >
              <Flag size={14} /> Report a possible duplicate
            </button>
          )}
        </div>
      </div>

      {patient.mergedInto && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-500/10 p-3 text-sm">
          <GitMerge size={16} /> This record was merged into
          <button type="button" onClick={() => onOpen(patient.mergedInto!)} className="font-mono font-semibold text-wah-purple hover:underline">
            {patient.mergedInto}
          </button>
          . Use that one.
        </p>
      )}

      <p className={cn("flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold", exchange.tone)}>
        <Share2 size={14} /> {exchange.text}
        {patient.exchangeStatus !== "Sent" && patient.exchangeError && <span className="font-normal">({patient.exchangeError})</span>}
        <button type="button" onClick={() => void load()} aria-label="Refresh" className="ml-auto rounded p-1 hover:bg-black/5">
          <RefreshCw size={12} />
        </button>
      </p>

      {notice && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      {isEditing ? (
        <RegistrationForm
          existing={patient}
          onCancel={() => setIsEditing(false)}
          onSaved={(_, note) => {
            setIsEditing(false);
            setNotice(note);
            void load();
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Given name" value={patient.givenName} />
          <Detail label="Middle name" value={patient.middleName} />
          <Detail label="Family name" value={patient.familyName} />
          <Detail label="Suffix" value={patient.suffix} />
          <Detail label="Civil status" value={patient.civilStatus} />
          <Detail label="Contact number" value={patient.contactNumber} />
          <Detail label="PhilHealth PIN" value={patient.philhealthPin} />
          <Detail label="Address" value={address} />
        </div>
      )}

      {patient.merges.length > 0 && (
        <div>
          <p className={labelClass}>Merge history</p>
          <ul className="mt-1 space-y-1 text-xs text-text-muted">
            {patient.merges.map((merge) => (
              <li key={`${merge.sourceId}-${merge.mergedAt}`}>
                {merge.sourceId} merged into {merge.targetId} {timeAgo(merge.mergedAt)}: “{merge.reason}”
              </li>
            ))}
          </ul>
        </div>
      )}

      {isReporting && (
        <ReportDuplicateDialog
          patient={patient}
          onClose={() => setIsReporting(false)}
          onReported={(reviewId) => {
            setIsReporting(false);
            setNotice(`Sent to the System Administrator for review (${reviewId}).`);
          }}
        />
      )}
    </section>
  );
}

interface ReportDuplicateDialogProps {
  patient: PatientIdentity;
  onClose: () => void;
  onReported: (reviewId: string) => void;
}

function ReportDuplicateDialog({ patient, onClose, onReported }: ReportDuplicateDialogProps) {
  const [otherId, setOtherId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otherId.trim() || reason.trim().length < 5) {
      setError("Enter the other MPI number and a short reason.");
      return;
    }
    try {
      const { reviewId } = await reportDuplicate(patient.id, otherId.trim().toUpperCase(), reason.trim());
      onReported(reviewId);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't send it. Try again.");
    }
  }

  return (
    <Modal isOpen title="Report a possible duplicate" eyebrow={`${patient.name} · ${patient.id}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-text-muted">
          The System Administrator compares the two records and merges them or keeps them apart. Nothing changes until then.
        </p>
        <label className="block space-y-1">
          <span className={labelClass}>The other record&apos;s MPI number</span>
          <input value={otherId} onChange={(event) => setOtherId(event.target.value)} placeholder="WAH-2026-00000" className={cn(fieldClass, "font-mono")} />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Why they might be the same person</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={fieldClass} />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Send for review
          </button>
        </div>
      </form>
    </Modal>
  );
}
