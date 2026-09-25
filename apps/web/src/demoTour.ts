// Guided tour content for demo logins (Try Demo on the login screen).
// This file and constants.ts are the only places static demo copy lives.

import type { TabId } from "./navigation";
import type { StaffRole } from "./types";

export interface DemoStep {
  tab: TabId;
  title: string;
  desc: string;
}

export const DEMO_STEPS: Record<StaffRole, DemoStep[]> = {
  Doctor: [
    {
      tab: "dashboard",
      title: "Hospital Dashboard",
      desc: "Your real-time command center: census, bed occupancy, MEWS alerts, and the day's revenue, with a live feed of the patients under your care.",
    },
    {
      tab: "patients",
      title: "Patient Directory",
      desc: "Full master list of admitted patients. Search by name, patient ID, or department and filter by status to find who you need in seconds.",
    },
    {
      tab: "prescription",
      title: "E-Prescribing",
      desc: "Issue digital prescriptions linked to patient records. Pick the patient, the drug, dose, frequency, and route, then e-sign and send it straight to the pharmacy.",
    },
    {
      tab: "pharmacy",
      title: "Pharmacy Queue",
      desc: "Track all prescriptions pending dispensing, so you know when your orders have actually reached the patient.",
    },
    {
      tab: "lab",
      title: "Laboratory",
      desc: "View lab test requests you've ordered and follow them from the queue to released results, with urgent tests flagged in red.",
    },
    {
      tab: "rooms",
      title: "Bed Management",
      desc: "Real-time bed availability across all wards. See which wards have room before you admit, and open Smart Referral when the hospital is full.",
    },
    {
      tab: "profile",
      title: "Your Profile",
      desc: "Manage your clinician profile: department, license number, biography, and your on-duty status.",
    },
  ],
  Nurse: [
    {
      tab: "dashboard",
      title: "Ward Overview",
      desc: "Start your shift here: occupancy, MEWS alerts that need a bedside check, and a live feed of admitted patients sorted into cards you can scan quickly.",
    },
    {
      tab: "patients",
      title: "Patient Directory",
      desc: "Find any admitted patient by name, ID, or department and see their ward, bed, and current status before you do your rounds.",
    },
    {
      tab: "pharmacy",
      title: "Medication Queue",
      desc: "See which prescriptions are pending, dispensed, or under review, so you know what's ready to administer on your ward.",
    },
    {
      tab: "rooms",
      title: "Bed Management",
      desc: "Check free beds ward by ward, prepare for incoming admissions, and spot near-empty wards when you need to move a patient.",
    },
    {
      tab: "lab",
      title: "Laboratory",
      desc: "Follow specimens you've collected from the queue to released results, with urgent tests highlighted.",
    },
    {
      tab: "billing",
      title: "Billing Queue",
      desc: "See which patients still have pending balances, which helps when you coordinate discharges with the billing office.",
    },
    {
      tab: "profile",
      title: "Your Profile",
      desc: "Keep your nursing profile current: department, employee ID, biography, and your on-duty status for the shift.",
    },
  ],
  IT: [
    {
      tab: "architecture",
      title: "System Architecture",
      desc: "Monitor the stack at a glance: service status, a role-based access sandbox to test JWT guards, the JSONB record viewer, cache controls, and live container logs.",
    },
    {
      tab: "dashboard",
      title: "Hospital Dashboard",
      desc: "The same operations view clinicians see, so you can confirm data is flowing correctly across the system.",
    },
    {
      tab: "patients",
      title: "Patient Directory",
      desc: "Check that patient records, search, and filters behave correctly. Useful when staff report something missing.",
    },
    {
      tab: "pharmacy",
      title: "Pharmacy Module",
      desc: "Check that the dispensing queue and review flags work as expected for the pharmacy team.",
    },
    {
      tab: "lab",
      title: "Laboratory Module",
      desc: "Watch the lab worklist and testing slots, and catch integration issues before results reach the doctors.",
    },
    {
      tab: "rooms",
      title: "Bed Management",
      desc: "Review ward and bed configuration as it appears to staff. Facility structure changes start from here.",
    },
    {
      tab: "billing",
      title: "Billing & Claims",
      desc: "Confirm the billing queue and PhilHealth eClaims readiness indicators are reporting correctly.",
    },
    {
      tab: "inventory",
      title: "Inventory Management",
      desc: "Oversee medical supply levels, expiry watch, and reorder drafts across departments.",
    },
    {
      tab: "profile",
      title: "Your Profile",
      desc: "Manage your administrator profile, employee ID, and on-duty status.",
    },
  ],
};

export const TAB_FEATURES: Record<TabId, string[]> = {
  dashboard: [
    "Live bed occupancy stats",
    "Revenue & billing overview",
    "Active patient count",
    "Staff on duty tracker",
    "Admission trend charts",
  ],
  patients: [
    "Search & filter patients",
    "View full patient records",
    "Diagnosis & room details",
    "Assigned doctor info",
    "Patient history timeline",
  ],
  prescription: [
    "Issue new prescriptions",
    "Link to patient records",
    "Track prescription status",
    "Dosage & frequency details",
    "Pharmacy coordination",
  ],
  pharmacy: [
    "Pending dispensing queue",
    "Mark medications dispensed",
    "Flag items for review",
    "Prescription history log",
    "Send back to prescriber",
  ],
  lab: [
    "View test requests",
    "Pending & completed results",
    "Patient-linked diagnostics",
    "Result timestamps",
    "Follow-up tracking",
  ],
  rooms: [
    "Real-time bed availability",
    "Occupied vs available view",
    "Ward-by-ward breakdown",
    "Admission coordination",
    "Transfer management",
  ],
  billing: [
    "Patient invoice list",
    "Payment status tracking",
    "Billing history",
    "Linked to patient records",
    "Finance coordination",
  ],
  inventory: [
    "Medical supply levels",
    "Expiry date tracking",
    "Reorder alerts",
    "Department stock view",
    "Supply request log",
  ],
  architecture: [
    "Tech stack overview",
    "System component map",
    "Database & API status",
    "Infrastructure monitoring",
    "Security layer view",
  ],
  profile: [
    "Personal info management",
    "Department & license ID",
    "On-duty status toggle",
    "Biography editor",
    "Contact details",
  ],
};

export const TAB_EMOJI: Record<TabId, string> = {
  dashboard: "🏥",
  patients: "👥",
  prescription: "📋",
  pharmacy: "💊",
  lab: "🧪",
  rooms: "🛏️",
  billing: "💰",
  inventory: "📦",
  architecture: "🖥️",
  profile: "👤",
};
