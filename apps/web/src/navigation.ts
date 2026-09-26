// Tab registry: labels, sidebar icons, tooltip copy, and which roles see what.
// Adding a tab means one entry in TABS and adding its id to the roles that need it.

import {
  Bed,
  Database,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  ShieldCheck,
  User,
  Users,
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
  | "architecture"
  | "staff"
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
    services: ["clinical-records", "scheduling", "notifications", "orders-diagnostics"],
  },
  patients: {
    label: "Patients",
    icon: Users,
    description: "Search the patient registry and open inpatient records.",
    services: ["clinical-records", "scheduling"],
  },
  prescription: {
    label: "E-Prescribing",
    icon: Receipt,
    description: "Write and e-sign medication orders for admitted patients.",
    services: ["orders-diagnostics", "clinical-records"],
  },
  pharmacy: {
    label: "Pharmacy",
    icon: Pill,
    description: "Prescription worklist and medication dispensing.",
    services: ["orders-diagnostics"],
  },
  lab: {
    label: "Laboratory",
    icon: FlaskConical,
    description: "Lab and radiology requests, results, and turnaround.",
    services: ["orders-diagnostics", "clinical-records"],
  },
  rooms: {
    label: "Bed Management",
    icon: Bed,
    description: "Ward occupancy, bed assignment, and smart referral.",
    services: ["scheduling", "clinical-records"],
  },
  architecture: {
    label: "Architecture",
    icon: Database,
    description: "Service health, the event bus, and the access sandbox.",
    services: [],
  },
  staff: {
    label: "Staff & Access",
    icon: ShieldCheck,
    description: "Staff accounts, roles, and the audit log.",
    services: [],
  },
  profile: {
    label: "Profile",
    icon: User,
    description: "Your staff badge and account details.",
    services: [],
  },
};

export const ROLE_TABS: Record<StaffRole, TabId[]> = {
  // Billing is for Billing Staff and the Hospital Admin (UC-12/13), so the
  // clinical portals don't get it
  Doctor: ["dashboard", "patients", "prescription", "pharmacy", "lab", "rooms", "profile"],
  Nurse: ["dashboard", "patients", "pharmacy", "rooms", "lab", "profile"],
  // The paper's IT portal has no clinical modules and no patient data
  // (RA 10173), so IT gets system screens only. No inventory tab either:
  // no FSA or use case covers stock management.
  IT: ["architecture", "staff", "profile"],
};
