import { apiGet, apiPost } from "@/lib/api";
import type { AdmissionType, Ward } from "@/types";

// Calls to the Patient Flow service (services/patient-flow/backend)

// What the service sends: IDs only. DataContext adds the names.
export interface AdmissionRecord {
  admissionId: string;
  patientId: string;
  wardId: string;
  bedIndex: number;
  admissionType: AdmissionType;
  attendingPhysicianId: string;
  assignedById: string;
  assignedAt: string;
  endedAt: string | null;
}

export const fetchWards = () => apiGet<Ward[]>("patient-flow", "/wards");

export const fetchAdmissions = () => apiGet<AdmissionRecord[]>("patient-flow", "/admissions");

// A bed another user just took comes back as a 409 (the bed lock, UC-02 6b)
export const postAdmission = (admission: {
  patientId: string;
  wardId: string;
  bedIndex: number;
  admissionType: AdmissionType;
  attendingPhysicianId: string;
}) => apiPost<AdmissionRecord>("patient-flow", "/admissions", admission);
