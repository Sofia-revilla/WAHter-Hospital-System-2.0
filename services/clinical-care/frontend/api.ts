import { apiGet, apiPost } from "@/lib/api";
import type { VitalSigns } from "@/lib/mews";
import type { Patient, VitalsRecord } from "@/types";

// Calls to the Clinical Care service (services/clinical-care/backend)

// The clinical half of a census row; the name, age, and sex come from the
// Patient Registry (see DataContext)
export interface CensusEntry {
  patientId: string;
  encounterId: string;
  department: Patient["department"];
  status: Patient["status"];
  mewsScore: number;
  admittedAt: string;
}

export type VitalsResponse = Omit<VitalsRecord, "recordedBy">;

export const fetchCensus = () => apiGet<CensusEntry[]>("clinical-care", "/encounters/open");

export const fetchVitals = (limit = 200) => apiGet<VitalsResponse[]>("clinical-care", `/vitals?limit=${limit}`);

// The service scores MEWS itself and publishes the alert; the score in the
// response is the one that counts, not the form's live preview
export const postVitals = (patientId: string, vitals: VitalSigns, confirmedImplausible: boolean) =>
  apiPost<VitalsResponse>("clinical-care", "/vitals", { patientId, vitals, confirmedImplausible });
