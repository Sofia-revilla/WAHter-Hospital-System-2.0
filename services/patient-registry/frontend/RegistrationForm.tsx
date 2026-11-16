"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Flag, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { fieldClass, labelClass } from "@/components/Modal";
import { patientIdentifiers } from "@/components/PatientPicker";
import { registerPatient, updatePatient, type Demographics, type PatientIdentity, type PossibleMatch } from "./api";
import { EMPTY_DEMOGRAPHICS, toPayload, validateDemographics, type FieldErrors } from "./validation";

// UC-01 steps 4 to 10: enter the demographics, validate them, check for
// duplicates, and save. In edit mode it's UC-01 extension 3a (update
// permitted demographic information) on an existing record.

const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Annulled"];

interface RegistrationFormProps {
  // an existing record to edit; leave out to register someone new
  existing?: PatientIdentity;
  onSaved: (patient: PatientIdentity, note: string) => void;
  // UC-01 3a / 6a: the clerk picked an existing record instead
  onUseExisting?: (patientId: string) => void;
  onCancel: () => void;
}

function fromExisting(patient: PatientIdentity): Demographics {
  return {
    givenName: patient.givenName,
    middleName: patient.middleName ?? "",
    familyName: patient.familyName,
    suffix: patient.suffix ?? "",
    sex: patient.sex,
    birthDate: patient.birthDate,
    civilStatus: patient.civilStatus ?? "",
    contactNumber: patient.contactNumber ?? "",
    address: {
      street: patient.address.street ?? "",
      barangay: patient.address.barangay ?? "",
      municipality: patient.address.municipality ?? "",
      province: patient.address.province ?? "",
    },
    philhealthPin: patient.philhealthPin ?? "",
  };
}

interface FieldProps {
  name: string;
  label: string;
  errors: FieldErrors;
  className?: string;
  children: ReactNode;
}

