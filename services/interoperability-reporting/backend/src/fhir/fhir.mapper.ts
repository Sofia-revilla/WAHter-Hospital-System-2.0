// Records from the owning services -> FHIR R4 resources. Only the paper's
// subset (Patient and Encounter so far; Observation, Condition,
// MedicationRequest, and DiagnosticReport come with Phase 10).
//
// TODO(Phase 10): add the PH Core profile URLs and extensions once we map
// against the published PH Core IG (docs/PHCORE_MAPPING.md).

// as the Patient Registry returns it
export interface PatientRecord {
  id: string;
  name: string;
  sex: "Male" | "Female";
  birthDate: string;
  philhealthPin: string | null;
}

// as Patient Flow's /admissions/history returns it
export interface AdmissionRecord {
  admissionId: string;
  patientId: string;
  wardId: string;
  admissionType: string;
  assignedAt: string;
  endedAt: string | null;
}

// our own identifier system for MPI numbers
const MPI_SYSTEM = "urn:wahter:mpi";
const PHILHEALTH_SYSTEM = "urn:wahter:philhealth-pin";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const family = parts.length > 1 ? parts.pop()! : fullName;
  return { family, given: parts };
}

export function toFhirPatient(patient: PatientRecord) {
  const identifiers = [{ system: MPI_SYSTEM, value: patient.id }];
  if (patient.philhealthPin) identifiers.push({ system: PHILHEALTH_SYSTEM, value: patient.philhealthPin });
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: identifiers,
    name: [{ use: "official", text: patient.name, ...splitName(patient.name) }],
    gender: patient.sex === "Male" ? "male" : "female",
    birthDate: patient.birthDate,
  };
}

export function toFhirEncounter(admission: AdmissionRecord) {
  return {
    resourceType: "Encounter",
    id: admission.admissionId,
    status: admission.endedAt ? "finished" : "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "IMP",
      display: "inpatient encounter",
    },
    subject: { reference: `Patient/${admission.patientId}` },
    period: { start: admission.assignedAt, ...(admission.endedAt ? { end: admission.endedAt } : {}) },
    location: [{ location: { display: `Ward ${admission.wardId}` } }],
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
