"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types";

// The one patient picker every screen uses. It always shows the name, the MPI
// number, and the birth date, so staff check at least two identifiers before
// ordering or admitting (the patient-safety check from the system revision
// checklist). Search works on any of the three.

const fieldClass = cn(
  "w-full rounded-lg border border-glass-border bg-glass-bg p-3 text-sm text-foreground",
  "outline-none focus-within:ring-1 focus-within:ring-wah-purple",
);

const MAX_MATCHES = 8;

export function formatBirthDate(birthDate: string) {
  if (!birthDate) return "birth date unknown";
  return new Date(`${birthDate}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// "WAH-2026-00004 · born Jul 30, 1939"
export function patientIdentifiers(patient: Pick<Patient, "id" | "birthDate">) {
  return `${patient.id} · born ${formatBirthDate(patient.birthDate)}`;
}

interface PatientPickerProps {
  patients: Patient[];
  selected: Patient | null;
  onSelect: (patient: Patient | null) => void;
  // extra note per patient, e.g. which bed they're in now
  describe?: (patient: Patient) => string | null;
  label?: string;
}

export function PatientPicker({ patients, selected, onSelect, describe, label = "Search patient" }: PatientPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const needle = query.trim().toLowerCase();
  const matches = patients
    .filter(
      (patient) =>
        !needle ||
        patient.name.toLowerCase().includes(needle) ||
        patient.id.toLowerCase().includes(needle) ||
        patient.birthDate.includes(needle),
    )
    .slice(0, MAX_MATCHES);

  if (selected) {
    return (
      <div className={cn(fieldClass, "flex items-center justify-between gap-3")}>
        <div className="min-w-0">
          <p className="truncate font-semibold">{selected.name}</p>
          <p className="font-mono text-[10px] text-text-muted">
            {patientIdentifiers(selected)} · {selected.age} Y/O {selected.gender}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-label="Change patient"
          className="shrink-0 rounded-lg p-1 text-text-muted hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={cn(fieldClass, "flex items-center gap-2")}>
        <Search size={16} className="shrink-0 text-text-muted" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          placeholder="Name, MPI number, or birth date (YYYY-MM-DD)"
          aria-label={label}
          className="w-full bg-transparent outline-none placeholder:text-text-secondary"
        />
      </div>
      {isOpen && (
        <ul
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg",
            "border border-glass-border bg-card-bg p-1 shadow-xl",
          )}
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-muted">No patient matches “{query}”.</li>
          ) : (
            matches.map((patient) => {
              const note = describe?.(patient);
              return (
                <li key={patient.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    // mousedown, so it fires before the input's blur closes the list
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onSelect(patient);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-glass-bg"
                  >
                    <span className="block text-sm font-semibold">{patient.name}</span>
                    <span className="block font-mono text-[10px] text-text-muted">
                      {patientIdentifiers(patient)}
                      {note && ` · ${note}`}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