function Field({ name, label, errors, className, children }: FieldProps) {
  const error = errors[name];
  return (
    <label className={cn("block space-y-1", className)}>
      <span className={cn(labelClass, error && "text-rose-600")}>{label}</span>
      {children}
      {error && (
        <span role="alert" className="block text-xs font-semibold text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
}

export function RegistrationForm({ existing, onSaved, onUseExisting, onCancel }: RegistrationFormProps) {
  const [form, setForm] = useState<Demographics>(existing ? fromExisting(existing) : EMPTY_DEMOGRAPHICS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [matches, setMatches] = useState<PossibleMatch[] | null>(null);
  const [canOverride, setCanOverride] = useState(true);
  const [reviewCandidateId, setReviewCandidateId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function update<K extends keyof Demographics>(key: K, value: Demographics[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    // a changed identity has to be checked for duplicates again
    setMatches(null);
  }

  function updateAddress(key: keyof Demographics["address"], value: string) {
    setForm((current) => ({ ...current, address: { ...current.address, [key]: value } }));
    setErrors((current) => ({ ...current, [`address.${key}`]: undefined }));
    setMatches(null);
  }

  function input(name: keyof Demographics, props: { placeholder?: string; type?: string; inputMode?: "numeric" | "tel" } = {}) {
    return (
      <input
        value={(form[name] as string | undefined) ?? ""}
        onChange={(event) => update(name, event.target.value as never)}
        aria-invalid={Boolean(errors[name])}
        className={cn(fieldClass, errors[name] && "border-rose-500 ring-1 ring-rose-500")}
        {...props}
      />
    );
  }

  async function save(resolution?: { decision: "ConfirmedNew" | "FlagForReview"; reviewCandidateId?: string }) {
    const problems = validateDemographics(form);
    setErrors(problems);
    if (Object.keys(problems).length > 0) {
      setFormError("Some fields need fixing. They're marked in red.");
      return;
    }
    setFormError(null);
    setIsSaving(true);
    try {
      if (existing) {
        const saved = await updatePatient(existing.id, toPayload(form));
        onSaved(saved, `Saved changes to ${saved.name} (${saved.id}).`);
        return;
      }
      const saved = await registerPatient(toPayload(form), resolution);
      onSaved(
        saved,
        saved.reviewId
          ? `Registered ${saved.name} as ${saved.id}, and flagged for the System Administrator to review (${saved.reviewId}).`
          : `Registered ${saved.name}. Their MPI number is ${saved.id}.`,
      );
    } catch (caught) {
      if (caught instanceof ApiError) {
        const body = caught.body as { fields?: FieldErrors; matches?: PossibleMatch[]; canOverride?: boolean } | null;
        if (caught.status === 409 && body?.matches) {
          // UC-01 extension 6a: show the possible matches and let the clerk decide
          setMatches(body.matches);
          setCanOverride(body.canOverride !== false);
          setReviewCandidateId(body.matches[0]?.patient.id ?? "");
          setFormError(body.canOverride === false ? caught.message : null);
        } else if (caught.status === 400 && body?.fields) {
          setErrors(body.fields);
          setFormError("Some fields need fixing. They're marked in red.");
        } else {
          setFormError(caught.message);
        }
      } else {
        setFormError("Couldn't reach the Patient Registry. Try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-bold">Name</legend>
        <Field name="givenName" label="Given name *" errors={errors}>
          {input("givenName", { placeholder: "e.g. Juan" })}
        </Field>
        <Field name="middleName" label="Middle name" errors={errors}>
          {input("middleName", { placeholder: "e.g. Santos" })}
        </Field>
        <Field name="familyName" label="Family name *" errors={errors}>
          {input("familyName", { placeholder: "e.g. Dela Cruz" })}
        </Field>
        <Field name="suffix" label="Suffix" errors={errors}>
          {input("suffix", { placeholder: "e.g. Jr." })}
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-bold">Identity</legend>
        <Field name="sex" label="Sex *" errors={errors}>
          <select
            value={form.sex}
            onChange={(event) => update("sex", event.target.value as Demographics["sex"])}
            aria-invalid={Boolean(errors.sex)}
            className={cn(fieldClass, errors.sex && "border-rose-500 ring-1 ring-rose-500")}
          >
            <option value="">Choose…</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </Field>
        <Field name="birthDate" label="Birth date *" errors={errors}>
          {input("birthDate", { type: "date" })}
        </Field>
        <Field name="civilStatus" label="Civil status" errors={errors}>
          <select
            value={form.civilStatus ?? ""}
            onChange={(event) => update("civilStatus", event.target.value)}
            className={fieldClass}
          >
            <option value="">Not given</option>
            {CIVIL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field name="philhealthPin" label="PhilHealth PIN" errors={errors}>
          {input("philhealthPin", { placeholder: "12 digits", inputMode: "numeric" })}
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-2 text-sm font-bold">Address and contact</legend>
        <Field name="address.street" label="House no. / street" errors={errors}>
          <input value={form.address.street ?? ""} onChange={(event) => updateAddress("street", event.target.value)} className={fieldClass} />
        </Field>
        {(["barangay", "municipality", "province"] as const).map((key) => (
          <Field
            key={key}
            name={`address.${key}`}
            label={`${key === "municipality" ? "Municipality / city" : key[0].toUpperCase() + key.slice(1)} *`}
            errors={errors}
          >
            <input
              value={form.address[key]}
              onChange={(event) => updateAddress(key, event.target.value)}
              aria-invalid={Boolean(errors[`address.${key}`])}
              className={cn(fieldClass, errors[`address.${key}`] && "border-rose-500 ring-1 ring-rose-500")}
            />
          </Field>
        ))}
        <Field name="contactNumber" label="Contact number" errors={errors}>
          {input("contactNumber", { placeholder: "09XXXXXXXXX", inputMode: "tel" })}
        </Field>
      </fieldset>

      {matches && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <h3 className="flex items-center gap-2 font-bold text-amber-700">
            <AlertTriangle size={16} />
            {canOverride ? "This might be someone already registered" : "This person is already registered"}
          </h3>
          <ul className="mt-3 space-y-2">
            {matches.map((match) => (
              <li key={match.patient.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card-bg p-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">{match.patient.name}</p>
                  <p className="font-mono text-[11px] text-text-muted">
                    {patientIdentifiers(match.patient)} · {match.patient.sex} · {match.patient.address.municipality ?? "no address"}
                  </p>
                  <p className="text-xs text-amber-700">
                    {match.reason}
                    {match.certainty === "Possible" && ` · ${Math.round(match.score * 100)}% name match`}
                  </p>
                </div>
                {onUseExisting && (
                  <button
                    type="button"
                    onClick={() => onUseExisting(match.patient.id)}
                    className="flex items-center gap-1 rounded-lg bg-wah-purple px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <UserCheck size={14} /> Use this record
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canOverride && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-amber-500/20 pt-4">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void save({ decision: "ConfirmedNew" })}
                className="flex items-center gap-1 rounded-lg border border-glass-border px-3 py-2 text-xs font-bold hover:bg-glass-bg"
              >
                <CheckCircle2 size={14} /> It&apos;s a different person: register as new
              </button>
              <span className="text-xs text-text-muted">or, if you can&apos;t tell:</span>
              <select
                value={reviewCandidateId}
                onChange={(event) => setReviewCandidateId(event.target.value)}
                aria-label="Record it might be"
                className="rounded-lg border border-glass-border bg-glass-bg px-2 py-2 text-xs"
              >
                {matches.map((match) => (
                  <option key={match.patient.id} value={match.patient.id}>
                    {match.patient.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void save({ decision: "FlagForReview", reviewCandidateId })}
                className="flex items-center gap-1 rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-500/10"
              >
                <Flag size={14} /> Register and flag for review
              </button>
            </div>
          )}
        </section>
      )}

      {formError && (
        <p role="alert" className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-600">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
          Cancel
        </button>
        {!matches && (
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? "Checking…" : existing ? "Save changes" : "Check and register"}
          </button>
        )}
      </div>
    </form>
  );
}
