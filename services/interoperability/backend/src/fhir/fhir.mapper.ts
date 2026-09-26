// Local rows -> FHIR R4 resources. Only the paper's subset (Patient and
// Encounter so far; Observation, Condition, MedicationRequest, and
// DiagnosticReport come with Phase 7b).
//
// TODO(Phase 7b): add the PH Core profile URLs and extensions once we map
// against the published PH Core IG (docs/PHCORE_MAPPING.md).

export interface PatientRow {
  id: string;
  name: string;
  sex: "Male" | "Female";
  birth_date: Date;
  philhealth_pin: string | null;
}

export interface AdmissionRow {
  admission_id: string;
  patient_id: string;
  ward_id: string;
  admission_type: string;
  admitted_at: Date;
}

// our own identifier system for MPI numbers
const MPI_SYSTEM = "urn:wahter:mpi";
const PHILHEALTH_SYSTEM = "urn:wahter:philhealth-pin";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const family = parts.length > 1 ? parts.pop()! : fullName;
  return { family, given: parts };
}

export function toFhirPatient(row: PatientRow) {
  const identifiers = [{ system: MPI_SYSTEM, value: row.id }];
  if (row.philhealth_pin) identifiers.push({ system: PHILHEALTH_SYSTEM, value: row.philhealth_pin });
  return {
    resourceType: "Patient",
    id: row.id,
    identifier: identifiers,
    name: [{ use: "official", text: row.name, ...splitName(row.name) }],
    gender: row.sex === "Male" ? "male" : "female",
    birthDate: row.birth_date.toISOString().slice(0, 10),
  };
}

export function toFhirEncounter(row: AdmissionRow) {
  return {
    resourceType: "Encounter",
    id: row.admission_id,
    status: "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "IMP",
      display: "inpatient encounter",
    },
    subject: { reference: `Patient/${row.patient_id}` },
    period: { start: row.admitted_at.toISOString() },
    location: [{ location: { display: `Ward ${row.ward_id}` } }],
  };
}

export function searchBundle(resources: { resourceType: string; id: string }[]) {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: resources.length,
    entry: resources.map((resource) => ({
      fullUrl: `${resource.resourceType}/${resource.id}`,
      resource,
    })),
  };
}
