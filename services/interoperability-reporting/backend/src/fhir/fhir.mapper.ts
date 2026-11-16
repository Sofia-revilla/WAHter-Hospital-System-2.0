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
  givenName: string;
  middleName: string | null;
  familyName: string;
  suffix: string | null;
  sex: "Male" | "Female";
  birthDate: string;
  civilStatus: string | null;
  contactNumber: string | null;
  address: { street?: string; barangay?: string; municipality?: string; province?: string };
  philhealthPin: string | null;
  mergedInto: string | null;
  merges?: { sourceId: string; targetId: string }[];
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

const MARITAL_CODE: Record<string, string> = {
  Single: "S",
  Married: "M",
  Widowed: "W",
  Separated: "L",
  Annulled: "A",
};

export function toFhirPatient(patient: PatientRecord) {
  const identifiers = [{ system: MPI_SYSTEM, value: patient.id }];
  if (patient.philhealthPin) identifiers.push({ system: PHILHEALTH_SYSTEM, value: patient.philhealthPin });
  const given = [patient.givenName, patient.middleName].filter((part): part is string => Boolean(part));
  const line = [patient.address.street, patient.address.barangay].filter((part): part is string => Boolean(part));
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: identifiers,
    active: !patient.mergedInto,
    name: [
      {
        use: "official",
        text: patient.name,
        family: patient.familyName,
        given,
        ...(patient.suffix ? { suffix: [patient.suffix] } : {}),
      },
    ],
    gender: patient.sex === "Male" ? "male" : "female",
    birthDate: patient.birthDate,
    ...(patient.contactNumber ? { telecom: [{ system: "phone", value: patient.contactNumber, use: "mobile" }] } : {}),
    address: [
      {
        use: "home",
        line,
        city: patient.address.municipality,
        state: patient.address.province,
        country: "PH",
      },
    ],
    ...(patient.civilStatus
      ? {
          maritalStatus: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                code: MARITAL_CODE[patient.civilStatus] ?? "UNK",
                display: patient.civilStatus,
              },
            ],
          },
        }
      : {}),
    // a merge tells WAH Systems which old MPI numbers this record replaces
    ...(patient.merges?.some((merge) => merge.targetId === patient.id)
      ? {
          link: patient.merges
            .filter((merge) => merge.targetId === patient.id)
            .map((merge) => ({ other: { reference: `Patient/${merge.sourceId}` }, type: "replaces" })),
        }
      : {}),
  };
}

// The minimum a Patient needs before it leaves the hospital. Phase 10 adds
// full profile validation (UC-09 extension 3a).
export function validateFhirPatient(resource: ReturnType<typeof toFhirPatient>) {
  const problems: string[] = [];
  if (!resource.identifier.some((identifier) => identifier.system === MPI_SYSTEM && identifier.value)) {
    problems.push("no MPI identifier");
  }
  if (!resource.name[0]?.family || resource.name[0].given.length === 0) problems.push("no family or given name");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resource.birthDate ?? "")) problems.push("no valid birth date");
  if (!resource.address[0]?.city || !resource.address[0]?.state) problems.push("no municipality or province");
  return problems;
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
