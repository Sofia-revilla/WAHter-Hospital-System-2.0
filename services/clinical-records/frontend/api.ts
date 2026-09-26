import { apiGet, apiPost } from "@/lib/api";
import type { VitalSigns } from "@/lib/mews";
import type { Patient, VitalsRecord } from "@/types";

// Calls to the Clinical Records service (services/clinical-records/backend)

export const fetchCensus = () => apiGet<Patient[]>("clinical-records", "/patients");

export const fetchVitals = (limit = 200) => apiGet<VitalsRecord[]>("clinical-records", `/vitals?limit=${limit}`);

// The service scores MEWS itself and publishes the alert; the score in the
// response is the one that counts, not the form's live preview
export const postVitals = (patientId: string, vitals: VitalSigns, confirmedImplausible: boolean) =>
  apiPost<VitalsRecord>("clinical-records", "/vitals", { patientId, vitals, confirmedImplausible });
