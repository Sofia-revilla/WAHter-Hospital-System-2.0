// Shapes shared by constants.ts, DataContext, and the tab views.
// Kept deliberately flat so a Supabase row maps onto them without a transform.

export type PatientStatus = "Critical" | "Stable" | "Recovering" | "Discharged";

export type Department =
  | "ER"
  | "ICU"
  | "Medical Ward"
  | "Surgical Ward"
  | "Pediatrics"
  | "OB-Gyne";

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "M" | "F";
  department: Department;
  ward: string;
  bed: string;
  diagnosis: string;
  // ICD-10 code for the primary diagnosis, e.g. "J18.9"
  icd10: string;
  status: PatientStatus;
  // MEWS aggregate, 0–14. The dashboard shows it as "x/10" per the design.
  mews: number;
  admittedAt: string;
}

export type StockStatus = "Good" | "Low" | "Critical";

export interface InventoryItem {
  id: string;
  name: string;
  category: "Medication" | "Equipment" | "Surgical" | "Laboratory";
  quantity: number;
  capacity: number;
  unit: string;
  status: StockStatus;
  expiry: string | null;
}

export interface LabTest {
  id: string;
  patientId: string;
  patientName: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: "Routine" | "Urgent";
  status: "Pending" | "In Progress" | "Completed";
  requestedAt: string;
}

export interface Ward {
  id: string;
  name: string;
  floor: string;
  totalBeds: number;
  occupied: number;
}

export interface RevenuePoint {
  day: string;
  revenue: number;
}

export interface AdmissionTrendPoint {
  month: string;
  admissions: number;
  discharges: number;
}
