# WAH2.0 Hospital Information System Master Build Prompt

> Copied verbatim from the team's master prompt (2026-09-25) so every build
> session reads the same spec. Don't edit this file to "fix" the spec: record
> deviations in DECISIONS.md instead.

## 0. How to work

- Before coding, write PLAN.md with the phases in section 11 as a checklist. Build one phase at a time.
- After each phase: build, run tests, fix errors, commit. Do not move on with a broken build.
- These instructions are a strong default, not a script to follow blindly. Where you judge a different approach serves the goal better, take it, but record what you changed and why in DECISIONS.md so it is not lost. Ask only when something is genuinely ambiguous and a wrong guess would be costly to undo.
- Goal for now: a correct, working local system. Not cloud deployment, not scale, not polish beyond what is listed.
- TypeScript strict mode everywhere. Never commit secrets. No real patient data anywhere; all seed data is fictional.

---

## 1. Scope

In scope (inpatient only): admission, bed management, physician orders, MPI-linked registration, ICD-10 coded consultations, lab and radiology result recording, referral requests, pharmacy dispensing, billing, PhilHealth eClaims preparation, DOH report exports, HL7 FHIR R4 exchange.

Out of scope: do NOT build: outpatient/OPD (handled by the separate WAH4C system), pharmacy inventory or stock tracking, live API calls to PhilHealth/PHIE/DOH, cloud hosting or deployment infrastructure, clinical interpretation, bedside device integration, any machine learning.

---

## 2. Architecture

- Monorepo: /services/{identity, clinical-records, scheduling, billing, orders-diagnostics, interoperability, notifications, audit-log}, /apps/web, /packages/shared (types, event contracts, role constants), /infra (docker, kong, nginx), /docs.
- Backend: NestJS (Node.js, TypeScript). One container per service, each with its own Dockerfile, /health endpoint, and OpenAPI docs.
- Frontend: React + Next.js (App Router, TypeScript). It talks only to the gateway.
- Inbound: Nginx reverse proxy in front of Kong API Gateway (DB-less declarative config). Kong is the ONLY inbound entry: JWT validation, rate limiting, CORS, routing as /api/<service>/.... Services are not exposed to the host except through Kong.
- Events: RabbitMQ topic exchange "wah.events" with typed event contracts in packages/shared. Consumers must be idempotent. Use a dead-letter queue.
- Data: a single PostgreSQL instance, one schema per service, one DB user per schema. No cross-schema queries or foreign keys. Anything that would otherwise be a "document" (progress notes, result reports, FHIR bundles, generated claim files, audit record detail) is a JSONB column on the owning table, not a separate document store. No MongoDB, no Redis, no other datastore. If you find a real need for caching or a queue-backed cache later, note it in DECISIONS.md instead of adding infrastructure now.
- Outbound: the Interoperability Service is the ONLY service allowed to talk to anything outside the system. All external integrations sit behind adapter interfaces with mock or file-export implementations.
- Docker + Docker Compose, local only: one command starts everything (nginx, kong, rabbitmq, postgres, 8 services, web) with healthchecks and depends_on. Provide .env.example. No cloud deployment notes needed yet.

---

## 3. The eight services

1. Identity: users, roles, login (JWT access + refresh, argon2 password hashing), RBAC; patient registration and the Master Patient Index (MPI). POST /patients/match returns scored candidates (name similarity + birthdate + sex; exact match on PhilHealth PIN). Duplicate warning at registration. Stores PhilHealth PIN (12 digits) and membership type.
2. Clinical Records: encounters (admission to discharge), ICD-10 coded diagnoses (primary/secondary, admitting/final), progress notes, vital signs, discharge summary, notifiable-disease flag. Seed an ICD-10 table from a CSV loader so the full list can be loaded later. Vitals recording validates each value against physiological reference ranges (warn the nurse on the screen to verify before saving) and computes a MEWS risk level (Low / Medium / High) from six manually entered values: respiratory rate, oxygen saturation, temperature, systolic BP, heart rate, level of consciousness. This is a small pure function inside vitals recording, not a separate module, endpoint, or page. Keep the scoring bands and cutoffs in one constants file. Store the score with the vitals record. On High, publish an event so Notifications alerts staff. Show the risk as a colored chip beside the vitals. That is all.
3. Scheduling: wards, rooms, beds (Available / Reserved / Occupied / Cleaning), admission queue, bed assignment with real-time bed board, appointment booking for inpatient procedures.
4. Orders & Diagnostics: physician orders (medication, lab, radiology), prescriptions, pharmacy dispensing workflow (dispensing only, no stock), lab and radiology result storage and retrieval, test and drug catalogs.
5. Billing: price list, charges (from events: bed days, dispensed meds, lab/radiology, procedures, professional fees), invoices, payments, PhilHealth deductions, and the eClaims data pack (see section 4). Invoice status updates when claim status events come back from Interoperability.
6. Interoperability: FHIR R4/PHCDI exchange, the eClaims database and XML generation, DOH report exports, referral support, WAH4C referral intake stub (sections 4 to 6).
7. Notifications: consumes events, stores alerts per role/user as Postgres rows, pushes them live to the web app (SSE or WebSocket direct from the service, no separate cache layer needed at this scale).
8. Audit Log: consumes audit events from every service; append-only (no update or delete endpoints); search by user, patient, action, date range.

