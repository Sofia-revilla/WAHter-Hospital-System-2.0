import type { StaffRole } from "@/types";

// Applies the Dr./RN prefix the ward staff expect to see on screen. Checks the
// raw name first so someone who typed "Dr. Reyes" doesn't become "Dr. Dr. Reyes".
export function formatDisplayName(rawName: string, role: StaffRole) {
  const name = rawName.trim();
  if (role === "Doctor" && !name.toLowerCase().startsWith("dr.")) return `Dr. ${name}`;
  if (role === "Nurse" && !name.toLowerCase().startsWith("rn ")) return `RN ${name}`;
  return name;
}

// Who can do what, per the paper's use case actors. The prototype only has
// Doctor, Nurse, and IT portals, so actions owned by roles we haven't built
// yet (Pharmacist, Lab/Radiology staff, Billing staff) are empty here and show
// up read-only. Add the role to the list once its portal exists.
const PERMISSIONS = {
  // UC-10: Pharmacist only
  dispenseMedication: [],
  // UC-11.1 / 11.2: Ancillary (lab & radiology) staff only
  processLabResult: [],
  // UC-12 / UC-13: Billing staff only
  manageBilling: [],
  // UC-04: Patient Registrar or Nurse
  admitPatient: ["Nurse"],
  // UC-11 step 1: the physician places diagnostic orders
  orderDiagnosticTest: ["Doctor"],
  // UC-05: Nurse or Physician
  chartVitals: ["Doctor", "Nurse"],
} satisfies Record<string, StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: StaffRole, permission: Permission) {
  return (PERMISSIONS[permission] as StaffRole[]).includes(role);
}
