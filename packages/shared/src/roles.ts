// The one place staff roles are named. Keys never change; labels are what
// staff see, and follow the use case diagram. The paper still says "Patient
// Registrar" and "Doctor" in places: those are the same roles as Admitting
// Clerk and Physician (see ROLE_ALIASES).
//
// Pure data, no Node or Nest imports, so the web app can import it through
// "@wahter/shared/roles" without pulling the server code into the browser.

export const STAFF_ROLES = [
  "AdmittingClerk",
  "Physician",
  "Nurse",
  "Pharmacist",
  "LaboratoryStaff",
  "RadiologyStaff",
  "BillingStaff",
  "HospitalAdministrator",
  "SystemAdministrator",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  AdmittingClerk: "Admitting Clerk",
  Physician: "Physician",
  Nurse: "Nurse",
  Pharmacist: "Pharmacist",
  LaboratoryStaff: "Laboratory Staff",
  RadiologyStaff: "Radiology Staff",
  BillingStaff: "Billing Staff",
  HospitalAdministrator: "Hospital Administrator",
  SystemAdministrator: "System Administrator",
};

// Older names from the paper and earlier builds, mapped to today's role
export const ROLE_ALIASES: Record<string, StaffRole> = {
  "Patient Registrar": "AdmittingClerk",
  Doctor: "Physician",
  "IT Admin": "SystemAdministrator",
  "Ancillary Staff": "LaboratoryStaff",
};

// Laboratory and Radiology Staff share one portal (the diagram's Ancillary Staff)
export const ANCILLARY_ROLES: StaffRole[] = ["LaboratoryStaff", "RadiologyStaff"];

// Roles that work with patients at the bedside or on the chart
export const CLINICAL_ROLES: StaffRole[] = ["Physician", "Nurse"];

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}
