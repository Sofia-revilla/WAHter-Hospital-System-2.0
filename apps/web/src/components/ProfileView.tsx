"use client";

import { useState } from "react";
import { Pencil, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/lib/staff";
import { ROLE_LABELS, type StaffProfile, type StaffRole } from "@/types";

const DEFAULT_BIOS: Record<StaffRole, string> = {
  Doctor:
    "Experienced medical professional specializing in internal medicine with over 10 years of clinical practice at WAHter Hospital. Dedicated to patient-centered care and evidence-based treatment.",
  Nurse:
    "Certified registered nurse with expertise in acute care and patient monitoring. Committed to compassionate and efficient patient care within the WAHter hospital network.",
  IT: "Lead systems administrator and IT infrastructure analyst managing healthcare security policies.",
};

// full class strings so Tailwind's scanner picks every one of them up
const ROLE_STYLES: Record<StaffRole, { band: string; avatar: string; badge: string }> = {
  Doctor: {
    band: "bg-wah-purple",
    avatar: "bg-gradient-to-br from-wah-purple to-indigo-700",
    badge: "bg-wah-purple/10 text-wah-purple",
  },
  Nurse: {
    band: "bg-wah-neon",
    avatar: "bg-gradient-to-br from-wah-neon to-wah-purple",
    badge: "bg-wah-neon/10 text-wah-neon",
  },
  IT: {
    band: "bg-rose-500",
    avatar: "bg-gradient-to-br from-rose-500 to-rose-700",
    badge: "bg-rose-500/10 text-rose-500",
  },
};

const ACTIVITY = [
  { label: "Patients Today", value: "12" },
  { label: "Prescriptions", value: "8" },
  { label: "On Duty Since", value: "07:00 AM" },
];

// Initials skip the "Dr."/"RN" title so "Dr. Jonathan Smith" gives "JS", not "DJS".
function initialsOf(name: string) {
  return name
    .replace(/^(dr\.?|rn)\s+/i, "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type EditableField = "name" | "department" | "license";

const FIELDS: { key: EditableField | "role"; label: string }[] = [
  { key: "name", label: "Full Name" },
  { key: "department", label: "Department" },
  { key: "license", label: "License / Employee ID" },
  { key: "role", label: "Role" },
];

interface ProfileViewProps {
  name: string;
  role: StaffRole;
  department: string;
  license: string;
  isLight: boolean;
  // Not in the original design, but without it an edit only lived inside this
  // tab and the topbar kept showing the old name. App passes its setters here.
  onSave?: (profile: StaffProfile) => void;
}

export function ProfileView({
  name,
  role,
  department,
  license,
  isLight,
  onSave,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(DEFAULT_BIOS[role]);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [draft, setDraft] = useState({ name, department, license });

  const style = ROLE_STYLES[role];
  const shown = isEditing ? draft : { name, department, license };

  function toggleEditing() {
    if (isEditing) {
      onSave?.({
        name: draft.name.trim() || name,
        role,
        department: draft.department.trim(),
        license: draft.license.trim(),
      });
    } else {
      // start from what's currently saved, not a stale draft from last time
      setDraft({ name, department, license });
    }
    setIsEditing((current) => !current);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Staff Profile</p>
          <h2 className="text-2xl font-bold tracking-tight">
            {role === "IT" ? "Administrator Profile" : "Clinician Profile"}
          </h2>
        </div>
        <button
          type="button"
          onClick={toggleEditing}
          className={cn(
            "flex items-center gap-2 rounded-lg border-2 border-wah-purple px-5 py-2.5",
            "text-sm font-bold transition-colors",
            isEditing ? "bg-wah-purple text-white" : "text-wah-purple hover:bg-wah-purple/10",
          )}
        >
          {isEditing ? <Save size={16} /> : <Pencil size={16} />}
          {isEditing ? "Save Changes" : "Edit Profile"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass overflow-hidden rounded-xl lg:col-span-1">
          <div className={cn("h-16", style.band)} />
          <div
            className={cn(
              "relative z-10 mx-auto -mt-12 flex h-24 w-24 items-center justify-center rounded-full",
              "border-4 border-card-bg text-3xl font-black text-white",
              style.avatar,
            )}
          >
            {initialsOf(name)}
          </div>

          <div className="space-y-2 p-6 text-center">
            <p className="text-xl font-black">{formatDisplayName(name, role)}</p>
            <span
              className={cn(
                "inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase",
                style.badge,
              )}
            >
              {ROLE_LABELS[role]}
            </span>
            <p className="text-sm text-text-muted">{department}</p>
            <p className="font-mono text-xs text-text-muted">{license}</p>
          </div>

          <div className="mx-6 flex items-center justify-between border-t border-glass-border py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                On-Duty Status
              </p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isOnDuty ? "text-green-500" : "text-text-muted",
                )}
              >
                {isOnDuty ? "On Duty" : "Off Duty"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isOnDuty}
              aria-label="On-duty status"
              onClick={() => setIsOnDuty((current) => !current)}
              className={cn(
                "relative h-6 w-12 shrink-0 rounded-full transition-colors",
                isOnDuty && "bg-green-500",
                // glass-bg is near-white in light mode, so the off track needs a real grey
                !isOnDuty &&
                  (isLight
                    ? "border border-slate-300 bg-slate-200"
                    : "border border-glass-border bg-glass-bg"),
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow",
                  "transition-transform",
                  isOnDuty && "translate-x-6",
                )}
              />
            </button>
          </div>

          <div className="border-t border-glass-border px-6 py-4 text-center">
            <p className="text-sm font-black">
              WAH<span className="text-wah-accent">ter</span>
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">
              Hospital Management System
            </p>
          </div>
        </section>

        <section className="glass rounded-xl p-5 lg:col-span-2">
          <h3 className="mb-6 text-lg font-bold">Profile Details</h3>

          <div className="grid gap-6 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div
                key={field.key}
                className={cn("space-y-2", !isEditing && "border-b border-glass-border pb-3")}
              >
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  {field.label}
                </p>
                {field.key === "role" ? (
                  // role changes belong to the System Admin (step-up protected), never self-service
                  <p className="font-semibold text-foreground">{ROLE_LABELS[role]}</p>
                ) : isEditing ? (
                  <input
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    aria-label={field.label}
                    className={cn(
                      "w-full rounded-lg border border-glass-border bg-glass-bg p-3 text-sm",
                      "text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
                    )}
                  />
                ) : (
                  <p className="font-semibold text-foreground">{shown[field.key]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Biography</p>
            {isEditing ? (
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                aria-label="Biography"
                className={cn(
                  "h-32 w-full resize-none rounded-xl border border-glass-border bg-glass-bg p-4",
                  "text-sm text-foreground outline-none focus:ring-1 focus:ring-wah-purple",
                )}
              />
            ) : (
              <p className="text-sm leading-relaxed text-text-secondary">{bio}</p>
            )}
          </div>

          {/* TODO(Phase 9a): real counts from Clinical Records and Orders & Diagnostics */}
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-glass-border pt-6">
            {ACTIVITY.map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-black text-wah-purple">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase text-text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
