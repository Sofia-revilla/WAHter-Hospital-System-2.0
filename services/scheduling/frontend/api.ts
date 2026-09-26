import { apiGet, apiPost } from "@/lib/api";
import type { AdmissionType, BedAssignment, Ward } from "@/types";

// Calls to the Scheduling service (services/scheduling/backend)

export const fetchWards = () => apiGet<Ward[]>("scheduling", "/wards");

export const fetchAdmissions = () => apiGet<BedAssignment[]>("scheduling", "/admissions");

// A bed another nurse just took comes back as a 409 (the bed lock, UC-04 BR-03)
export const postAdmission = (admission: {
  patientId: string;
  wardId: string;
  bedIndex: number;
  admissionType: AdmissionType;
  attendingPhysician: string;
}) => apiPost<BedAssignment>("scheduling", "/admissions", admission);
