// Tab registry: labels, sidebar icons, tooltip copy, and which roles see what.
// Adding a tab means one entry in TABS and adding its id to the roles that need it.

import {
  Activity,
  Bed,
  BadgeCheck,
  ScrollText,
  Search,
  UserPlus,
  UserSearch,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  ShieldCheck,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ServiceName } from "./lib/api";
import type { StaffRole } from "./types";

export type TabId =
  | "dashboard"
  | "patients"
  | "prescription"
  | "pharmacy"
  | "lab"
  | "rooms"
  | "billing"
  | "architecture"
  | "registration"
  | "patient-search"
  | "identity-review"
  | "users"
  | "providers"
  | "audit"
  | "profile";

interface TabConfig {
  // topbar title; the sidebar shows the tab id itself, uppercased
  label: string;
  icon: LucideIcon;
  description: string;
  // services whose data this tab shows, for the "service offline" notice.
  // Tabs that load their own data (Staff & Access, Architecture) handle it themselves.
  services: ServiceName[];
}

export const TABS: Record<TabId, TabConfig> = {
  dashboard: {
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Census, bed occupancy, MEWS alerts, and patient risk at a glance.",
    services: ["clinical-care", "patient-flow", "notifications", "diagnostics", "patient-registry"],
  },
  patients: {
    label: "Patients",
    icon: Users,
    description: "Search the patient registry and open inpatient records.",
    services: ["clinical-care", "patient-flow", "patient-registry"],
  },
  prescription: {
    label: "E-Prescribing",
    icon: Receipt,
    description: "Write and e-sign medication orders for admitted patients.",
    services: ["pharmacy", "clinical-care", "patient-registry"],
  },
  pharmacy: {
    label: "Pharmacy",
    icon: Pill,
    description: "Prescription worklist and medication dispensing.",
    services: ["pharmacy", "patient-registry"],
  },
  lab: {
    label: "Laboratory",
    icon: FlaskConical,
    description: "Lab and radiology requests, results, and turnaround.",
    services: ["diagnostics", "clinical-care", "patient-registry"],
  },
  rooms: {
    label: "Bed Management",
    icon: Bed,
    description: "Ward occupancy, bed assignment, and smart referral.",
    services: ["patient-flow", "clinical-care", "patient-registry"],
  },
  billing: {
    label: "Billing",
    icon: Wallet,
    description: "Patient accounts, captured charges, and unpriced items.",
    services: ["billing-revenue-cycle", "patient-registry"],
  },
  architecture: {
    label: "System Health",
    icon: Activity,
    description: "Live health of the ten services, the event bus, and the access sandbox.",
    services: [],
  },
  registration: {
    label: "Registration",
    icon: UserPlus,
    description: "Search the patient registry, then register or update a patient.",
    services: ["patient-registry"],
  },
  "patient-search": {
    label: "Patient Search",
    icon: Search,
    description: "Find a patient by MPI number, PhilHealth PIN, birth date, or name.",
    services: ["patient-registry"],
  },
  "identity-review": {
    label: "Identity Review",
    icon: UserSearch,
    description: "Possible duplicate patient records to merge or keep apart.",
    services: [],
  },
  users: {
    label: "Users and Roles",
    icon: ShieldCheck,
    description: "Create, change, disable, and restore staff accounts; approve role changes.",
    services: [],
  },
  providers: {
    label: "Provider Registry",
    icon: BadgeCheck,
    description: "Every provider, their role, department, and PRC license.",
    services: [],
  },
  audit: {
    label: "Audit Log",
    icon: ScrollText,
    description: "Search and export the append-only audit trail.",
    services: [],
  },
  profile: {
    label: "Profile",
    icon: User,
    description: "Your staff badge and account details.",
    services: [],
  },
};

// An empty list means the role's portal isn't built yet; those roles don't
// show up on the login screen (see PORTAL_ROLES).
export const ROLE_TABS: Record<StaffRole, TabId[]> = {
  // UC-01. TODO(Phase 3): Scheduling and Queue, Admission and Bed Board
  AdmittingClerk: ["registration", "patient-search", "profile"],
  Physician: ["dashboard", "patients", "prescription", "pharmacy", "lab", "rooms", "profile"],
  // the Nurse is UC-01's secondary actor, so she can register too
  Nurse: ["dashboard", "patients", "registration", "pharmacy", "rooms", "lab", "profile"],
  // dispensing is the pharmacist's only use case, so the portal is the worklist
  Pharmacist: ["pharmacy", "profile"],
  // TODO(Phase 6): the Ancillary portal (worklist, result entry, release)
  LaboratoryStaff: [],
  RadiologyStaff: [],
  // UC-06: billing staff see accounts and charges, never clinical tabs
  // US-5: billing looks patients up to match them to an invoice
  BillingStaff: ["billing", "patient-search", "profile"],
  // TODO(Phase 9): Hospital Reports and DOH Exports
  HospitalAdministrator: [],
  // No clinical modules and no patient data (RA 10173), and no inventory tab
  // (paper Limitation d)
  // TODO(Phase 3): Wards Rooms and Beds; (Phase 4) Correction Requests;
  // (Phase 10) Data Exchange
  SystemAdministrator: ["users", "providers", "identity-review", "audit", "architecture", "profile"],
};

export const PORTAL_ROLES = (Object.keys(ROLE_TABS) as StaffRole[]).filter((role) => ROLE_TABS[role].length > 0);
