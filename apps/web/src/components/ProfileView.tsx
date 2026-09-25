"use client";

import { useState } from "react";
import { BadgeCheck, Building2, IdCard, Pencil, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StaffProfile, StaffRole } from "@/types";

// role band colors mirror the login cards: doctor purple, nurse neon, IT rose
const ROLE_BAND: Record<StaffRole, string> = {
  Doctor: "from-wah-purple to-indigo-700",
  Nurse: "from-wah-neon to-wah-purple",
  "IT Admin": "from-rose-500 to-rose-700",
};

function initialsOf(name: string) {
  const parts = name.replace(/^(dr\.|rn)\s+/i, "").trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface ProfileViewProps {
  profile: StaffProfile;
  displayName: string;
  onSave: (profile: StaffProfile) => void;
}

export function ProfileView({ profile, displayName, onSave }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StaffProfile>(profile);
  const [bio, setBio] = useState("");
  const [isOnDuty, setIsOnDuty] = useState(true);

  function startEditing() {
    // re-sync in case the profile changed while we weren't editing
    setDraft(profile);
    setIsEditing(true);
  }

  function saveChanges() {
    onSave(draft);
    setIsEditing(false);
  }

  const fieldClass = cn(
    "w-full rounded-2xl border-2 border-glass-border bg-glass-bg px-4 py-3",
    "text-sm text-foreground outline-none transition-colors",
    "focus:border-wah-purple disabled:opacity-70",
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* digital badge */}
      <div className="glass overflow-hidden rounded-[2rem] purple-shadow">
        <div className={cn("h-24 bg-gradient-to-r", ROLE_BAND[profile.role])} />
        <div className="-mt-12 flex flex-col items-center px-6 pb-6 text-center">
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full",
              "border-4 border-card-bg bg-wah-purple text-2xl font-black text-white",
            )}
          >
            {initialsOf(profile.name)}
          </div>
          <h2 className="mt-3 text-xl font-bold">{displayName}</h2>
          <span
            className={cn(
              "mt-2 rounded-full bg-wah-purple/15 px-3 py-1",
              "text-[10px] font-black uppercase tracking-wider text-wah-neon",
            )}
          >
            {profile.role}
          </span>

          <dl className="mt-6 w-full space-y-3 text-left text-sm">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-wah-neon" />
              <dd>{profile.department}</dd>
            </div>
            <div className="flex items-center gap-3">
              <IdCard size={16} className="text-wah-neon" />
              <dd className="font-mono">{profile.license}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setIsOnDuty((current) => !current)}
            aria-label={isOnDuty ? "Set status to off duty" : "Set status to on duty"}
            className={cn(
              "mt-6 flex w-full items-center justify-between rounded-2xl px-4 py-3",
              "text-sm font-semibold transition-colors",
              isOnDuty ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-text-muted",
            )}
          >
            {isOnDuty ? "On Duty" : "Off Duty"}
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                isOnDuty ? "bg-emerald-400" : "bg-slate-400",
              )}
            />
          </button>

          <p className="mt-6 flex items-center gap-1 font-mono text-[10px] uppercase text-text-secondary">
            <BadgeCheck size={12} /> WAHter · Hospital Staff
          </p>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold">Staff Details</h3>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Cancel editing"
                className="rounded-xl p-2 text-text-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
              <button
                type="button"
                onClick={saveChanges}
                className={cn(
                  "flex items-center gap-2 rounded-xl bg-wah-purple px-4 py-2",
                  "text-sm font-bold text-white",
                )}
              >
                <Save size={16} /> Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-wah-neon hover:bg-wah-purple/10"
            >
              <Pencil size={16} /> Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-xs font-semibold uppercase text-text-muted">
            Full Name
            <input
              className={fieldClass}
              disabled={!isEditing}
              value={isEditing ? draft.name : profile.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase text-text-muted">
            Department
            <input
              className={fieldClass}
              disabled={!isEditing}
              value={isEditing ? draft.department : profile.department}
              onChange={(event) => setDraft({ ...draft, department: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase text-text-muted">
            License / Employee ID
            <input
              className={cn(fieldClass, "font-mono")}
              disabled={!isEditing}
              value={isEditing ? draft.license : profile.license}
              onChange={(event) => setDraft({ ...draft, license: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase text-text-muted">
            Role
            {/* role changes go through the System Admin (step-up protected), so it's read-only here */}
            <input className={fieldClass} disabled value={profile.role} />
          </label>
        </div>

        {isEditing && (
          <label className="mt-4 block space-y-2 text-xs font-semibold uppercase text-text-muted">
            Bio
            <textarea
              className={cn(fieldClass, "min-h-28 resize-y normal-case")}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Specialization, shift preferences, anything the team should know"
            />
          </label>
        )}

        {/* TODO(Phase 9a): pull these from the Clinical Records + Orders services */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: "Patients Today", value: "12" },
            { label: "Prescriptions", value: "8" },
            { label: "On Duty Since", value: "07:00" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-glass-bg p-4 text-center">
              <p className="text-2xl font-black text-wah-neon">{stat.value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
