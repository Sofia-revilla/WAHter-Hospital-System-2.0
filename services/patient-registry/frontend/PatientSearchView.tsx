"use client";

import { useState } from "react";
import type { StaffRole } from "@/types";
import { PatientProfileCard } from "./PatientProfileCard";
import { PatientSearch } from "./PatientSearch";

interface PatientSearchViewProps {
  role: StaffRole;
}

// US-2 (Admitting Clerk) and US-5 (Billing Staff): find the right patient by
// MPI number, PhilHealth PIN, birth date, or name. Billing only reads; the
// clerk can also correct the record or report a duplicate.
export function PatientSearchView({ role }: PatientSearchViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isRegistrar = role === "AdmittingClerk" || role === "Nurse";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Patient Registry (MPI)</p>
        <h2 className="text-2xl font-bold tracking-tight">Patient Search</h2>
      </div>
      <section className="glass rounded-xl p-5">
        <PatientSearch selectedId={selectedId} onSelect={(patient) => setSelectedId(patient.id)} />
      </section>
      {selectedId && (
        <PatientProfileCard
          patientId={selectedId}
          canEdit={isRegistrar}
          canReportDuplicate={isRegistrar}
          onOpen={setSelectedId}
        />
      )}
    </div>
  );
}
