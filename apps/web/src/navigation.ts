// Tab registry: labels, sidebar icons, tooltip copy, and which roles see what.
// Adding a tab means one entry in TABS and adding its id to the roles that need it.

import {
  Bed,
  Database,
  DollarSign,
  FlaskConical,
  LayoutDashboard,
  Package,
  Pill,
  Receipt,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "./types";

export type TabId =
  | "dashboard"
  | "patients"
  | "prescription"
  | "pharmacy"
  | "lab"
  | "rooms"
  | "billing"
  | "inventory"
  | "architecture"
  | "profile";

interface TabConfig {
  // topbar title; the sidebar shows the tab id itself, uppercased
  label: string;
  icon: LucideIcon;
  description: string;
}

export const TABS: Record<TabId, TabConfig> = {
  dashboard: {
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Census, bed occupancy, MEWS alerts, and revenue at a glance.",
  },
  patients: {
    label: "Patients",
    icon: Users,
    description: "Search the patient registry and open inpatient records.",
  },
  prescription: {
    label: "E-Prescribing",
    icon: Receipt,
    description: "Write and e-sign medication orders for admitted patients.",
  },
  pharmacy: {
    label: "Pharmacy",
    icon: Pill,
    description: "Prescription worklist and medication dispensing.",
  },
  lab: {
    label: "Laboratory",
    icon: FlaskConical,
    description: "Lab and radiology requests, results, and turnaround.",
  },
  rooms: {
    label: "Bed Management",
    icon: Bed,
    description: "Ward occupancy, bed assignment, and smart referral.",
  },
  billing: {
    label: "Billing",
    icon: DollarSign,
    description: "Patient charges, statements of account, and PhilHealth claims.",
  },
  inventory: {
    label: "Inventory",
    icon: Package,
    description: "Medicine and supply levels, expiry watch.",
  },
  architecture: {
    label: "Architecture",
    icon: Database,
    description: "Service health, logs, and the auth sandbox.",
  },
  profile: {
    label: "Profile",
    icon: User,
    description: "Your staff badge and account details.",
  },
};

export const ROLE_TABS: Record<StaffRole, TabId[]> = {
  Doctor: ["dashboard", "patients", "prescription", "pharmacy", "lab", "rooms", "billing", "profile"],
  Nurse: ["dashboard", "patients", "pharmacy", "rooms", "lab", "billing", "profile"],
  IT: [
    "architecture",
    "dashboard",
    "patients",
    "pharmacy",
    "lab",
    "rooms",
    "billing",
    "inventory",
    "profile",
  ],
};
