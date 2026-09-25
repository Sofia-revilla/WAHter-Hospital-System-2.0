"use client";

import { useMemo, useState } from "react";
import { Activity, FileSpreadsheet, Plus, Search, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import { riskLevelFor } from "@/lib/mews";
import { bedLabel } from "@/lib/beds";
import type { Patient } from "@/types";
import { MewsChip } from "./MewsChip";
import { VitalsDialog } from "./VitalsDialog";

const FILTERS = ["All", "In-Patient", "Out-Patient", "ER", "Discharged"] as const;
type PatientFilter = (typeof FILTERS)[number];

// TODO(Phase 3): real primary diagnosis (ICD-10) from Clinical Records.
// Until then every row shows the same placeholder from the design.
const PLACEHOLDER_DIAGNOSIS = "Chronic Respiratory Failure with associated symptoms…";

function matchesFilter(patient: Patient, filter: PatientFilter) {
  // status is compared as a plain string: the mock statuses don't include
  // "Discharged" yet, but Supabase or the future API can return it
  const status: string = patient.status;

  switch (filter) {
    case "All":
      return true;
    case "ER":
      return patient.department === "ER";
    case "In-Patient":
      return status !== "Discharged";
    case "Discharged":
      return status === "Discharged";
    case "Out-Patient":
      // kept as designed; WAH2.0 is inpatient-only, OPD lives in WAH4C
      return patient.department !== "ICU";
  }
}

function matchesSearch(patient: Patient, query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [patient.name, patient.id, patient.department].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

interface PatientsViewProps {
  // shown as "recorded by" on any vitals charted from this tab
  staffName: string;
}

export function PatientsView({ staffName }: PatientsViewProps) {
  const { patients, wards, bedAssignments } = useData();
  const [chartingPatientId, setChartingPatientId] = useState<string | null>(null);
  // Beds assigned on the bed board win; everyone else keeps the design's
  // placeholder room until Scheduling owns this (Phase 4)
  function bedFor(patientId: string, index: number) {
    const assignment = bedAssignments.find((item) => item.patientId === patientId);
    const ward = assignment && wards.find((item) => item.id === assignment.wardId);
    return ward && assignment ? bedLabel(ward, assignment.bedIndex) : `Room 30${index + 1}-B`;
  }

  // looked up fresh so the dialog sees the updated MEWS right after saving
  const chartingPatient = patients.find((patient) => patient.id === chartingPatientId) ?? null;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PatientFilter>("All");

  const visiblePatients = useMemo(
    () =>
      patients.filter(
        (patient) => matchesFilter(patient, filter) && matchesSearch(patient, query.trim()),
      ),
    [patients, filter, query],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Master Directory</p>
          <h2 className="text-2xl font-bold tracking-tight">Patient Management</h2>
        </div>

        <div className="flex gap-3">
          {/* TODO(Phase 7b): export through the Interoperability service's report endpoints */}
          <button
            type="button"
            className={cn(
              "glass flex items-center gap-2 rounded-lg px-4 py-3",
              "text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foreground",
            )}
          >
            <FileSpreadsheet size={14} /> Excel Export
          </button>
          {/* TODO(Phase 9a): open the registration form (Identity service + MPI match) */}
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-3",
              "text-[10px] font-bold uppercase tracking-widest text-white",
              "shadow-lg shadow-wah-purple/30 transition-transform hover:scale-105",
            )}
          >
            <Plus size={14} /> New Registration
          </button>
        </div>
      </div>

      <section className="glass rounded-xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div
            className={cn(
              "flex flex-1 items-center gap-3 rounded-xl border border-glass-border bg-glass-bg px-4 py-3",
              "transition-shadow focus-within:ring-2 focus-within:ring-wah-purple/40",
            )}
          >
            <Search size={18} className="shrink-0 text-text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, patient ID, or department"
              aria-label="Search patients"
              className={cn(
                "w-full bg-transparent text-sm text-foreground outline-none",
                "placeholder:text-text-secondary",
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="shrink-0 text-text-muted hover:text-foreground"
              >
                {/* a Plus turned 45° reads as an ×, matching the rest of the icon set */}
                <Plus size={18} className="rotate-45" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-all",
                  filter === option
                    ? "bg-wah-purple text-white shadow-lg shadow-wah-purple/30"
                    : "text-text-muted hover:bg-glass-bg hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr
                className={cn(
                  "border-b border-glass-border",
                  "text-[10px] font-bold uppercase tracking-widest text-text-muted",
                )}
              >
                <th className="pb-4">Patient Profile</th>
                <th className="pb-4">Age / Gender</th>
                <th className="pb-4">Ward / Bed</th>
                <th className="pb-4">Primary Diagnosis</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">MEWS</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visiblePatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Search size={32} className="mx-auto opacity-30" />
                    <p className="mt-3 font-semibold">No patients found</p>
                    <p className="text-sm text-text-muted">Try a different name, ID, or department</p>
                  </td>
                </tr>
              ) : (
                visiblePatients.map((patient, index) => (
                  <tr
                    key={patient.id}
                    className="group border-b border-glass-border/50 transition-colors hover:bg-glass-bg"
                  >
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            "border border-wah-purple/30 bg-wah-purple/10 text-wah-neon",
                          )}
                        >
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-semibold">{patient.name}</p>
                          <p className="font-mono text-xs italic text-text-muted">{patient.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {/* the design alternates gender by row; patient.gender takes over with real data */}
                      {patient.age}Y • {index % 2 === 0 ? "Male" : "Female"}
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      <p>{patient.department}</p>
                      <p className="font-mono text-xs text-wah-neon">{bedFor(patient.id, index)}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="max-w-[200px] truncate text-sm" title={PLACEHOLDER_DIAGNOSIS}>
                        {PLACEHOLDER_DIAGNOSIS}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                          patient.status === "Critical"
                            ? "bg-rose-500/10 text-rose-500"
                            : "bg-emerald-500/10 text-emerald-500",
                        )}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <MewsChip risk={riskLevelFor(patient.mewsScore)} score={patient.mewsScore} />
                    </td>
                    <td className="py-4">
                      {/* focus-within too, so keyboard users can reach the hidden buttons */}
                      <div
                        className={cn(
                          "flex justify-end gap-2 opacity-0 transition-opacity",
                          "group-hover:opacity-100 group-focus-within:opacity-100",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setChartingPatientId(patient.id)}
                          aria-label={`Chart vitals for ${patient.name}`}
                          title="Chart vitals (MEWS)"
                          className="glass rounded-lg p-2 text-text-muted hover:text-wah-neon"
                        >
                          <Activity size={16} />
                        </button>
                        {/* TODO(Phase 9a): patient record, diagnosis, and discharge actions */}
                        <button
                          type="button"
                          aria-label={`Settings for ${patient.name}`}
                          className="glass rounded-lg p-2 text-text-muted hover:text-wah-neon"
                        >
                          <Settings size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <VitalsDialog
        patient={chartingPatient}
        recordedBy={staffName}
        onClose={() => setChartingPatientId(null)}
      />
    </div>
  );
}
