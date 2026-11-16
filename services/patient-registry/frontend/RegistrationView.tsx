"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { PatientProfileCard } from "./PatientProfileCard";
import { PatientSearch } from "./PatientSearch";
import { RegistrationForm } from "./RegistrationForm";

// UC-01 Register and Manage Patient Identity, for the Admitting Clerk (and
// the Nurse, UC-01's secondary actor). The flow follows the use case: search
// first (steps 2 and 3); if the patient isn't there, register them (steps 4
// to 10); if they are, open and update the existing record (extension 3a).
export function RegistrationView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function open(patientId: string) {
    setIsRegistering(false);
    setSelectedId(patientId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Patient Registry (MPI)</p>
          <h2 className="text-2xl font-bold tracking-tight">Registration</h2>
          <p className="text-sm text-text-muted">Search first, so nobody gets a second record.</p>
        </div>
        {!isRegistering && (
          <button
            type="button"
            onClick={() => {
              setIsRegistering(true);
              setSelectedId(null);
              setNotice(null);
            }}
            className="flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            <UserPlus size={16} /> Register new patient
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {isRegistering ? (
        <section className="glass rounded-xl p-5">
          <h3 className="mb-4 text-lg font-bold">New patient</h3>
          <RegistrationForm
            onCancel={() => setIsRegistering(false)}
            onUseExisting={(patientId) => {
              setNotice("Opened the existing record instead of registering a duplicate.");
              open(patientId);
            }}
            onSaved={(patient, note) => {
              setNotice(note);
              open(patient.id);
            }}
          />
        </section>
      ) : (
        <section className="glass rounded-xl p-5">
          <PatientSearch selectedId={selectedId} onSelect={(patient) => open(patient.id)} />
        </section>
      )}

      {selectedId && !isRegistering && <PatientProfileCard patientId={selectedId} canEdit canReportDuplicate onOpen={open} />}
    </div>
  );
}
