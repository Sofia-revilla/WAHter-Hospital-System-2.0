import { apiGet, apiPost, apiRequest } from "@/lib/api";

// Calls to the Patient Registry (services/patient-registry/backend). Every
// other service only holds patient IDs; this is where they become names, and
// where the Admitting Clerk registers and finds patients (UC-01).

export interface Address {
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
}

export interface PatientIdentity {
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
  address: Address;
  philhealthPin: string | null;
  mergedInto: string | null;
  exchangeStatus: "Pending" | "Sent" | "Rejected";
  exchangeError: string | null;
  registeredAt: string;
}

export interface PatientProfile extends PatientIdentity {
  merges: { sourceId: string; targetId: string; reason: string; mergedById: string; mergedAt: string }[];
}

// What the registration form sends (the API's PatientDemographicsDto)
export interface Demographics {
  givenName: string;
  middleName?: string;
  familyName: string;
  suffix?: string;
  sex: "Male" | "Female" | "";
  birthDate: string;
  civilStatus?: string;
  contactNumber?: string;
  address: { street?: string; barangay: string; municipality: string; province: string };
  philhealthPin?: string;
}

export interface PossibleMatch {
  patient: PatientIdentity;
  score: number;
  certainty: "Sure" | "Possible";
  reason: string;
}

export interface IdentityReview {
  id: string;
  reason: string;
  status: "Pending" | "Merged" | "KeptSeparate";
  reportedById: string;
  reportedAt: string;
  resolvedById: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  survivorId: string | null;
  patient: PatientIdentity | null;
  candidate: PatientIdentity | null;
}

// IDs go in the query string, so we split very long lists to keep URLs short
const IDS_PER_REQUEST = 100;

export async function fetchPatientsByIds(ids: string[]) {
  const unique = [...new Set(ids)];
  const batches: string[][] = [];
  for (let start = 0; start < unique.length; start += IDS_PER_REQUEST) {
    batches.push(unique.slice(start, start + IDS_PER_REQUEST));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      apiGet<PatientIdentity[]>("patient-registry", `/patients?ids=${batch.map(encodeURIComponent).join(",")}`),
    ),
  );
  return results.flat();
}

// US-2, US-5: MPI number, PhilHealth PIN, birth date (YYYY-MM-DD), or name
export const searchPatients = (query: string) =>
  apiGet<PatientIdentity[]>("patient-registry", `/patients/search?q=${encodeURIComponent(query.trim())}`);

export const fetchPatient = (id: string) => apiGet<PatientProfile>("patient-registry", `/patients/${encodeURIComponent(id)}`);

// A 409 means possible duplicates; its body carries `matches` and `canOverride`
export const registerPatient = (
  demographics: Demographics,
  resolution?: { decision: "ConfirmedNew" | "FlagForReview"; reviewCandidateId?: string },
) => apiPost<PatientIdentity & { reviewId: string | null }>("patient-registry", "/patients", { ...demographics, ...resolution });

export const updatePatient = (id: string, changes: Partial<Demographics>) =>
  apiRequest<PatientIdentity>("patient-registry", `/patients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

export const reportDuplicate = (id: string, otherPatientId: string, reason: string) =>
  apiPost<{ reviewId: string }>("patient-registry", `/patients/${encodeURIComponent(id)}/duplicate-reports`, {
    otherPatientId,
    reason,
  });

// ─── Identity Review (System Administrator, UC-08 4b) ───

export const fetchIdentityReviews = (status?: IdentityReview["status"]) =>
  apiGet<IdentityReview[]>("patient-registry", status ? `/identity-reviews?status=${status}` : "/identity-reviews");

export const mergeReview = (id: string, survivorId: string, note: string) =>
  apiPost<unknown>("patient-registry", `/identity-reviews/${id}/merge`, { survivorId, note });

export const keepSeparate = (id: string, note: string) =>
  apiPost<unknown>("patient-registry", `/identity-reviews/${id}/keep-separate`, { note });
