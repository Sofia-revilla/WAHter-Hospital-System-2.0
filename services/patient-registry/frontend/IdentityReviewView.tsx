"use client";

import { useCallback, useEffect, useState } from "react";
import { GitMerge, ShieldAlert, Split } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, timeAgo } from "@/lib/api";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import { formatBirthDate } from "@/components/PatientPicker";
import { fetchProviders } from "@services/access-provider-registry/frontend/api";
import type { Provider } from "@/types";
import { fetchIdentityReviews, keepSeparate, mergeReview, type IdentityReview, type PatientIdentity } from "./api";

// UC-08 extension 4b (and UC-01 6a): two records the desk or the ward
// couldn't tell apart. The System Administrator compares them side by side
// and merges them or keeps them apart; either way the decision and its reason
// go to the audit trail. This is the only place the System Administrator sees
// patient identity, and only the identity fields of these two records.

const STATUS_FILTERS: { value: IdentityReview["status"] | ""; label: string }[] = [
  { value: "Pending", label: "Waiting" },
  { value: "Merged", label: "Merged" },
  { value: "KeptSeparate", label: "Kept separate" },
  { value: "", label: "All" },
];

function compareRows(left: PatientIdentity, right: PatientIdentity) {
  const address = (patient: PatientIdentity) =>
    [patient.address.barangay, patient.address.municipality, patient.address.province].filter(Boolean).join(", ");
  return [
    ["Name", left.name, right.name],
    ["Sex", left.sex, right.sex],
    ["Birth date", formatBirthDate(left.birthDate), formatBirthDate(right.birthDate)],
    ["PhilHealth PIN", left.philhealthPin ?? "—", right.philhealthPin ?? "—"],
    ["Civil status", left.civilStatus ?? "—", right.civilStatus ?? "—"],
    ["Contact", left.contactNumber ?? "—", right.contactNumber ?? "—"],
    ["Address", address(left) || "—", address(right) || "—"],
    ["Registered", timeAgo(left.registeredAt), timeAgo(right.registeredAt)],
  ];
}

type Decision = { review: IdentityReview; kind: "merge" | "separate" } | null;

export function IdentityReviewView() {
  const [status, setStatus] = useState<IdentityReview["status"] | "">("Pending");
  const [reviews, setReviews] = useState<IdentityReview[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [decision, setDecision] = useState<Decision>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setReviews(await fetchIdentityReviews(status || undefined));
    } catch (caught) {
      setNotice({ tone: "error", text: caught instanceof ApiError ? caught.message : "Couldn't reach the Patient Registry." });
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    fetchProviders()
      .then(setProviders)
      .catch(() => undefined);
  }, []);

  const nameOf = (id: string | null) => (id ? (providers.find((provider) => provider.id === id)?.name ?? id) : "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-wah-purple">System Administration</p>
          <h2 className="text-2xl font-bold tracking-tight">Identity Review</h2>
          <p className="text-sm text-text-muted">Possible duplicate patient records sent here by the desk and the wards.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-glass-border p-1" role="tablist">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              role="tab"
              aria-selected={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold",
                status === filter.value ? "bg-wah-purple text-white" : "text-text-muted hover:bg-glass-bg",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            notice.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600",
          )}
        >
          {notice.text}
        </p>
      )}

      {reviews.length === 0 && <p className="glass rounded-xl p-6 text-sm text-text-muted">Nothing here.</p>}

      {reviews.map((review) => (
        <section key={review.id} className="glass rounded-xl p-5" aria-label={`Review ${review.id}`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-bold">
                <ShieldAlert size={16} className="text-amber-500" /> {review.id}
              </h3>
              <p className="text-xs text-text-muted">
                Reported by {nameOf(review.reportedById)} {timeAgo(review.reportedAt)}: “{review.reason}”
              </p>
              {review.status !== "Pending" && (
                <p className="text-xs text-text-muted">
                  {review.status === "Merged" ? `Merged into ${review.survivorId}` : "Kept as two people"} by{" "}
                  {nameOf(review.resolvedById)}: “{review.resolutionNote}”
                </p>
              )}
            </div>
            {review.status === "Pending" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDecision({ review, kind: "merge" })}
                  className="flex items-center gap-1 rounded-lg bg-wah-purple px-3 py-1.5 text-xs font-bold text-white"
                >
                  <GitMerge size={14} /> Merge
                </button>
                <button
                  type="button"
                  onClick={() => setDecision({ review, kind: "separate" })}
                  className="flex items-center gap-1 rounded-lg border border-glass-border px-3 py-1.5 text-xs font-bold hover:bg-glass-bg"
                >
                  <Split size={14} /> Different people
                </button>
              </div>
            )}
          </div>

          {review.patient && review.candidate && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  <th className="py-2 pr-3" />
                  <th className="py-2 pr-3 font-mono">{review.patient.id}</th>
                  <th className="py-2 font-mono">{review.candidate.id}</th>
                </tr>
              </thead>
              <tbody>
                {compareRows(review.patient, review.candidate).map(([label, left, right]) => (
                  <tr key={label} className="border-b border-glass-border/40">
                    <td className={cn(labelClass, "py-2 pr-3")}>{label}</td>
                    <td className={cn("py-2 pr-3", left !== right && "font-semibold text-amber-700")}>{left}</td>
                    <td className={cn("py-2", left !== right && "font-semibold text-amber-700")}>{right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {decision && (
        <DecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onDone={(text) => {
            setDecision(null);
            setNotice({ tone: "ok", text });
            void load();
          }}
        />
      )}
    </div>
  );
}

interface DecisionDialogProps {
  decision: NonNullable<Decision>;
  onClose: () => void;
  onDone: (text: string) => void;
}

function DecisionDialog({ decision, onClose, onDone }: DecisionDialogProps) {
  const { review, kind } = decision;
  const [survivorId, setSurvivorId] = useState(review.candidate?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (note.trim().length < 5) {
      setError("Write down why (at least 5 characters). It goes to the audit trail.");
      return;
    }
    try {
      if (kind === "merge") {
        await mergeReview(review.id, survivorId, note.trim());
        onDone(`Merged. ${survivorId} is the record that stays; the other now points to it.`);
      } else {
        await keepSeparate(review.id, note.trim());
        onDone(`Kept as two different people (${review.id}).`);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That didn't go through. Try again.");
    }
  }

  return (
    <Modal
      isOpen
      title={kind === "merge" ? "Merge these records" : "Keep them as two people"}
      eyebrow={review.id}
      onClose={onClose}
    >
      <div className="space-y-4">
        {kind === "merge" && (
          <fieldset className="space-y-2">
            <legend className={labelClass}>Which record stays</legend>
            {[review.candidate, review.patient].filter((patient): patient is PatientIdentity => Boolean(patient)).map((patient) => (
              <label key={patient.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="survivor"
                  checked={survivorId === patient.id}
                  onChange={() => setSurvivorId(patient.id)}
                  className="accent-wah-purple"
                />
                <span className="font-mono">{patient.id}</span> {patient.name}
              </label>
            ))}
            <p className="text-xs text-text-muted">
              The other record isn&apos;t deleted: it stays readable and points to this one, and every service still finds it.
            </p>
          </fieldset>
        )}
        <label className="block space-y-1">
          <span className={labelClass}>Reason</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className={fieldClass} />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="button" onClick={() => void submit()} className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            {kind === "merge" ? "Merge" : "Keep separate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