Core events (define in packages/shared): patient.registered, encounter.admitted, bed.assigned, encounter.discharged, order.created, medication.dispensed, result.released, vitals.recorded, mews.high, charge.posted, invoice.updated, claim.package.ready, claim.status.changed, notifiable.case.detected, audit.event.

---

## 4. eClaims database and claim export (Interoperability + Billing)

Goal: when a patient is discharged, the system assembles a claim that is ready to submit. Live submission to PhilHealth is NOT implemented. Produce validated, export-ready files for manual or facility-managed submission.

Billing prepares the claim data pack per encounter: member and patient data, diagnoses and procedures, itemized charges mapped to PhilHealth eSOA library categories, dispensed medicines (for CF4), professional fees, PhilHealth deduction, and a completeness checklist. It sends claim.package.ready.

Interoperability owns the eClaims tables in its own Postgres schema ("interop"):

- claims: encounter_id, patient_id, claim_number, tracking_number, claim_type (ALL_CASE_RATE | Z_BENEFIT), patient_type (I), is_emergency, admission_date, discharge_date, filing_deadline (discharge + 60 calendar days), status.
- claim_forms: claim_id, form_type (CF1, CF2, CF3, CF4, CF5, ESOA), payload (JSONB), xml, version, validation_status.
- claim_diagnoses and claim_procedures (ICD-10 / procedure codes).
- claim_documents: supporting document code (CF1, CF2, CF3, CF4, COE, CSF, DTR, MDR, ORS, OPR), file reference.
- transmittals: hospital_transmittal_no, total_claims, exported_file.
- transactions: claim_id, action, attempt_no, request, response, status, error, timestamp.
- validation_results: claim_id, rule_code, severity, field_path, message.
- status_history: claim_id, from_status, to_status, actor, timestamp.
- Reference tables loaded from files, never hardcoded: case_rates, esoa_library_map, membership_types, notifiable/other code lists.

Claim statuses: DRAFT, INCOMPLETE, READY_FOR_VALIDATION, VALIDATED, EXPORTED, SUBMITTED_MANUAL, IN_PROCESS, PAID, DENIED, RETURNED_TO_HOSPITAL.

XML structure (based on the PECWS 3.0 implementation guide; verify against the official DTD/XSD when available):

- eTRANSMITTAL (pHospitalTransmittalNo, pTotalClaims) containing CLAIM elements.
- CLAIM (pClaimNumber, pTrackingNumber, pPhilhealthClaimType, pPatientType I/O, pIsEmergency Y/N) contains CF1, CF2, ALLCASERATE or ZBENEFIT, optional CF3 (maternity only), PARTICULARS, RECEIPTS, DOCUMENTS.
- CF1: member PIN, names, birthdate, membership type code, sex, address, contact numbers, relationship of patient to member.
- Never store or write PhilHealth credentials into files. The official schema file path is a config value; if it is missing, validate against a minimal built-in check and flag "official schema not loaded".

Validation rules:

- Required CF1/CF2 fields present; PIN is 12 digits; ICD-10 codes valid; dates consistent.
- CF2 has attending physician sign-off recorded in the system.
- eSOA is XML only (never PDF); eSOA total equals the invoice total; CF4 medicine list equals the dispensed list.
- CF5 (DRG shadow billing data) generated for inpatient claims.
- CF4 and eSOA XML are encrypted with a configurable PhilHealth public key; if no key is configured, produce the unencrypted file clearly named as "NOT ENCRYPTED - test only".
- 60-day filing deadline: show days remaining, alert at a configurable threshold (default 15 days left), block "Mark as submitted" after the deadline unless an admin overrides with a reason.

Gateway adapter: define a PhilHealthGateway interface (validate, submit, checkStatus, retry). Implement FileExportGateway (writes the ZIP of XML files plus a manifest) and MockPhilHealthGateway (simulates statuses with delays and retries with backoff). Every attempt is logged in transactions. Status changes publish claim.status.changed, which Billing uses to update the invoice.

---

## 5. DOH reporting readiness

Generate export-ready files (CSV and XLSX). No direct API submission to DOH.

1. Annual Hospital Statistical Report data: authorized and implementing bed capacity (facility profile setting), inpatient service days, bed occupancy rate = inpatient service days / (authorized beds × days in period) × 100, admissions, discharges, deaths, deaths under 48 hours, net death rate, average length of stay, ten leading causes of morbidity and of mortality (ICD-10, disaggregated by age group and sex). Filter by date range.
2. FHSIS-style morbidity and mortality tabulations by month/quarter using a configurable template (the exact DOH template is to be confirmed with the pilot hospital, so keep column definitions in a config file).
3. PIDSR: a notifiable ICD-10 code mapping table (seed a starter list, mark "verify against current DOH list"). When a coded diagnosis matches, Clinical Records flags a notifiable case and publishes notifiable.case.detected. Category I (immediately notifiable): raise an alert immediately with a 24-hour reporting reminder and a CIF-ready export for that case. Category II (weekly): weekly line-list export by morbidity week, with a reminder due every Friday. Each export records who generated it, when, and the filters used, and logs it in the audit log.

