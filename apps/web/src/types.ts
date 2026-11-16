// Shapes shared by DataContext and the tab views. The services send
// reference IDs only (a patient ID, a provider ID); DataContext fills in the
// display names below from the Patient Registry and the provider registry, so
// the screens can keep showing names without any service holding a copy.

import type { StaffRole } from "@wahter/shared/roles";
import type { RiskLevel, VitalSigns } from "./lib/mews";

export { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@wahter/shared/roles";

export type PatientStatus = "Critical" | "Stable" | "Recovering" | "Observation";

export { DEPARTMENTS, type Department } from "@wahter/shared/departments";
import type { Department } from "@wahter/shared/departments";

// A census row: the open encounter from Clinical Care plus the identity from
// the Patient Registry
export interface Patient {
  id: string;
  encounterId: string;
  name: string;
  age: number;
  gender: "Male" | "Female";
  birthDate: string;
  department: Department;
  status: PatientStatus;
  // latest MEWS from charted vitals
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
  prescribedById: string;
  // filled in from the provider registry
  prescribedBy: string;
  orderedAt: string;
  // RA 9165 dangerous drug (from the formulary); needs step-up to dispense
  isControlled?: boolean;
  dispensedQuantity?: number | null;
  dispensedById?: string | null;
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
  // the event type that caused it, e.g. "flow.patient.admitted"
  source: string;
  postedAt: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  // filled in from the Patient Registry
  patient: string;
  orderedById: string;
  test: string;
  priority: "Urgent" | "Routine";
  status: "Pending" | "In-Progress" | "Completed";
  // display string ("10m ago"), worked out from orderedAt
  time: string;
  isCritical?: boolean;
}

// A ward's head counts, worked out from the bed board's real beds
export interface Ward {
  id: string;
  name: string;
  type: "Male" | "Female" | "Specialized" | "Children";
  department: string;
  capacity: number;
  occupied: number;
  available: number;
  // hex accent for the ward card and bed grid
  color: string;
}

export interface RevenuePoint {
  name: string;
  revenue: number;
}

export interface StaffProfile {
  name: string;
  role: StaffRole;
  department: string;
  license: string;
}

// One charted set of vitals with the MEWS computed from it (UC-03).
export interface VitalsRecord {
  id: string;
  patientId: string;
  recordedAt: string;
  recordedById: string;
  recordedBy: string;
  vitals: VitalSigns;
  mewsScore: number;
  risk: RiskLevel;
  // true when the nurse confirmed an out-of-range reading instead of fixing it
  hadImplausibleReading: boolean;
}

// Raised automatically on a Medium or High MEWS (UC-03 6a, US-32). Never
// edited after acknowledgment, only closed.
export interface MewsAlert {
  id: string;
  vitalsId: string;
  patientId: string;
  patientName: string;
  mewsScore: number;
  risk: "Medium" | "High";
  raisedAt: string;
  acknowledgedAt?: string;
  acknowledgedById?: string;
  acknowledgedBy?: string;
  note?: string;
  // "false alarm / data correction needed"
  isFalseAlarm?: boolean;
  // set by Notifications when a High alert sits unacknowledged too long
  escalatedAt?: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  role: StaffRole;
  department: string;
  status: "Active" | "Deactivated";
  lastLogin: string;
}

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "ACCESS_DENIED",
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "EXPORT",
  "AUDIT_QUERY",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEntry {
  id: string;
  time: string;
  actorId: string | null;
  actor: string;
  // the role's label at the time, or "System" for things no person did
  role: string;
  action: AuditAction;
  outcome: "Success" | "Failure" | "Denied";
  // what was touched, by ID only (never clinical details)
  resource: string;
}

export type AdmissionType = "Direct admit" | "ER-to-ward transfer" | "Scheduled";

// An open admission and the bed it's in now (UC-02). A transfer moves the
// same admission to another bed (US-8).
export interface BedAssignment {
  admissionId: string;
  patientId: string;
  wardId: string | null;
  bedId: string | null;
  bedCode: string | null;
  admissionType: AdmissionType;
  admittingDiagnosis: string;
  attendingPhysicianId: string;
  attendingPhysician: string;
  admittedById: string;
  admittedBy: string;
  admittedAt: string;
  status: "Admitted" | "ReadyForDischarge" | "Discharged";
}

// One entry in the provider registry (Access & Provider Registry)
export interface Provider {
  id: string;
  name: string;
  role: StaffRole;
  department: string;
  license: string | null;
}
