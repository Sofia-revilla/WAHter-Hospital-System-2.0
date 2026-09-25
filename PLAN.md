# WAHter Build Plan

Phases from docs/MASTER_PROMPT.md §11. One phase at a time. Each phase ends with
a build, tests, a commit, and an update to this file.

## Build prompts done ahead of the phase order

- [x] **Prompt 1: Project Setup & Theme** (2026-09-25)
  Next.js 15 / React 19 / Tailwind 4 app in `apps/web`, WAH theme tokens, dark/light
  toggle, `cn()`, optional Supabase client, `DataContext` with mock fallback,
  `constants.ts`, `ProfileView`. Root npm workspace set up. See DECISIONS.md D-001 to D-005.
- [x] **Prompt 2: Mock Data** (2026-09-25)
  12 generated patients (seeded), 5 inventory items, 4 lab tests, 5 wards, revenue and admission
  trend series, reshaped types. See DECISIONS.md D-006 to D-009.
- [x] **Prompt 3: Login Screen** (2026-09-25)
  `LoginScreen` with select / login / signup / verify / demo modes, wired into App as a login gate,
  plus topbar logout. See DECISIONS.md D-010, D-011.
- [x] **Prompt 4: App Shell** (2026-09-25)
  Sidebar (logo, role-based SidebarItems with tooltips and sliding active bar), topbar (theme,
  bell, name + role chip, logout), per-role tabs, animated tab content, PlaceholderView.
  See DECISIONS.md D-012 to D-015.
- [x] **Prompt 5: Dashboard Tab** (2026-09-25)
  DashboardView with header, four StatCards, revenue AreaChart, inventory watchlist (InventoryRow),
  and the patient feed (PatientCard). See DECISIONS.md D-016 to D-018.
- [x] **Prompt 6: Patients Tab** (2026-09-25)
  PatientsView with search, filter chips, patient table, hover actions, and empty state.
  See DECISIONS.md D-019.
- [x] **Prompt 7: Prescription Tab** (2026-09-25)
  PrescriptionView: compose form with patient select, drug type-ahead, dosing fields, sig, and a
  working (local-only) E-Sign & Send into Recent Prescriptions. See DECISIONS.md D-020, D-021.
- [x] **Prompt 8: Pharmacy Tab** (2026-09-25)
  PharmacyView: three stat cards, prescription worklist with local DISPENSE, drug inventory bars.
  See DECISIONS.md D-022.
- [x] **Prompt 9: Lab Tab** (2026-09-25)
  LaboratoryView: stat cards, Queue/Results worklist with local PROCESS, testing slots, lab inventory,
  calibration card. See DECISIONS.md D-023.
- [x] **Prompt 10: Rooms Tab** (2026-09-25)
  BedManagementView: stat cards, ward cards with bed grids and occupancy bars, near-empty wards,
  Smart Referral card. See DECISIONS.md D-024.
- [x] **Prompt 11: Billing Tab** (2026-09-25)
  BillingView: stat cards, patient billing queue, PhilHealth 3.0 card, End-of-Day Report.
  Also fixed .glass overriding Tailwind borders. See DECISIONS.md D-025, D-026.
- [x] **Prompt 12: Inventory Tab** (2026-09-25)
  InventoryView (IT Admin): module vision, stat cards, filterable inventory table, expiry watch,
  automated ordering card. See DECISIONS.md D-027.

## Master prompt phases

- [ ] **0**: Monorepo, Docker Compose (nginx, Kong, RabbitMQ, single Postgres instance), shared package
- [ ] **1**: Identity and auth
- [ ] **2**: Audit Log and Notifications
- [ ] **3**: Clinical Records (with vitals and MEWS)
- [ ] **4**: Scheduling
- [ ] **5**: Orders & Diagnostics
- [ ] **6**: Billing
- [ ] **7a**: Interoperability (eClaims tables, XML, validator, gateway adapters)
- [ ] **7b**: Interoperability (DOH exports, FHIR, referral support, WAH4C stub)
- [ ] **8**: Web app shell, auth, role navigation, global components (theme tokens already exist from Prompt 1)
- [ ] **9a**: Registrar, Nurse, Doctor screens (ProfileView already exists from Prompt 1)
- [ ] **9b**: Pharmacist and Ancillary screens
- [ ] **9c**: Billing, Hospital Admin, System Admin screens
- [ ] **10**: Seeds, end-to-end test, README, DECISIONS.md

## Living docs to keep current (§14)

- [ ] docs/ERD.md: start in Phase 0/1, update whenever a table changes
- [ ] docs/PHCORE_MAPPING.md: start in Phase 7b