---

## 6. FHIR, referrals, WAH4C

- FHIR R4 read and basic search endpoints for Patient, Encounter, Observation, Condition, MedicationRequest, DiagnosticReport, with PHCDI mapping for Patient and Encounter. Keep MPI identifiers and ICD-10 codes on the resources. Outbound exchange to "WAH Systems" goes through an adapter (mock implementation).
- Smart Inter-Hospital Referral Support: a rule-based tool over a seeded directory of participating facilities (coordinates, beds by care level, specialties). Keep only facilities that have a matching bed AND a matching specialist, then sort by distance (nearest first). It only shows ranked options. The referring doctor must review and approve before a referral is created, and the approver is stored. No prediction or ML.
- WAH4C inbound referral: create POST /interop/referrals/inbound as a documented stub. It uses Identity match-or-create to find the patient. The contract with the WAH4C team is not finalized, so mark it clearly as provisional.

---

## 7. Roles and UI/UX

### 7.1 Technology stack

- Framework: React 19 + Next.js 15 (App Router, TypeScript).
- Animations: Framer Motion (import from 'motion/react').
- Charts: Recharts.
- Icons: lucide-react.
- Styling: Tailwind CSS 4 with custom design tokens.
- Data fetching: TanStack Query.
- Forms: react-hook-form + zod.
- All API calls go through Kong only. No service is called directly from the frontend.

### 7.2 Visual identity

Clean and clinical. Dark mode is the default visual feel, deep navy/indigo backgrounds, glowing purple accents. Light mode inverts to clean white/lavender. Never use pure black or pure white as primary colors; always derive from the token set.

Theme tokens (add to tailwind.config):

```
wah-purple:   #6d28d9   (primary actions, active states)
wah-neon:     #a855f7   (highlight, hover states, charts, neon glow)
wah-lavender: #e9d5ff   (light backgrounds, chips, subtle fills)
wah-accent:   #a855f7   (alias for neon, used for secondary emphasis)
wah-deep:     #1e1b4b   (darkest background layer, buttons on gradients)
```

CSS custom properties (define in globals.css, redefined per theme):

```
--color-background       /* page bg */
--color-foreground       /* primary text */
--color-card-bg          /* card / sidebar bg */
--color-text-muted       /* secondary text */
--color-text-secondary   /* tertiary text */
--color-glass-bg         /* semi-transparent card fill */
--color-glass-border     /* card / input border */
--color-wah-purple
--color-wah-neon
--color-wah-lavender
```

Utility classes (in globals.css):

- .glass: frosted-glass card: background: var(--color-glass-bg); border: 1px solid var(--color-glass-border); backdrop-filter: blur(12px);.
- .purple-shadow: box-shadow: 0 0 20px rgba(109,40,217,0.15);.
- .hide-scrollbar: hides scrollbar track but keeps scroll behavior.

### 7.3 App layout

A fixed left sidebar (~80 px wide, icon-only) plus a right content area (full height, minus the sidebar width) containing a sticky topbar and a scrollable main content region below it. All tab views render inside the main content region with AnimatePresence fade + y-offset transitions (initial: { opacity:0, y:20 }, animate: { opacity:1, y:0 }).

### 7.4 Sidebar

Fixed, full height. Background: var(--color-card-bg).

Top: circular logo: public/wah-logo.png, w-12 h-12 rounded-full shadow-xl, hover:scale-110 transition.

Navigation items stacked vertically below the logo. Each SidebarItem:

- flex-col items-center py-3 rounded-xl transition-all.
- Active: bg-wah-purple text-white shadow-lg shadow-wah-purple/20 + a white left accent bar (position:absolute left:0 w-1 h-10 rounded-r-full) animated with layoutId="active-nav" for smooth Framer Motion transfer between tabs.
- Inactive: text-text-muted, hover: text-foreground + .glass bg.
- Icon: 24 px, group-hover:scale-110.
- Label: text-[9px] font-black uppercase tracking-tight below the icon.
- Tooltip on hover: absolute card at left-24, bg-slate-900 border border-slate-700, "MODULE: {name}" in wah-neon + description in text-slate-300. Scales in from origin-left.

Icons per tab: LayoutDashboard (dashboard), Users (patients), Receipt (prescription), Pill (pharmacy), FlaskConical (lab), Bed (rooms), DollarSign (billing), Package (inventory), Database (architecture), User (profile).

Navigation tabs per role:

| Role | Tabs (in order) |
|---|---|
| Doctor | dashboard, patients, prescription, pharmacy, lab, rooms, billing, profile |
| Nurse | dashboard, patients, pharmacy, rooms, lab, billing, profile |
| IT Admin | architecture, dashboard, patients, pharmacy, lab, rooms, billing, inventory, profile |

