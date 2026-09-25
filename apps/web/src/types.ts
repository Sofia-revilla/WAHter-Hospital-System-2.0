// Shapes shared by constants.ts, DataContext, and the tab views.
// Kept deliberately flat so a Supabase row maps onto them without a transform.

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
  // display string ("10m ago"), not a timestamp — fine until the lab worklist is live
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

export interface AdmissionTrendPoint {
  name: string;
  opd: number;
  ipd: number;
}
