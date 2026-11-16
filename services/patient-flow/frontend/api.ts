import { apiGet, apiPost, apiRequest } from "@/lib/api";
import type { AdmissionType } from "@/types";

// Calls to the Patient Flow service (services/patient-flow/backend). The
// service sends IDs only; DataContext and the screens add the names.

export type BedStatus = "Available" | "Occupied" | "Cleaning" | "Maintenance";

export interface BoardBed {
  id: string;
  code: string;
  status: BedStatus;
  version: number;
  // null on the System Administrator's layout (no patient data)
  occupant: {
    admissionId: string;
    patientId: string;
    attendingPhysicianId: string;
    admittedAt: string;
    status: string;
  } | null;
}

export interface BoardWard {
  id: string;
  name: string;
  type: "Male" | "Female" | "Specialized" | "Children";
  color: string;
  department: string;
  capacity: number;
  occupied: number;
  available: number;
  rooms: { id: string; code: string; beds: BoardBed[] }[];
}

export interface AdmissionRecord {
  admissionId: string;
  patientId: string;
  attendingPhysicianId: string;
  admissionType: AdmissionType;
  admittingDiagnosis: string;
  admittedAt: string;
  admittedById: string;
  bedId: string | null;
  bedCode: string | null;
  wardId: string | null;
  status: "Admitted" | "ReadyForDischarge" | "Discharged";
  dischargedAt: string | null;
}

// UC-02 6a/6b: what a 409 carries when the bed was taken first
export interface FreeBed {
  bedId: string;
  code: string;
  roomCode: string;
  wardId: string;
  wardName: string;
  wardType: string;
  department: string;
}

export const fetchBedBoard = () => apiGet<BoardWard[]>("patient-flow", "/bed-board");

// the same layout without patients (System Administrator)
export const fetchWardLayout = () => apiGet<BoardWard[]>("patient-flow", "/wards");

export const fetchAdmissions = () => apiGet<AdmissionRecord[]>("patient-flow", "/admissions");

export const postAdmission = (admission: {
  patientId: string;
  attendingPhysicianId: string;
  bedId: string;
  admissionType: AdmissionType;
  admittingDiagnosis: string;
  admittedAt?: string;
  appointmentId?: string;
}) => apiPost<AdmissionRecord>("patient-flow", "/admissions", admission);

export const postTransfer = (admissionId: string, bedId: string, reason: string) =>
  apiPost<AdmissionRecord>("patient-flow", `/admissions/${admissionId}/transfer`, { bedId, reason });

// ─── scheduling and queue (Admitting Clerk) ───

export interface Appointment {
  id: string;
  patientId: string;
  department: string;
  physicianId: string;
  scheduledAt: string;
  durationMinutes: number;
  purpose: string;
  status: "Booked" | "CheckedIn" | "Completed" | "Cancelled" | "NoShow";
  queueNumber: number | null;
  queuePosition: number | null;
  checkedInAt: string | null;
  bookedById: string;
}

export const fetchAppointments = (date: string, department?: string) =>
  apiGet<Appointment[]>(
    "patient-flow",
    `/appointments?date=${date}${department ? `&department=${encodeURIComponent(department)}` : ""}`,
  );

export const fetchAvailability = (physicianId: string, date: string) =>
  apiGet<{ slots: string[] }>("patient-flow", `/appointments/availability?physicianId=${physicianId}&date=${date}`);

export const bookAppointment = (booking: {
  patientId: string;
  department: string;
  physicianId: string;
  scheduledAt: string;
  purpose: string;
}) => apiPost<Appointment>("patient-flow", "/appointments", booking);

export const checkInAppointment = (id: string) => apiPost<Appointment>("patient-flow", `/appointments/${id}/check-in`, {});

export const updateAppointment = (id: string, status: "Completed" | "Cancelled" | "NoShow") =>
  apiPost<Appointment>("patient-flow", `/appointments/${id}/status`, { status });

export const fetchQueue = () => apiGet<Appointment[]>("patient-flow", "/queue");

// ─── ward, room, and bed setup (System Administrator, US-44) ───

export const createWard = (ward: { id: string; name: string; type: string; department: string; color: string }) =>
  apiPost<{ id: string }>("patient-flow", "/config/wards", ward);

export const updateWard = (id: string, changes: { name?: string; department?: string; isActive?: boolean }) =>
  apiRequest<{ id: string }>("patient-flow", `/config/wards/${id}`, { method: "PATCH", body: JSON.stringify(changes) });

export const addRoom = (wardId: string, code: string, beds: number) =>
  apiPost<{ id: string }>("patient-flow", `/config/wards/${wardId}/rooms`, { code, beds });

export const addBeds = (roomId: string, count: number) =>
  apiPost<{ roomId: string }>("patient-flow", `/config/rooms/${roomId}/beds`, { count });

export const setBedStatus = (bedId: string, status: "Available" | "Cleaning" | "Maintenance", reason: string) =>
  apiRequest<{ bedId: string }>("patient-flow", `/config/beds/${bedId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });

export interface BedHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  admissionId: string | null;
  reason: string;
  changedById: string;
  changedAt: string;
}

export const fetchBedHistory = (bedId: string) => apiGet<BedHistoryEntry[]>("patient-flow", `/config/beds/${bedId}/history`);