### 7.5 Topbar

Flex row, items-center justify-between, sticky top.

- Left: current tab name, text-xl font-bold.
- Right (flex row with gap):
  - Light/dark toggle (sun/moon icon from lucide).
  - Bell notification icon with unread count badge.
  - Formatted display name with Dr./RN prefix applied (see formatDisplayName below) + role chip (text-[10px] uppercase, color per role).
  - Logout button (text-text-muted hover:text-foreground); clicking sets userRole to null.

formatDisplayName(rawName, role): if role is 'Doctor' and name does not start with 'dr.' (case-insensitive) → prepend "Dr. ". If role is 'Nurse' and name does not start with 'rn ' → prepend "RN ". Otherwise return as-is.

handleLogin(role, name, dept, license, demo): sets all user state, sets isDemoMode = !!demo, demoStep = 0, and activeTab: IT → 'architecture'; all others → 'dashboard'.

### 7.6 Reusable components

StatCard ({ title, value, sub, icon, trend }): .glass rounded-2xl p-5, whileHover: { y:-5 }. Icon top-left in bg-wah-purple/20 text-wah-neon p-2.5 rounded-xl. Trend badge top-right in bg-wah-neon/10 text-wah-neon px-2 rounded-full text-[10px] uppercase. Background icon: absolute top-right opacity-10 size-[120px] text-wah-purple.

PatientCard ({ patient }): bg-card-bg rounded-2xl p-4 hover:ring-2 ring-wah-purple/20. Avatar circle w-12 h-12 rounded-full border-2 border-wah-purple/40 bg-wah-purple/10 with User icon + status dot (w-4 h-4 rounded-full absolute -bottom-1 -right-1: Critical → red animate-pulse, Stable → green, else → orange). Patient name font-semibold + id font-mono text-xs. JOIN button bg-wah-lavender text-wah-purple hover:bg-wah-purple hover:text-white. MEWS score label + colored score/10 (>5 → red, >3 → orange, else → wah-purple) + animated progress bar. Department chip + age chip in bg-glass-bg rounded-md.

Glass panel: .glass rounded-[2rem] p-8 with a header row (title font-bold text-lg + optional subtitle/action on the right).

### 7.7 Login screen

Full-screen overlay (fixed inset-0 z-[200]). Centered card: two-column grid (md:grid-cols-2), max-w-5xl, rounded-[3rem], .glass, border-2 border-wah-lavender/20.

Left panel (40%): Background gradient from-wah-purple via-indigo-600 to-indigo-800.

- Top: w-20 h-20 bg-white/20 rounded-3xl backdrop-blur box with Activity icon inside, rotated 3°.
- App name: "WAH" in text-5xl font-black text-white immediately followed by "ter" in wah-accent: no space, inline.
- Subtitle: "Professional Hospital Management" in text-xl text-wah-lavender.
- w-20 h-px bg-wah-neon horizontal divider.
- Brief system description in text-sm text-white/70.
- Footer: "© UNICA-HIJA" and "WAHter · HOSPITAL MANAGEMENT SYSTEM" in text-[10px] font-mono text-white/30.
- Decorative: giant Activity icon (size 400) at bottom-right in text-white/5; blurred circle glow at top-right.

Right panel (60%): AnimatePresence across 5 modes. Each mode animates in from x:20.

Mode select (role selection):

- Heading "System Access" text-3xl font-black, subtext "Select your portal to begin".
- Three role cards stacked: w-full p-6 rounded-[2rem] border-2 text-left, hover: border changes to role color, -translate-y-1, shadow-xl.
  - Left: w-16 h-16 rounded-2xl icon container rotates on hover. Doctor → purple Stethoscope (+6°). Nurse → wah-neon Users (-6°). IT Admin → rose-500 Database (+12°).
  - Right: role label font-black text-xl + uppercase subtitle. Doctor: "Doctor's Portal" / "Clinical Care". Nurse: "Nurse's Portal" / "Ward Operations". IT Admin: "Administrator Portal" / "System Diagnostics".
- Below cards: "Create New Staff Account" link in wah-purple on the left; "Try Demo" amber pill (border border-amber-400/30 text-amber-500 rounded-full text-[10px] font-black uppercase) on the right.

Mode login (staff login):

- Back button ("GO BACK" uppercase, text-text-muted hover:text-wah-purple).
- Role badge chip.
- Heading "Staff Login" + subtext.
- Full Name input with Users icon, rounded-2xl border-2 focus:border-wah-purple.
- Submit button: w-full py-5 rounded-[2rem] font-black. Doctor → bg-wah-purple. Nurse/IT → bg-wah-neon. Loading: spinner + "Processing…". Normal: "Enter Portal" + Activity icon.
- 800 ms fake loading, then onLogin().

Mode signup (new staff): Same as login but adds Staff Role select + Department (grid-cols-2) above Full Name, then License / Employee ID (MED-XXXX-XXXX format). Submit: "Create Account".

