// Every route Kong opens, and which roles may use it. This one table drives
// both the generated Kong config (generate.mjs → kong.template.yml) and the
// gateway tests (tests/gateway), so the two can't drift apart.
//
// The roles match each service's @Roles guards; Kong checks them first so a
// wrong role is turned away at the edge, and the guard checks again behind it.
// A path nobody listed here gets Kong's 404: there's no catch-all route.
//
// path: a plain prefix, or "~" + regex for paths with an ID in the middle.
// sample: a concrete URL the tests call for a regex path.

const ALL_STAFF = [
  "AdmittingClerk",
  "Physician",
  "Nurse",
  "Pharmacist",
  "LaboratoryStaff",
  "RadiologyStaff",
  "BillingStaff",
  "HospitalAdministrator",
  "SystemAdministrator",
];
const BEDSIDE = ["Physician", "Nurse"];
const PATIENT_READERS = [
  "AdmittingClerk",
  "Physician",
  "Nurse",
  "Pharmacist",
  "LaboratoryStaff",
  "RadiologyStaff",
  "BillingStaff",
];

export const ROLES = ALL_STAFF;

export const SERVICES = [
  "access-provider-registry",
  "patient-registry",
  "patient-flow",
  "clinical-care",
  "diagnostics",
  "pharmacy",
  "billing-revenue-cycle",
  "interoperability-reporting",
  "notifications",
  "audit-log",
];

// No token needed: sign-in, health checks, API docs. Everything else needs a
// valid token AND one of the listed roles.
export const PUBLIC_PATHS = {
  "access-provider-registry": [
    "/api/access-provider-registry/auth/login",
    "/api/access-provider-registry/auth/verify",
    "/api/access-provider-registry/auth/demo",
    "/api/access-provider-registry/auth/refresh",
  ],
};

export const ROUTES = [
  // ─── Access & Provider Registry (UC-08) ───
  { service: "access-provider-registry", name: "logout", methods: ["POST"], path: "/api/access-provider-registry/auth/logout", roles: ALL_STAFF },
  { service: "access-provider-registry", name: "accounts", methods: ["GET", "POST", "PATCH"], path: "/api/access-provider-registry/accounts", roles: ["SystemAdministrator"] },
  { service: "access-provider-registry", name: "approvals", methods: ["GET", "POST"], path: "/api/access-provider-registry/approval-requests", roles: ["SystemAdministrator"] },
  { service: "access-provider-registry", name: "providers", methods: ["GET"], path: "/api/access-provider-registry/providers", roles: ALL_STAFF },

  // ─── Patient Registry (UC-01) ───
  // reading and searching (US-2, US-5); the System Administrator never sees patients here
  { service: "patient-registry", name: "patients-read", methods: ["GET"], path: "/api/patient-registry/patients", roles: PATIENT_READERS },
  // registering, matching, and correcting: the UC-01 actors
  { service: "patient-registry", name: "patients-write", methods: ["POST", "PATCH"], path: "/api/patient-registry/patients", roles: ["AdmittingClerk", "Nurse"] },
  // US-3, US-4: flagging two records as maybe the same person
  { service: "patient-registry", name: "duplicate-reports", methods: ["POST"], path: "~/api/patient-registry/patients/[^/]+/duplicate-reports$", sample: "/api/patient-registry/patients/WAH-2026-00001/duplicate-reports", roles: ["AdmittingClerk", "Nurse", "Physician"] },
  // UC-08 4b: only the System Administrator resolves them
  { service: "patient-registry", name: "identity-reviews", methods: ["GET", "POST"], path: "/api/patient-registry/identity-reviews", roles: ["SystemAdministrator"] },

  // ─── Patient Flow (UC-02) ───
  { service: "patient-flow", name: "wards", methods: ["GET"], path: "/api/patient-flow/wards", roles: ["AdmittingClerk", ...BEDSIDE] },
  { service: "patient-flow", name: "admissions-read", methods: ["GET"], path: "/api/patient-flow/admissions", roles: ["AdmittingClerk", ...BEDSIDE] },
  { service: "patient-flow", name: "admissions-write", methods: ["POST"], path: "/api/patient-flow/admissions", roles: ["AdmittingClerk", "Nurse"] },
  // for other services only (Interoperability & Reporting), never from a browser
  { service: "patient-flow", name: "admissions-history", methods: ["GET"], path: "/api/patient-flow/admissions/history", internalOnly: true },

  // ─── Clinical Care (UC-03) ───
  { service: "clinical-care", name: "encounters", methods: ["GET"], path: "/api/clinical-care/encounters", roles: BEDSIDE },
  { service: "clinical-care", name: "vitals", methods: ["GET", "POST"], path: "/api/clinical-care/vitals", roles: BEDSIDE },

  // ─── Diagnostics (UC-05) ───
  { service: "diagnostics", name: "orders-read", methods: ["GET"], path: "/api/diagnostics/diagnostic-orders", roles: [...BEDSIDE, "LaboratoryStaff", "RadiologyStaff"] },
  { service: "diagnostics", name: "orders-write", methods: ["POST"], path: "/api/diagnostics/diagnostic-orders", roles: ["Physician"] },

  // ─── Pharmacy (UC-04) ───
  { service: "pharmacy", name: "formulary", methods: ["GET"], path: "/api/pharmacy/formulary", roles: [...BEDSIDE, "Pharmacist"] },
  { service: "pharmacy", name: "orders-read", methods: ["GET"], path: "/api/pharmacy/medication-orders", roles: [...BEDSIDE, "Pharmacist"] },
  { service: "pharmacy", name: "orders-write", methods: ["POST"], path: "/api/pharmacy/medication-orders", roles: ["Physician"] },
  { service: "pharmacy", name: "dispense", methods: ["POST"], path: "~/api/pharmacy/medication-orders/[^/]+/dispense$", sample: "/api/pharmacy/medication-orders/RX-1003/dispense", roles: ["Pharmacist"] },

  // ─── Billing & Revenue Cycle (UC-06): financial data stays with billing ───
  { service: "billing-revenue-cycle", name: "charges", methods: ["GET", "POST"], path: "/api/billing-revenue-cycle/charges", roles: ["BillingStaff"] },
  { service: "billing-revenue-cycle", name: "accounts", methods: ["GET"], path: "/api/billing-revenue-cycle/accounts", roles: ["BillingStaff"] },

  // ─── Interoperability & Reporting (UC-07, UC-09) ───
  { service: "interoperability-reporting", name: "fhir", methods: ["GET"], path: "/api/interoperability-reporting/fhir", roles: BEDSIDE },
  { service: "interoperability-reporting", name: "reports", methods: ["GET", "POST"], path: "/api/interoperability-reporting/reports", roles: ["HospitalAdministrator"] },

  // ─── Notifications (UC-03 6a) ───
  { service: "notifications", name: "alerts", methods: ["GET", "POST"], path: "/api/notifications/alerts", roles: BEDSIDE },

  // ─── Audit Log (UC-08) ───
  { service: "audit-log", name: "entries", methods: ["GET"], path: "/api/audit-log/entries", roles: ["SystemAdministrator"] },
];
