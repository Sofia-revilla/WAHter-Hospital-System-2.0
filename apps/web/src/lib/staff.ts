import type { StaffRole } from "@/types";

// Applies the Dr./RN prefix the ward staff expect to see on screen. Checks the
// raw name first so someone who typed "Dr. Reyes" doesn't become "Dr. Dr. Reyes".
export function formatDisplayName(rawName: string, role: StaffRole) {
  const name = rawName.trim();
  if (role === "Physician" && !name.toLowerCase().startsWith("dr.")) return `Dr. ${name}`;
  if (role === "Nurse" && !name.toLowerCase().startsWith("rn ")) return `RN ${name}`;
  return name;
}

// Who can do what, per the use case diagram's actors. The services check the
// same rules; this only decides which buttons a screen shows.
const PERMISSIONS = {
  // UC-04: Pharmacist only
  dispenseMedication: ["Pharmacist"],
  // UC-05: Laboratory and Radiology Staff record results
  processLabResult: ["LaboratoryStaff", "RadiologyStaff"],
  // UC-06: Billing Staff only
  manageBilling: ["BillingStaff"],
  // UC-02: Admitting Clerk or Nurse
  admitPatient: ["AdmittingClerk", "Nurse"],
  // UC-05 steps 1 to 4: the physician places diagnostic orders
  orderDiagnosticTest: ["Physician"],
  // UC-03: Nurse or Physician
  chartVitals: ["Physician", "Nurse"],
} satisfies Record<string, StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: StaffRole, permission: Permission) {
  return (PERMISSIONS[permission] as StaffRole[]).includes(role);
}