Mode verify (OTP: present but unused in prototype): "Security Verification Gate" amber chip. "Access Key Verification" heading. Purple info box (pulse dot + Mail icon + email). 6-digit input (font-mono text-center tracking-[0.5em] maxLength=6, numeric only). Error: red bounce + 🚨.

Mode demo: Amber "Demo Mode" badge. "Try WAHter" heading. Three smaller role cards (p-4 rounded-2xl border-2) each with a "Guided Tour" amber badge (text-[9px] font-black text-amber-500 bg-amber-400/10 px-2 py-1 rounded-full). Names: Demo Doctor, Demo Nurse, Demo Admin. Click: onLogin(role, demoName, undefined, undefined, true).

Bottom strip (always visible): border-t border-glass-border. Left: "Secure Access • v2.41" + "UNICA-HIJA" small wah-purple. Right: pulsing green dot + "Server: Online".

### 7.8 Screen designs by tab

**Dashboard.** Four-card stat row: Total Patients ("1,248" / "+12%"), Bed Occupancy ("84%" / "STABLE"), MEWS Alerts ("03" / "CRITICAL"), Daily Revenue ("₱ 242,500" / "+8.4%").
xl:grid-cols-12 main grid. Left (xl:col-span-8):

- Recharts AreaChart (h-300px) for REVENUE_DATA: gradient fill wah-purple/30 → transparent, wah-neon stroke line, dashed grid, themed tooltip.
- Inventory Status table (first 4 items): stock progress bars colored by status (Critical → red, Low → orange, Good → green); each row has category-colored icon container and History icon on hover.

Right (xl:col-span-4): scrollable live patient feed using PatientCard components. Footer: dashed-border "End of Daily Feed" card.

**Patients.** Search bar (glass rounded-2xl, Search icon, clear button) + filter chips (All | In-Patient | Out-Patient | ER | Discharged). Table: Patient Profile | Age / Gender | Ward / Bed | Primary Diagnosis | Status | Actions (appear on group-hover). Empty state when search returns nothing. Filter logic: ER → department === 'ER'; In-Patient → not Discharged; Discharged → status === 'Discharged'; Out-Patient → not ICU; Search → name, id, department (case-insensitive).

**E-Prescribing (Doctor only).** Two-column. Left: compose form (Patient select, Medication input, Dosage / Frequency / Duration / Route grid-cols-4, Instructions textarea, SAVE AS TEMPLATE + E-SIGN & SEND buttons). Right: Recent Prescriptions list (3 items, each med name + time ago + patient name).

**Pharmacy.** Stat row: Active Orders ("18"), Low Stock ("05"), Expired Soon ("02"). Left: Prescription Worklist (3 hardcoded RX orders, DISPENSE / VIEW buttons per status). Right: Drug Inventory filtered to Medication, stock progress bars (Critical → red, else → wah-neon), STOCK MANAGEMENT button.

**Laboratory.** Stat row: Pending Tests ("12"), Tests Processed ("48"), Critical Results ("02"). Left: Worklist with Queue / Results toggle tabs. Test cards from labTests data: icon container (green if Completed, wah-purple/10 if pending), priority label (Urgent → red font-black), status badge, VIEW / PROCESS action on hover. Right: Testing Slots grid (8 squares, 5 occupied style / 3 empty style); Lab Inventory progress bars; Automated Calibration info card.

**Bed Management.** Stat row: Total Beds ("70"), Available ("23"), Waitlist ("08"). Left: Wards & Occupancy: grid-cols-2 ward cards from wards data. Each shows a grid-cols-5 bed-grid (purple square = occupied, glass square = available), animated occupancy progress bar, MANAGE button on hover. Right: Near-Empty Wards list (wards with >5 vacant slots) + Smart Referral gradient card (wah-purple → wah-neon, white ROUTING ENGINE button).

**Billing.** Stat row: Pending Claims ("124"), Daily Collection ("₱ 84k"), Unbilled ("₱ 156k"), Audit Alerts ("03"). Left: Patient Billing Queue (first 5 patients, random ₱ balance, Pending badge, Generate SOA on hover). Right: PhilHealth 3.0 Ready info card (border-l-4 border-wah-neon) + End-of-Day Report card (bg-wah-purple/40, RECONCILE ALL white button).

**Inventory (IT Admin only).** Module Vision card (exact text about Automated Inter-Hospital Resource Routing). Stat row: Total SKU ("482"), Critical Stock ("12"), Value ("₱ 2.4M"), Turnover ("84%"). Left: Comprehensive Inventory table with filter tabs (All / Meds / Equip / Surgical) and expiry column. Right: Expiry Watch list (3 items, colored dot indicators) + Automated Ordering gradient card.

**Architecture (IT Admin only).** Five service status cards (grid-cols-5, each left-border-color-coded): Next.js, NestJS, Supabase, Redis, Docker Compose. Each shows a status badge, service name, subtitle, and port/stats footer.

Interactive Sandbox panel with two tabs:

- JWT & RBAC Interceptors Tester: role selector (GUEST / NURSE / DOCTOR), patient ID selector, JWT token preview, Send API Request button. On send: GUEST → 401, NURSE → 403, DOCTOR → 200 with 40% cache hit probability. All results append live log entries.
- PostgreSQL JSONB Column Viewer: patient selector, formatted JSONB code block showing vitals history, past history, allergies, and doctor notes.

