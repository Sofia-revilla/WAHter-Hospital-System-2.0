// Shapes shared by constants.ts, DataContext, and the tab views. The services
// return these same shapes, so API responses drop straight into state.

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
  // latest MEWS from charted vitals (random in the offline mock)
  mewsScore: number;
  admittedAt: string;
  avatar: string;
}

// An orderable drug. Pharmacy is dispensing-only, so there's no stock here.
export interface FormularyItem {
  id: string;
  name: string;
  form: string;
  // RA 9165 dangerous drug; dispensing needs a second approval
  isControlled: boolean;
}

export type MedicationOrderStatus = "Pending" | "Dispensed" | "Review";

export interface MedicationOrder {
  id: string;
  patientId: string;
  patientName: string;
  drug: string;
  dose: string;
  frequency: string;
  route?: string | null;
  duration?: string | null;
  status: MedicationOrderStatus;
  prescribedBy: string;
  orderedAt: string;
  // RA 9165 dangerous drug (from the formulary); needs step-up to dispense
  isControlled?: boolean;
  dispensedQuantity?: number | null;
  dispensedBy?: string | null;
  dispensedAt?: string | null;
}

// One line on a patient's account, posted by Billing from a bus event (UC-12)
export interface Charge {
  id: string;
  patientId: string;
  patientName: string;
  code: string | null;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  // no charge master price yet; billing staff set it before the statement
  isUnpriced: boolean;
  // the event type that caused it, e.g. "patient.admitted"
  source: string;
  postedAt: string;
}

export interface LabTest {
  id: string;
  patientId?: string;
  patient: string;
  test: string;
  priority: "Urgent" | "Routine";
  status: "Pending" | "In-Progress" | "Completed";
  // display string ("10m ago"); from the API it's worked out from orderedAt
  time: string;
  isCritical?: boolean;
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


// The portals on the login screen. Stored names are short ("IT", "Billing");
// ROLE_LABELS has what staff see. Lab/Radiology, Registrar, and Hospital
// Admin portals come later.
export type StaffRole = "Doctor" | "Nurse" | "Pharmacist" | "Billing" | "IT";

export const ROLE_LABELS: Record<StaffRole, string> = {
  Doctor: "Doctor",
  Nurse: "Nurse",
  Pharmacist: "Pharmacist",
  Billing: "Billing Staff",
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
  // set by Notifications when a High alert sits unacknowledged too long
  escalatedAt?: string;
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
  // "System" for things no person did, like charge capture
  role: HospitalRole | "System";
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
