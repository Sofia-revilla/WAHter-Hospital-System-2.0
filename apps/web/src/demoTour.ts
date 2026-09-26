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
      desc: "Your real-time command center: census, bed occupancy, and patient risk by department, plus MEWS alerts you can acknowledge and a live feed of your patients' risk levels.",
    },
    {
      tab: "patients",
      title: "Patient Directory",
      desc: "Full master list of admitted patients. Search by name, ID, or department, check each patient's MEWS, and chart vitals when you're at the bedside.",
    },
    {
      tab: "prescription",
      title: "E-Prescribing",
      desc: "Issue digital prescriptions linked to patient records. Pick the patient, the drug, dose, frequency, and route, then e-sign and send it straight to the pharmacy.",
    },
    {
      tab: "pharmacy",
      title: "Pharmacy Queue",
      desc: "Track your prescriptions through the pharmacy queue, so you know when an order has actually been dispensed.",
    },
    {
      tab: "lab",
      title: "Laboratory",
      desc: "Order lab tests and radiology procedures, then follow them from the queue to released results, with urgent ones flagged in red.",
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
      desc: "Start your shift here: acknowledge MEWS alerts that need a bedside check, and scan the live feed of admitted patients with their risk levels.",
    },
    {
      tab: "patients",
      title: "Patient Directory",
      desc: "Find any admitted patient and chart their vital signs. MEWS is calculated as you type, and a Medium or High score sends an alert right away.",
    },
    {
      tab: "pharmacy",
      title: "Medication Queue",
      desc: "See which prescriptions are pending, dispensed, or under review, so you know what's ready to administer on your ward. Dispensing itself is done by the pharmacist.",
    },
    {
      tab: "rooms",
      title: "Bed Management",
      desc: "Check free beds ward by ward, admit incoming patients, and spot near-empty wards when you need to move someone.",
    },
    {
      tab: "lab",
      title: "Laboratory",
      desc: "Follow tests from the queue to released results, with urgent ones highlighted. Results are released by lab and radiology staff.",
    },
    {
      tab: "profile",
      title: "Your Profile",
      desc: "Keep your nursing profile current: department, employee ID, biography, and your on-duty status for the shift.",
    },
  ],
  Pharmacist: [
    {
      tab: "pharmacy",
      title: "Dispensing Worklist",
      desc: "Every physician order lands here. Check it against the order, enter the quantity (partial fills are fine), and dispense. Billing charges the drug on its own once you do.",
    },
    {
      tab: "profile",
      title: "Your Profile",
      desc: "Keep your pharmacist profile current: department, license, and your on-duty status.",
    },
  ],
  Billing: [
    {
      tab: "billing",
      title: "Patient Accounts",
      desc: "Charges arrive by themselves from admissions, test orders, and dispensing. Items without a charge master price are flagged for you to price, and each price you set is logged.",
    },
    {
      tab: "profile",
      title: "Your Profile",
      desc: "Keep your billing office profile and on-duty status up to date.",
    },
  ],
  IT: [
    {
      tab: "architecture",
      title: "System Architecture",
      desc: "See the stack at a glance: service status, a sandbox to test role-based access through the gateway, each service's database schema, and the event bus.",
    },
    {
      tab: "staff",
      title: "Staff & Access",
      desc: "Manage staff accounts and roles, and search or export the audit log. The IT portal never shows patient clinical data.",
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
    "Acknowledge MEWS alerts",
    "Live bed occupancy stats",
    "Patient risk by department",
    "Patient risk feed",
    "Ward occupancy bars",
  ],
  patients: [
    "Search & filter patients",
    "Chart vitals with MEWS",
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
    "Order lab & radiology tests",
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
    "Captured charges by patient",
    "Price flagged items",
    "Logged price changes",
    "Account running totals",
    "Charges from bus events",
  ],
  staff: [
    "Staff accounts & roles",
    "Second approval for role changes",
    "Searchable audit log",
    "Audit CSV export",
    "Searches are logged too",
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
  architecture: "🖥️",
  billing: "💳",
  staff: "🛡️",
  profile: "👤",
};