Redis Cache panel: live hit rate / key count / memory metrics; Flush button (1,200 ms animation, resets all metrics, appends logs).

Docker Compose Node Logs (right column): scrollable live log list, font-mono text-[10px], entries colored by type (info → blue, warn → amber, success → green, err → red). Keeps last 10 entries.

**Profile.** Left: Digital Badge card: role-colored top band, avatar with initials, name with Dr./RN prefix, role badge chip, department, license, on-duty toggle (green when on, grey when off), hospital brand footer. Right: Editable fields (Full Name, Department, License/Employee ID, Role) + Bio textarea (when editing) + Activity summary row (Patients Today, Prescriptions, On Duty Since).

### 7.9 Demo guided tour

Activates when isDemoMode === true. Two AnimatePresence elements:

- Backdrop: fixed inset-0 bg-black/40 backdrop-blur-sm z-[290], click to dismiss.
- Modal card: fixed inset-0 z-[300] flex items-center justify-center, bg-white rounded-[2rem] max-w-md shadow-2xl, spring animation (stiffness:400, damping:30), key changes per step (re-animates each step).

Modal sections:

- Amber gradient header (from-amber-400 to-amber-500): tab emoji + step counter + step title + Exit button.
- Progress dots: active = amber wide pill, inactive = slate narrow pill; each dot is clickable and navigates the active tab.
- Description text.
- Feature chips (bg-amber-50 border-amber-200 text-amber-700 rounded-full).
- Footer: Skip Tour (left) | Back + Next / Finish Tour buttons (right). Back/Next navigate both demoStep and activeTab. Finish sets isDemoMode(false).

DEMO_STEPS constant: Record<string, { tab, title, desc }[]>. Doctor: 7 steps (dashboard → patients → prescription → pharmacy → lab → rooms → profile). Nurse: 7 steps (dashboard → patients → pharmacy → rooms → lab → billing → profile). IT Admin: 9 steps (architecture → dashboard → patients → pharmacy → lab → rooms → billing → inventory → profile).

### 7.10 Universal requirements

Every screen must have: loading skeletons, empty states, error states, and toast notifications. Every icon button has an aria-label. All layouts are responsive and tablet-friendly (ward use). Status badges encode bed status, order status, and claim status visually. All data is served from the API through Kong. No hardcoded mock data on production screens. The demo tour is the only place mock/static data is acceptable in the frontend.

---

## 8. Security and privacy (Data Privacy Act of 2012 aware)

JWT with short-lived access tokens, role checks in each service, rate limiting at Kong, input validation on every endpoint, no patient data in logs, secrets only via env, passwords never returned. Every read or write of patient data emits an audit event with user, role, patient, action, and time.

---

## 9. Seed data

Provide a seed script that loads: one demo user per role (documented in README), 20 fictional patients with realistic Filipino names, wards/rooms/beds, drug and test catalogs, a starter ICD-10 subset, facility directory for referrals, sample encounters at different stages including a few discharged encounters with claims in different statuses.

---

## 10. Tests

- Unit: MEWS function and validation ranges, MPI matching, bed occupancy rate, claim XML builder, claim validator rules, deadline calculation, referral ranking.
- One end-to-end flow test through Kong: register patient, admit and assign bed, record vitals, doctor orders lab and medication, lab releases result, pharmacist dispenses, discharge, invoice generated, claim assembled, validated, exported.

---

## 11. Phases

| Phase | Deliverable |
|---|---|
| 0 | Monorepo, Docker Compose (nginx, Kong, RabbitMQ, single Postgres instance), shared package |
| 1 | Identity and auth |
| 2 | Audit Log and Notifications |
| 3 | Clinical Records (with vitals and MEWS) |
| 4 | Scheduling |
| 5 | Orders & Diagnostics |
| 6 | Billing |
| 7a | Interoperability (eClaims tables, XML, validator, gateway adapters) |
| 7b | Interoperability (DOH exports, FHIR, referral support, WAH4C stub) |
| 8 | Web app shell, auth, role navigation, global components |
| 9a | Registrar, Nurse, Doctor screens |
| 9b | Pharmacist and Ancillary screens |
| 9c | Billing, Hospital Admin, System Admin screens |
| 10 | Seeds, end-to-end test, README, DECISIONS.md |

---

## 12. Definition of done (local only)

- docker compose up starts the full system locally and every healthcheck is green.
- Each role can log in and complete its workflows in the UI.
- eClaims: a discharged encounter produces a validated claim package with the XML files and manifest; validation errors show per field.
- DOH: the Annual Hospital Statistical Report, notifiable-case exports, and weekly line list download correctly.
- No service reads another service's database schema directly; nothing leaves the system except through Interoperability.
- Build, lint, and all tests pass.
- README explains setup, roles, seed users, environment variables, and how to load the official PhilHealth schema, case rate table, and eSOA library.

---

