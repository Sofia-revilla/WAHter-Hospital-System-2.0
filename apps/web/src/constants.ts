// Mock data for the prototype. Every name here is made up, no real patients.
// DataContext serves these whenever Supabase isn't configured or comes back empty.
//
// TODO(Phase 10): replace with the seed script once the services own this data.

import type {
  AdmissionTrendPoint,
  Department,
  InventoryItem,
  LabTest,
  Patient,
  PatientStatus,
  RevenuePoint,
  Ward,
} from "./types";

// ─── RANDOM HELPERS ───

// Seeded PRNG (mulberry32) instead of Math.random(). This module runs once on
// the server render and again in the browser; with Math.random() the two
// patient lists came out different and React threw a hydration mismatch.
// A fixed seed keeps the list random-looking but identical on both sides.
function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed 88 gives 3 children out of 12 (close to the 22% target) and almost no
// repeated names. Several seeds we tried, 2026 included, produced zero children.
const random = createSeededRandom(88);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function randomInt(min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

// Same reason as the seeded PRNG: Date.now() differs by a few ms between the
// server render and hydration, so we anchor admission dates to the start of
// today. The only time server and client disagree is right at midnight.
function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

// ─── CHARTS ───

export const REVENUE_DATA: RevenuePoint[] = [
  { name: "Mon", revenue: 45000 },
  { name: "Tue", revenue: 52000 },
  { name: "Wed", revenue: 48000 },
  { name: "Thu", revenue: 61000 },
  { name: "Fri", revenue: 55000 },
  { name: "Sat", revenue: 42000 },
  { name: "Sun", revenue: 38000 },
];

// opd is shown for context only; WAH2.0 itself is inpatient-only (OPD is WAH4C)
export const ADMISSION_TRENDS: AdmissionTrendPoint[] = [
  { name: "Week 1", opd: 120, ipd: 45 },
  { name: "Week 2", opd: 150, ipd: 52 },
  { name: "Week 3", opd: 180, ipd: 60 },
  { name: "Week 4", opd: 165, ipd: 55 },
];

// ─── PATIENTS ───

const ADULT_NAMES = [
  "James Smith",
  "Mary Johnson",
  "Robert Williams",
  "Patricia Brown",
  "John Garcia",
  "Jennifer Miller",
  "Michael Davis",
  "Linda Rodriguez",
  "David Martinez",
  "Elizabeth Jones",
] as const;

const CHILD_FIRST_NAMES = [
  "Liam",
  "Emma",
  "Noah",
  "Olivia",
  "Ethan",
  "Ava",
  "Lucas",
  "Isabella",
  "Aiden",
  "Sophia",
  "Mason",
  "Mia",
] as const;

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Jones",
] as const;

const ADULT_DEPARTMENTS: readonly Department[] = [
  "Internal Medicine",
  "ICU",
  "Surgical Suite",
  "ER",
  "Pediatrics",
];

const STATUSES: readonly PatientStatus[] = ["Critical", "Stable", "Recovering", "Observation"];

const CHILD_RATIO = 0.22;

// ~11.5 days. 1e9 ms is 11.57 days, close enough and easy to read.
const ADMISSION_WINDOW_MS = 1_000_000_000;

export function generateRandomPatient(id: number): Patient {
  const isChild = random() < CHILD_RATIO;

  const name = isChild ? `${pick(CHILD_FIRST_NAMES)} ${pick(LAST_NAMES)}` : pick(ADULT_NAMES);

  return {
    id: `WAH-2026-${String(id).padStart(5, "0")}`,
    name,
    age: isChild ? randomInt(3, 15) : randomInt(18, 87),
    gender: random() < 0.5 ? "Male" : "Female",
    // children never land outside Pediatrics, even though adults can too
    department: isChild ? "Pediatrics" : pick(ADULT_DEPARTMENTS),
    status: pick(STATUSES),
    // TODO(Phase 2): replace with the MEWS calculated from the patient's latest vitals.
    // Random on purpose for now, so the dashboard shows a spread of risk colors.
    mewsScore: Math.floor(random() * 10),
    admittedAt: new Date(startOfToday() - random() * ADMISSION_WINDOW_MS).toISOString(),
    // TODO(Phase 8): serve avatars locally. This sends the (fictional) name to
    // dicebear.com, which is fine for mock data but not for real patients.
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
  };
}

export const PATIENTS: Patient[] = Array.from({ length: 12 }, (_, index) =>
  generateRandomPatient(index + 1),
);

// ─── INVENTORY ───

export const INVENTORY: InventoryItem[] = [
  {
    id: "INV-001",
    name: "Paracetamol 500mg",
    category: "Medication",
    stock: 1250,
    minStock: 500,
    unit: "Tabs",
    status: "Good",
  },
  {
    id: "INV-002",
    name: "Surgical Gloves (Size 7)",
    category: "Supply",
    stock: 45,
    minStock: 100,
    unit: "Pairs",
    status: "Critical",
  },
  {
    id: "INV-003",
    name: "Amoxicillin 250mg Syrup",
    category: "Medication",
    stock: 200,
    minStock: 150,
    unit: "Bottles",
    status: "Low",
  },
  {
    id: "INV-004",
    name: "N95 Respirator Masks",
    category: "Supply",
    stock: 500,
    minStock: 200,
    unit: "Pcs",
    status: "Good",
  },
  {
    id: "INV-005",
    name: "Saline Solution 1L",
    category: "Supply",
    stock: 85,
    minStock: 50,
    unit: "Bags",
    status: "Good",
  },
];

// ─── LAB ───

export const LAB_TESTS: LabTest[] = [
  {
    id: "LAB-5501",
    patient: "James Smith",
    test: "Complete Blood Count (CBC)",
    priority: "Urgent",
    status: "In-Progress",
    time: "10m ago",
  },
  {
    id: "LAB-5502",
    patient: "Mary Johnson",
    test: "Urinalysis",
    priority: "Routine",
    status: "Pending",
    time: "25m ago",
  },
  {
    id: "LAB-5503",
    patient: "Robert Williams",
    test: "Lipid Profile",
    priority: "Urgent",
    status: "Completed",
    time: "1h ago",
  },
  {
    id: "LAB-5504",
    patient: "Patricia Brown",
    test: "Glucose Test",
    priority: "Routine",
    status: "Pending",
    time: "2h ago",
  },
];

// ─── WARDS ───

export const WARDS: Ward[] = [
  { id: "W-001", name: "General Ward", type: "Male", capacity: 20, occupied: 14, color: "#a855f7" },
  { id: "W-002", name: "General Ward", type: "Female", capacity: 20, occupied: 18, color: "#ec4899" },
  {
    id: "W-003",
    name: "Intensive Care Unit (ICU)",
    type: "Specialized",
    capacity: 10,
    occupied: 7,
    color: "#ef4444",
  },
  { id: "W-004", name: "Pediatrics Ward", type: "Children", capacity: 15, occupied: 5, color: "#3b82f6" },
  { id: "W-005", name: "Isolation Ward", type: "Specialized", capacity: 5, occupied: 2, color: "#10b981" },
];
