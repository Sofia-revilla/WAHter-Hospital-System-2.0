// Shapes shared by constants.ts, DataContext, and the tab views.
// Kept deliberately flat so a Supabase row maps onto them without a transform.

import type { RiskLevel, VitalSigns } from "./lib/mews";

export type PatientStatus = "Critical" | "Stable" | "Recovering" | "Observation";

export type Department = "Internal Medicine" | "ICU" | "Surgical Suite" | "ER" | "Pediatrics";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female";
  department: Department;
  status: PatientStatus;
  // random in the prototype, not derived from vitals (see generateRandomPatient)
  mewsScore: number;
  admittedAt: string;
  avatar: string;
}

export type StockStatus = "Good" | "Low" | "Critical";

export interface InventoryItem {
  id: string;
  name: string;
  category: "Medication" | "Supply";
  stock: number;
  minStock: number;
  unit: string;
  status: StockStatus;
}

export interface LabTest {
  id: string;
  patient: string;
  test: string;
  priority: "Urgent" | "Routine";
  status: "Pending" | "In-Progress" | "Completed";
  // display string ("10m ago"), not a timestamp. Fine until the lab worklist is live
  time: string;
}

export interface Ward {
  id: string;
  name: string;
  type: "Male" | "Female" | "Specialized" | "Children";
  capacity: number;
  occupied: number;
  // hex accent for the ward card and bed grid
  color: string;
}

export interface RevenuePoint {
  name: string;
  revenue: number;
}

// Admissions vs discharges for one period on the dashboard chart
// (paper user story 39: daily admission and discharge reports).
export interface PatientFlowPoint {
  label: string;
  admissions: number;
  discharges: number;
}

// Only the three portals from the login screen exist in the prototype.
// The IT role is stored as "IT" but shown as "IT Admin" on screen.
export type StaffRole = "Doctor" | "Nurse" | "IT";

export const ROLE_LABELS: Record<StaffRole, string> = {
  Doctor: "Doctor",
  Nurse: "Nurse",
  IT: "IT Admin",
};

export interface StaffProfile {
  name: string;
  role: StaffRole;
  department: string;
  license: string;
}

// One charted set of vitals (UC-05.1) with the MEWS computed from it (UC-05.2).
export interface VitalsRecord {
  id: string;
  patientId: string;
  recordedAt: string;
  recordedBy: string;
  vitals: VitalSigns;
  mewsScore: number;
  risk: RiskLevel;
  // true when the nurse confirmed an out-of-range reading instead of fixing it
  hadImplausibleReading: boolean;
}

// Raised automatically on a Medium or High MEWS (UC-08). Never edited after
// acknowledgment, only closed.
export interface MewsAlert {
  id: string;
  vitalsId: string;
  patientId: string;
  patientName: string;
  mewsScore: number;
  risk: "Medium" | "High";
  raisedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  note?: string;
  // "false alarm / data correction needed" from UC-08 extension 4a
  isFalseAlarm?: boolean;
}

// Every role from the paper's user classes (TABLE XIII), including the ones
// that don't have a portal in the prototype yet.
export type HospitalRole =
  | "Physician"
  | "Nurse"
  | "Laboratory Staff"
  | "Radiology Staff"
  | "Pharmacist"
  | "Billing Staff"
  | "Patient Registrar"
  | "Hospital Administrator"
  | "System Administrator";

export interface StaffAccount {
  id: string;
  name: string;
  role: HospitalRole;
  department: string;
  status: "Active" | "Deactivated";
  lastLogin: string;
}

export type AuditAction = "LOGIN" | "VIEW" | "CREATE" | "UPDATE" | "EXPORT" | "AUDIT_QUERY";

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  role: HospitalRole;
  action: AuditAction;
  // what was touched, by ID only (never clinical details)
  resource: string;
}

export type AdmissionType = "Direct admit" | "ER-to-ward transfer";

// A patient placed in a specific bed (UC-04). One active assignment per
// patient; assigning again moves them (a transfer, user story 8).
export interface BedAssignment {
  patientId: string;
  wardId: string;
  // 0-based index into the ward's bed grid
  bedIndex: number;
  admissionType: AdmissionType;
  attendingPhysician: string;
  assignedBy: string;
  assignedAt: string;
}