## 13. Step-up authorization for sensitive actions

Some actions carry enough risk that a real hospital wouldn't let the acting staff member complete them alone — this applies across the whole system, not just one department. Model it as a general mechanism, not a per-screen password box.

- Mark specific actions as "sensitive" via a flag in packages/shared, checked centrally wherever the action is triggered, not hardcoded per screen.
- Starting list, by service — treat this as a floor, not a ceiling. When building each service, actively look for actions that fit the same pattern (something that's hard to undo, easy to abuse, or that a real hospital would already require a second signature or supervisor sign-off for) and add them, noting the addition in DECISIONS.md:
  - Identity: merging two patient MPI records, deactivating or changing a staff user's role, resetting another user's password.
  - Clinical Records: amending a diagnosis or note after it's been signed/finalized, discharge against medical advice (DAMA), overriding a MEWS warning without acting on it.
  - Scheduling: manage_facility_structure actions (creating/retiring wards, rooms, beds — see section 7), canceling an admission after bed assignment.
  - Orders & Diagnostics: dispensing a controlled/dangerous drug (RA 9165-covered substances — default ON), voiding or correcting an already-dispensed record, canceling an order after it's been acted on, releasing a result after it was already released once (correction).
  - Billing: voiding or correcting a posted charge, voiding an invoice, applying a manual discount or write-off above a configurable threshold.
  - Interoperability: voiding or resubmitting an already-exported claim, manually overriding a claim's validation status, approving an inter-hospital referral (already required in section 6, but flag it here too since it belongs on this list), enabling a new external connector.
  - Notifications / Audit Log: none by default — Audit Log is append-only by design (no update/delete endpoints exist at all, so no step-up is needed there), and Notifications has nothing destructive to gate.
- Mechanism: when a user attempts a sensitive action, prompt for step-up — a second person with the right capability enters THEIR OWN credentials (password or PIN) to approve it, not the requester re-entering their own. This mirrors a real second-signature process and stops someone approving their own restricted action.
- Every step-up attempt (approved or denied) is written to the audit log with both the requester and the approver identified, the action, and a required short reason — separate from ordinary audit logging of routine actions.
- Controlled/dangerous drug dispensing defaults to requiring step-up, since Philippine hospitals already treat this differently. Everything else on the list defaults to OFF, so a thinly staffed public hospital isn't forced into friction it can't support.
- In the Setup Wizard (section 13), add a step-up configuration screen: a checklist of which sensitive actions require step-up at this hospital, and which roles/capabilities may approve each. A private hospital pursuing stricter controls can turn on more of the list; a small public hospital can leave most off and rely on its normal audit trail.

## 14. Data mapping documentation (ERD + PH Core)

Claude Code must produce and keep current two living documents in /docs, not just write code against PH Core silently:

1. /docs/ERD.md — one entity-relationship diagram per service schema (use Mermaid erDiagram blocks so they render in most markdown viewers), showing every table, its key columns, and its relationships within that schema. Since services don't share foreign keys across schemas (section 2), also include one cross-service diagram showing logical references only (e.g. "Billing.invoices.encounter_id refers to Clinical Records.encounters.id") labeled clearly as logical, not enforced, references.
2. /docs/PHCORE_MAPPING.md — a field-by-field mapping table for every FHIR resource type built in section 6 (Patient, Encounter, Observation, Condition, MedicationRequest, DiagnosticReport). For each resource, a table with columns: internal table.column → FHIR/PH Core element path → PH Core profile/extension used (or "base FHIR R4 — no PH Core profile yet" per the fallback rule in section 6) → notes (e.g. value set used, why a fallback was needed). Also record the PH Core IG version/commit the mapping was built against, since it's a draft standard that changes.

Update both documents at the end of every phase that adds or changes a table or a FHIR mapping — not just once at the end of the build. Section 10's end-to-end test should also confirm at least one resource of each type round-trips consistently with what PHCORE_MAPPING.md claims. Section 12's definition of done includes both documents being present and matching the actual schema/mapping in code, not stale.

---

## Phase prompts

Use one prompt per session. Run /clear between phases. PLAN.md carries progress forward.

**Phase 0: Foundation.** Read CLAUDE.md fully. Do Phase 0 only: monorepo layout, PLAN.md, DECISIONS.md, Docker Compose (nginx, Kong DB-less, RabbitMQ, a single PostgreSQL instance with one schema and one user per service), and packages/shared with event contracts and role constants. Local only, no cloud config. Done when docker compose up starts the infrastructure with green healthchecks. Commit, then summarize and stop.

**Phase 1: Identity.** Read CLAUDE.md and PLAN.md. Do Phase 1 only: the Identity service (users, roles, JWT login/refresh, RBAC, patient registration, MPI matching endpoint with scored candidates), its Dockerfile, health endpoint, Kong routes with JWT validation, and unit tests for matching. Update PLAN.md, commit, summarize, stop.

**Phase 2: Audit Log and Notifications.** Read CLAUDE.md and PLAN.md. Do Phase 2 only: the Audit Log service (append-only, search by user/patient/action/date) and the Notifications service (consumes events, stores alerts per role/user, live push to the web app). Add an audit event helper in packages/shared and use it in Identity. Update PLAN.md, commit, summarize, stop.

**Phase 3: Clinical Records.** Read CLAUDE.md and PLAN.md. Do Phase 3 only: the Clinical Records service (encounters, ICD-10 diagnoses with a CSV loader, progress notes, vitals, discharge summary, notifiable-case flag). Vitals recording validates ranges and computes the MEWS risk level as a small pure function inside it, with the bands in one constants file. No separate MEWS module or endpoint. Publish mews.high and notifiable.case.detected events. Add unit tests. Update PLAN.md, commit, summarize, stop.

**Phase 4: Scheduling.** Read CLAUDE.md and PLAN.md. Do Phase 4 only: the Scheduling service (wards, rooms, beds with statuses, admission queue, bed assignment with a live bed board, inpatient procedure booking). Publish bed.assigned and encounter events as needed. Update PLAN.md, commit, summarize, stop.

**Phase 5: Orders & Diagnostics.** Read CLAUDE.md and PLAN.md. Do Phase 5 only: the Orders & Diagnostics service (physician orders, prescriptions, dispensing only with no stock tracking, lab and radiology results, test and drug catalogs). Publish order.created, medication.dispensed, result.released. Update PLAN.md, commit, summarize, stop.

**Phase 6: Billing.** Read CLAUDE.md and PLAN.md. Do Phase 6 only: the Billing service (price list, charges built from events, invoices, payments, PhilHealth deduction, eSOA line items mapped to the eSOA library via a reference file, and the claim data pack with a completeness checklist). Publish claim.package.ready on discharge, and update invoices from claim.status.changed. Update PLAN.md, commit, summarize, stop.

**Phase 7a: Interoperability (eClaims).** Read CLAUDE.md and PLAN.md. Do Phase 7a only: the Interoperability service's eClaims part. Build the "interop" schema tables from section 4, reference-table loaders (never hardcode case rates), XML builders for CF1, CF2, CF3, CF4, CF5 and eSOA, the validator with all listed rules and the 60-day deadline logic, the PhilHealthGateway interface with FileExportGateway and MockPhilHealthGateway, and status history and transaction logging. Add unit tests for the builder, validator, and deadline. Update PLAN.md, commit, summarize, stop.

**Phase 7b: Interoperability (DOH, FHIR, Referrals).** Read CLAUDE.md and PLAN.md. Do Phase 7b only: DOH exports (Annual Hospital Statistical Report data, FHSIS-style template driven by config, PIDSR Category I and II exports with the notifiable code mapping), FHIR R4 read/search endpoints with PHCDI mapping, the rule-based referral support with physician approval, and the provisional WAH4C inbound referral stub. Add unit tests for bed occupancy rate and referral ranking. Update PLAN.md, commit, summarize, stop.

**Phase 8: Web app shell.** Read CLAUDE.md and PLAN.md. Do Phase 8 only: the Next.js app shell with login, JWT handling, role-based navigation and route guards, light/dark theme with the WAH purple tokens defined in section 7, shared components (StatCard, PatientCard, glass panel, InventoryRow, SidebarItem, topbar, PlaceholderView, loading skeletons, empty states, toast notifications), and the notification bell. The login screen must match section 7.7 exactly (2-column card, 5 modes, demo mode entry). Everything talks to Kong only. Update PLAN.md, commit, summarize, stop.

**Phase 9a: Registrar, Nurse, Doctor screens.** Read CLAUDE.md and PLAN.md. Do Phase 9a only: the Patient Registrar, Nurse, and Doctor screens exactly as listed in section 7, including vitals entry with the MEWS chip and verify warning, ICD-10 picker, order entry, and referral support. Dashboard, Patients, and the role-specific tabs (Prescription for Doctor, Lab/Rooms/Billing for both) must match the designs in section 7.8. Update PLAN.md, commit, summarize, stop.

**Phase 9b: Pharmacist and Ancillary screens.** Read CLAUDE.md and PLAN.md. Do Phase 9b only: the Pharmacist screens and the shared Laboratory/Radiology workspace from section 7. Pharmacy and Lab tab designs must match section 7.8. Update PLAN.md, commit, summarize, stop.

**Phase 9c: Billing, Hospital Admin, System Admin screens.** Read CLAUDE.md and PLAN.md. Do Phase 9c only: Billing (invoices, payments, and the full PhilHealth claims workspace with status pipeline, deadline badge, per-field validation errors, completeness checklist, export, and outcome recording), Hospital Administrator (dashboard and DOH report downloads), and System Administrator (user management, audit log viewer, service health, transaction log). Billing tab design must match section 7.8. Update PLAN.md, commit, summarize, stop.

**Phase 10: Seeds, tests, docs.** Read CLAUDE.md and PLAN.md. Do Phase 10 only: the seed script (section 9), the end-to-end flow test through Kong (section 10), README, and DECISIONS.md. Then run the full definition of done in section 12 and fix anything that fails. Report a checklist of what passes.
