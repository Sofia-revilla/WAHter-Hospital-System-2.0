"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { fieldClass } from "@/components/Modal";
import { formatBirthDate } from "@/components/PatientPicker";
import { searchPatients, type PatientIdentity } from "./api";

// US-2 and US-5 (UC-01 steps 2 and 3): look a patient up before registering,
// by MPI number, PhilHealth PIN, birth date, or name.

interface PatientSearchProps {
  onSelect: (patient: PatientIdentity) => void;
  selectedId?: string | null;
}

export function PatientSearch({ onSelect, selectedId }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientIdentity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError("Type at least two characters.");
      return;
    }
    setIsSearching(true);
    try {
      setResults(await searchPatients(query));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't reach the Patient Registry.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2" role="search">
        <label className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="MPI number, PhilHealth PIN, birth date (YYYY-MM-DD), or name"
            aria-label="Search the patient registry"
            className={cn(fieldClass, "pl-9")}
          />
        </label>
        <button type="submit" disabled={isSearching} className="rounded-lg bg-wah-purple px-4 text-sm font-semibold text-white">
          {isSearching ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {results && (
        <div className="overflow-hidden rounded-lg border border-glass-border">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">No patient matches “{query}”. Check the spelling, or register them as new.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-glass-border bg-glass-bg text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  <th className="px-3 py-2">Patient</th>
                  <th className="px-3 py-2">Birth date</th>
                  <th className="px-3 py-2">Sex</th>
                  <th className="hidden px-3 py-2 md:table-cell">Address</th>
                  <th className="hidden px-3 py-2 md:table-cell">PhilHealth PIN</th>
                </tr>
              </thead>
              <tbody>
                {results.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => onSelect(patient)}
                    className={cn(
                      "cursor-pointer border-b border-glass-border/50 hover:bg-wah-purple/5",
                      patient.id === selectedId && "bg-wah-purple/10",
                    )}
                  >
                    <td className="px-3 py-2">
                      <button type="button" className="text-left font-semibold text-wah-purple hover:underline">
                        {patient.name}
                      </button>
                      <p className="font-mono text-[11px] text-text-muted">
                        {patient.id}
                        {patient.mergedInto && ` · merged into ${patient.mergedInto}`}
                      </p>
                    </td>
                    <td className="px-3 py-2">{formatBirthDate(patient.birthDate)}</td>
                    <td className="px-3 py-2">{patient.sex}</td>
                    <td className="hidden px-3 py-2 text-text-muted md:table-cell">
                      {[patient.address.barangay, patient.address.municipality].filter(Boolean).join(", ")}
                    </td>
                    <td className="hidden px-3 py-2 font-mono text-xs md:table-cell">{patient.philhealthPin ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
