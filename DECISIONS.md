# Decisions

Places where we deliberately departed from docs/MASTER_PROMPT.md (or had to pick
between two readings of it), and why. Newest at the bottom.

---

### D-001: Supabase client added in Prompt 1, temporarily

**Master prompt says:** the frontend talks only to Kong; no Supabase anywhere in the stack.
**Prompt 1 says:** install `@supabase/supabase-js`, create `src/lib/supabase.ts`, have DataContext read from it.
**We did:** followed Prompt 1, since it's the team's explicit build instruction. The client returns `null`
when no keys are set, so the app runs fine without a Supabase project.
**Plan:** in Phase 8, DataContext switches to TanStack Query against Kong, and `src/lib/supabase.ts`
plus the dependency get removed.

### D-002: Mock data lives in the frontend for now

**Master prompt §7.10:** no hardcoded mock data on production screens; only the demo tour may use static data.
**Prompt 1:** `constants.ts` holds PATIENTS, INVENTORY, WARDS, LAB_TESTS, and DataContext falls back to them.
**We did:** followed Prompt 1. All names are fictional.
**Plan:** Phase 10's seed script becomes the real data source; after that the arrays only feed the demo tour.

### D-003: App lives in `apps/web`, entry is `src/App.tsx`

Prompt 1 asks for a standalone Next.js app with `src/App.tsx` as the main file. The master prompt wants a
monorepo with the frontend at `apps/web`. We did both: the app sits in `apps/web`, and
`src/app/page.tsx` just renders `<App />`. The repo root is an npm workspace (`apps/*`, `packages/*`,
`services/*`) so the services can drop in during Phase 0 without moving anything.

### D-004: Both `motion` and `framer-motion` installed

Prompt 1 lists `framer-motion` but says to import from `motion/react`. That import path only exists in the
`motion` package (the library was renamed in v11), so both are installed and code imports from `motion/react`.

### D-005: Theme class goes on `<html>`

Prompt 1 says to "apply a class to the root element". We toggle `.light` on `document.documentElement`
instead of App's wrapper div, so the body background and the browser's own scrollbars switch too. Dark values
live on `:root` because dark is the default feel.

### D-006: Mock patients use a seeded random generator

Prompt 2 asks for randomly generated patients (`generateRandomPatient`). Plain `Math.random()` and
`Date.now()` produce different values during the server render and in the browser, which breaks
React hydration. `constants.ts` uses a seeded PRNG (mulberry32, seed 88) and anchors admission dates to
the start of today. The roster still looks random but is identical on both sides. Seed 88 was picked
because it gives 3 children out of 12 (target ~22%); several other seeds gave none.

### D-007: Prompt 2 mock names are English, not Filipino

Master prompt §9 asks for "realistic Filipino names" in the seed script. Prompt 2 specifies English
names (James Smith, Liam, Emma…). We followed Prompt 2 for the frontend mock; the Phase 10 seed script
will still use Filipino names. Gender is random per Prompt 2, so a name and gender won't always match.

### D-008: DiceBear avatars are an external request

Prompt 2's `avatar` field points at api.dicebear.com with the patient name as the seed. That sends a
(fictional) name to a third party, which would break Data Privacy Act rules with real patients. Kept for
the mock, with a TODO(Phase 8) to generate avatars locally or seed them by patient ID instead.

### D-009: ADMISSION_TRENDS includes an `opd` series

Prompt 2 includes outpatient counts. WAH2.0 is inpatient-only (OPD belongs to WAH4C), so the `opd`
field is treated as context data only and noted as such in `constants.ts`.

### D-010: Login card uses a 2fr/3fr grid

Prompt 3 asks for `md:grid-cols-2` and also a 40% / 60% split between the brand panel and the form.
`grid-cols-2` gives 50/50, so we used `md:grid-cols-[2fr_3fr]`, which keeps the two-column grid and
matches the stated proportions.

### D-011: Logout button and login defaults added with Prompt 3

Once the login gate exists there has to be a way back to it, so the topbar got the logout button from
master prompt §7.5 (sets `userRole` to null). The plain login form only asks for a name, so
`handleLogin` fills in a default department per role and "Not on file" for the license; signup passes
the real values. Demo logins show a "Demo Mode" chip in the topbar until the guided tour prompt replaces it.
The verify (OTP) mode is fully built but, per Prompt 3, nothing in the UI routes to it yet.

### D-012: IT role stored as "IT", shown as "IT Admin"

Prompt 4 defines `userRole: 'Doctor' | 'Nurse' | 'IT' | null`, while the nav table and login cards say
"IT Admin". `StaffRole` now uses `"IT"` and `ROLE_LABELS` maps it to "IT Admin" wherever it's displayed.

### D-013: Placeholder logo at public/wah-logo.png

Prompt 4 expects `public/wah-logo.png`, but the new repo has no brand assets and we're not copying from
the old UNICA-HIJA-UNI-WAH4E repo. We generated a simple placeholder (purple gradient circle with a white
pulse line). Replace the file with the official logo; no code change needed.
**Update (2026-09-25):** replaced with the official WAH logo supplied by the team (resized to 256×256).

### D-014: Sidebar fits short screens without scrolling

The sidebar can't use `overflow-y-auto`, because any overflow setting clips the hover tooltips that stick
out to the right. On a ~700px-tall viewport, IT Admin's nine tabs overflowed by about 30px. We added a
`short:` Tailwind variant (`max-height: 760px`) that trims the item and sidebar padding, and cut the
sidebar's side padding to `px-1` so "ARCHITECTURE" (about 70px at 9px black) fits in the 80px column.
The labels are the tab ids, uppercased, as Prompt 4 specifies.

### D-015: Unbuilt tabs render a PlaceholderView

Prompt 4 builds navigation for tabs whose screens come in later prompts. Those tabs show a
`PlaceholderView` (icon, name, description, "coming in a later build prompt") instead of a blank area.
The bell has no unread badge yet; that arrives with the Notifications service (Phase 2).

### D-016: Dashboard stat values and date are hardcoded (Prompt 5)

Prompt 5 specifies fixed stat values ("1,248", "84%", "03", "₱ 242,500") and a hardcoded date
("Tuesday, May 5, 2026"). Master prompt §7.10 wants live API data on production screens. We followed
Prompt 5 for the prototype; they become live figures once Clinical Records, Scheduling and Billing exist.
The chart's range picker is visual only for now (TODO(Phase 6)).

### D-017: Stock bar treats 2× minStock as full

The inventory data has `stock` and `minStock` (a reorder point) but no maximum, so the stock-level bar
shows `stock / (2 × minStock)`, capped at 100%. Items at the reorder point show half full.

### D-018: Recharts gets hex colors, not CSS variables

Recharts writes colors into SVG attributes, where `var(--…)` doesn't resolve, so the dashboard chart
uses the token hex values directly and picks grid and tooltip colors from `isLight`.

### D-019: Patients table placeholders follow Prompt 6

Prompt 6 fills several columns with display placeholders rather than patient data: gender alternates by
row index, the bed is `Room 30{i+1}-B`, and every diagnosis reads "Chronic Respiratory Failure with
associated symptoms…". We built it as specified, with TODOs pointing at the services that will supply real
values (Clinical Records for diagnosis, Scheduling for bed). The Out-Patient chip is kept as designed even
though WAH2.0 is inpatient-only. The "Discharged" filter compares status as a plain string, because the
Prompt 2 mock statuses don't include Discharged; with mock data it shows the empty state.

### D-020: E-Prescribing form works locally until Orders & Diagnostics exists

Prompt 7 describes the compose form and a list of 3 recent prescriptions. To make it demo-able, E-Sign &
Send checks the essentials (patient, medication, dosage, frequency), then adds the prescription to the
top of the Recent list ("JUST NOW") and clears the form. Nothing is persisted; TODO(Phase 5) marks
where the POST to Orders & Diagnostics goes. The medication field offers type-ahead from the Medication
items in inventory through a native `<datalist>`. The three seeded recent items use the first three mock
patients so they match the patient dropdown. Save as Template is not wired yet.

### D-021: Topbar name hides below md width

On tablet-width screens the topbar title ("E-Prescribing") and the display name wrapped onto two lines.
The title and demo chip are now `whitespace-nowrap`, and the display name hides below the `md`
breakpoint; the role chip still shows who's logged in.

### D-022: Pharmacy tab shows stock bars despite "dispensing only" scope

Master prompt §1 and §3.4 put pharmacy stock tracking out of scope, but Prompt 8 (and master §7.8's
Pharmacy design) include a Drug Inventory panel and a "Low Stock" card. We built the panel from the
existing mock inventory, display only. Nothing decrements stock when a medication is dispensed. The
bar width follows Prompt 8 (`stock / minStock × 50%`, capped at 100%), so the halfway mark is the
reorder point. DISPENSE flips the worklist item to Dispensed locally; TODO(Phase 5) marks where the real
dispense call (and step-up for controlled drugs, §13) goes. `StatCard.trend` is now optional because the
"Expired Soon" card has none.

### D-023: Lab worklist Queue/Results tabs filter, PROCESS advances locally

Prompt 9 shows a Queue | Results toggle without saying what each holds. Queue lists tests that aren't
Completed; Results lists Completed ones (each has its own empty state). PROCESS moves a test one step:
Pending → In-Progress → Completed. This is a local copy of the mock data until Orders & Diagnostics
owns results (TODO(Phase 5)). Testing slots (5 of 8 in use) and the 70% lab-inventory bars are fixed
values, as the prompt specifies. Each lab card also shows how long ago the test was requested, since
the mock data carries it.

### D-024: Bed board stat figures vs ward data

Prompt 10 hardcodes Total Beds 70, Available 23, Waitlist 08. The Prompt 2 wards add up to 70 beds with
46 occupied, which is 24 free, not 23. We kept the prompt's figures and noted the mismatch in
`BedManagementView.tsx`; both will come from the Scheduling service in Phase 4. Near-Empty Wards
(more than 5 vacant beds) is computed from the ward data and shows the ward type next to the name, because
two wards are both called "General Ward". MANAGE, the admit (+) buttons, and ROUTING ENGINE aren't wired
yet. The referral engine is Phase 7b and must stay rule-based with doctor approval.

### D-025: Billing queue balances are random once per visit

Prompt 11 asks for random balances (`Math.random() * 15000 + 5000`). Computed inline, they reshuffled on
every re-render, including hover. They're generated once in a lazy `useState` when the tab mounts.
TODO(Phase 6) marks the swap to real invoice balances. Generate SOA and Reconcile All aren't wired yet.
The eSOA must be XML only (eClaims 3.0) when it is built.

### D-026: Custom CSS classes moved into @layer components

`.glass`, `.purple-shadow` and `.hide-scrollbar` were unlayered CSS, and unlayered rules always beat
Tailwind's layered utilities. That meant `.glass`'s `border` shorthand silently overrode `border-l-4
border-l-wah-neon` on the PhilHealth card, and the login card's `border-2 border-wah-lavender/20`. They
now live in `@layer components`, so utilities override them as expected.

### D-027: Inventory tab built as designed, although inventory is out of WAH2.0 scope

Master prompt §1 lists "pharmacy inventory or stock tracking" as out of scope, while Prompt 12 and master
§7.8 define this IT Admin tab. We built the screen as a prototype view over the mock inventory. Stock
Audit, Add New Batch, Routing Suggestions and Review Drafts stay visual, with no inventory backend
planned. Filter mapping: Meds → Medication, Surgical → Supply (all current Supply items are surgical or
clinical consumables), Equip → an "Equipment" category that doesn't exist yet, so it shows the empty
state. Expiry is the hardcoded "05/2026" from the prompt.

The Automated Ordering card keeps Prompt 12's exact wording ("AI detected low levels…"). The paper and
master prompt exclude machine learning, so the team may want to reword this to "The system detected…"
before the defense.

### D-028: Architecture tab is a simulation that names Supabase and Redis

Prompt 13 (and master prompt §7.8) describe status cards for Next.js, NestJS, Supabase, Redis and Docker,
an RBAC sandbox, a JSONB viewer and a Redis cache panel. The real target stack (master §2, paper TABLE IX)
is Nginx → Kong → NestJS services, RabbitMQ and one PostgreSQL instance. There's no Supabase and no Redis
("No MongoDB, no Redis"). We built the tab exactly as Prompt 13 specifies, since it's a demo-only
simulation: every request, token, cache hit and log line is generated in the browser. The file header
and TODO(Phase 9c) say so, and the demo tokens are harmless placeholder strings. Before the defense, the
team may want the cards to show the real containers (Kong, RabbitMQ, PostgreSQL, the 8 services) so the
screen matches the paper.

Details we filled in: Mary Johnson's second vitals entry and respiratory rates (the prompt gave only the
first reading's BP/HR/temp), the NURSE warn message, the cache-hit increment (+0.2%, capped at 99.9%),
and flush resetting memory to "0.00 MB". The Send button is disabled while a request is in flight, and
pending timers are cleared if you leave the tab. With every tab now built, the temporary PlaceholderView
and BUILT_TABS were removed from App.tsx.

### D-029: ProfileView rebuilt to Prompt 14's props, plus an onSave callback

Prompt 14 defines `ProfileView` with props `{ name, role, department, license, isLight }`. We added an
optional `onSave`, because otherwise an edited name, department or license would only exist inside the
tab and vanish from the topbar and on remount. App passes its setters. The role field stays read-only in
edit mode: role changes are a System Admin action (step-up protected per master §13), not self-service.
`isLight` is used for the off state of the duty toggle, because `glass-bg` is near-white in light mode
and the track disappeared. Bio and on-duty status are local component state, as Prompt 14 specifies, so
they reset when you leave the tab. Activity numbers (12 / 8 / 07:00 AM) are hardcoded until
Phase 9a. `formatDisplayName` moved from App.tsx to `src/lib/staff.ts` so ProfileView can use it without
importing App.

### D-030: Demo guided tour

Prompt 15's step descriptions were truncated ("Your real-time command center...") and Nurse/IT copy was
left for us to write. We finished each Doctor sentence in the same voice and wrote Nurse and IT steps
around their daily tasks (MEWS checks and bed prep for nurses; service health, access testing and data
checks for IT). Tour content lives in `src/demoTour.ts` (DEMO_STEPS, TAB_FEATURES, TAB_EMOJI), typed
against `TabId` so a typo in a step's tab fails the build. The tour replaces the temporary "Demo · Step"
chip in the topbar. The card uses `bg-white` as Prompt 15 specifies, the one deliberate exception to
master §7.2's "no pure white" rule, because the amber tour card is meant to stand apart from the app
theme. It has `role="dialog"`, and each progress dot has an aria-label.

### D-031: Prompt 16 wiring done; deploy steps paused for the team

Code: `App.tsx` now routes through a `renderTab()` switch with a `PlaceholderView` fallback ("{title} Module
/ Module under construction in Phase 2"). Every current TabId has a view, so the fallback only appears if
a tab is added to navigation.ts before its screen. `DataProvider` now wraps the login screen too; both
branches render it at the root, so React keeps one provider mounted across login. The logo at
`public/wah-logo.png` is now the official WAH logo (see D-013).

Deploy (step 6) was not done automatically:
- Prompt 16 says to push to **UNICA-HIJA-UNI-WAH4E**, but the team moved this rebuild to its own
  folder and repo (WAHter-Hospital-System-2.0) with instructions not to touch the original.
- Connecting Vercel and adding env vars happen in the team's Vercel dashboard.
- Master prompt §0/§2 keep this build local-only for now.
If deployed on Vercel from this monorepo, set the project's **Root Directory to `apps/web`**. The
Supabase URL and publishable key go in Vercel's env settings only, never in the repo. `.env.example`
lists the variable names. Note that DataContext expects Supabase tables named `patients`, `inventory`,
`lab_tests`, `wards` with camelCase columns matching `types.ts`. Tables with a different shape would
render wrong, although empty or missing tables safely fall back to mock data.

### D-032: Version label is "v2", not "v2.41"

The team asked for the version to read just "v2" (WAH2.0). The login screen's bottom strip now says
"Secure Access • v2" and the App.tsx header says v2. docs/MASTER_PROMPT.md still says v2.41 because it's
kept as a verbatim copy of the original spec.

### D-033: Light mode is now the default

The master prompt made dark mode the default. The team asked for light mode instead, so `isLight`
starts as `true` and `layout.tsx` puts `.light` on `<html>` in the server HTML (no dark flash on load).
Dark mode is still one click away in the topbar.

### D-034: Collapsible sidebar (expanded list or icon rail)

The team wanted the sidebar laid out like a classic HIS nav when it's open (logo + name at the top, a
search box, then full-width icon + label rows), while keeping the current 80px icon rail when it's
collapsed. Colors are unchanged. It starts expanded (w-64); the collapse button sits in the header
where the reference had its gear. The expand button is a small tab on the rail's edge, so the rail
doesn't lose height and IT Admin's nine tabs still fit. The search box filters the module list (Enter
opens the first match). It doesn't search patients. Tooltips only show in the rail, since the expanded
rows already show names. The main area's margin (ml-64 / ml-20) animates with the width.

### D-035: Pharmacy tab is dispensing-only (supersedes the stock parts of D-022)

The Pharmacy KPIs "Low Stock / Resupply Needed" and "Expired Soon / B-Blockers Batch", plus the Drug
Inventory panel and its Stock Management button, were stock tracking. The paper's limitation (d) makes
the Medication Service dispensing-only (no inventory, stock tracking, or reorder thresholds), master
prompt §1/§3.4 says the same, and UC-10 only has the pharmacist review, verify, dispense (or partial
fill) and flag back to the prescriber. The §7.8 visual design contradicted that. The KPIs are now Pending
Dispensing, Dispensed and For Review, counted live from the worklist. The right panel is a Dispensing
Checks list built from UC-10's steps and business rules, plus master §13's second approval for
controlled drugs. The heading changed from "Medication & Inventory" to "Medication Dispensing". The
demo tour's pharmacy copy dropped its "stock" wording to match.

### D-036: Paper-alignment pass (branch `paper-alignment`)

The team asked to follow the paper and diagrams over the build prompts for role and tab behavior.
The pre-change build is tagged `prompt-build-v1` (also still on `main`) so it can be restored.

- **Role gating** (`lib/staff.ts`): one permission map based on the use case actors. Dispense
  (UC-10), lab Process (UC-11), and SOA/Reconcile (UC-12/13) belong to roles without portals yet, so
  doctors and nurses see those screens read-only. Admit/Manage beds is Nurse only (UC-04); ordering
  diagnostics is Doctor only (UC-11 step 1); charting vitals is Doctor + Nurse (UC-05).
- **MEWS** (`lib/mews.ts`, `lib/mewsBands.ts`): six manual vitals, bands in one constants file (Subbe
  2001 bands, SpO2 band added; placeholders to verify with CDH). Readings outside plausible ranges
  must be confirmed, not blocked (paper scope g). Medium or High raises an alert (UC-08, following the
  paper over the master prompt's High-only `mews.high`). Alerts are acknowledged with an optional note
  or a false-alarm flag; acknowledged alerts are never edited. Escalation is a TODO. Two seeded vitals
  sets give the dashboard real alerts on first load.
- **Lab**: removed testing slots, lab inventory and calibration (not in the paper). Stats count from
  the worklist. Doctor gets Order Test; others see UC-11's result release rules.
- **IT Admin**: tabs reduced to Architecture, Staff & Access, Inventory, Profile. The paper's IT portal
  excludes clinical modules and patient data. Architecture now shows the TABLE IX stack, the RBAC
  sandbox uses real use case actors, a service-schema table replaces the patient JSONB viewer, and an
  event-bus panel (with a Notifications outage toggle) replaces the Redis panel to show fault
  isolation. New Staff & Access tab covers UC-16 (accounts, step-up note for role changes, append-only
  audit log with search, CSV export and meta-audit).
- Master prompt §7.4's nav table and §7.8 designs are superseded where they conflict with the above.

### D-037: Dashboard inventory removed, bed admission flow, notification inbox

- **Inventory Status (Dashboard) removed.** None of the paper's 8 FSAs owns inventory, no use case
  or diagram covers it, and limitation (d) keeps pharmacy dispensing-only. Replaced with Bed Occupancy
  by Ward (UC-04, user story 9). `InventoryRow.tsx` was deleted.
- **Admit / Assign Bed** (`AdmitDialog.tsx`, UC-04): searchable patient picker, ward and bed dropdowns
  (only free beds), admission type, and attending physician (the required fields from UC-04.1). One
  active bed per patient: assigning again becomes a transfer that frees the old bed (UC-04 BR-02,
  user story 8). A double-booked bed is rejected (BR-03). An ICU bed for a non-Critical patient needs a
  confirmation (UC-04.3 2a). Free beds on the grid are clickable for staff who can admit. Bed Total and
  Available stats are now counted from bed state. Mock wards only give occupied counts, so the first N
  beds per ward count as taken by patients without records.
- **Notification bell** opens an inbox of unacknowledged MEWS alerts with an unread badge. With
  nothing to show it says "No notifications available". IT Admin's inbox stays empty because MEWS
  alerts carry patient data.
- **Dialogs are portaled to `<body>`.** The tab content wrapper animates with a transform, which
  traps `position: fixed` children; the vitals and admit dialogs were rendering inside the main
  column under the sidebar.
- **Narrow screens:** the sidebar folds to the icon rail below 1024px, and the login card uses tighter
  padding on phones.

### D-038: Clinical dashboard without revenue, and a flatter card style

- **No revenue for Doctor and Nurse.** The paper puts financial reports with Billing Staff and the
  Hospital Administrator (TABLE XIII, user stories 33–40), so "Daily Revenue" and the revenue chart
  are gone from the clinical dashboard. REVENUE_DATA stays in constants for those future portals.
  All four KPIs are now live: Admitted Patients, Bed Occupancy (from the bed board), MEWS Alerts,
  Pending Results (UC-11). The chart is now **Patient Risk by Department**: Low/Medium/High MEWS
  counts, since early warning is the paper's objective 4. The dashboard date is today's date.
- **Shapes and look** (team reference: a HealthSync-style HIS). Colors are unchanged. Cards are flat
  (`.glass` is now a solid card with a thin border, no blur) with 12px corners. Buttons use 8px. Card
  padding and section gaps are tighter, and page titles are one size smaller. StatCard is compact:
  icon + label, value with a small chip, caption. The topbar has an avatar/name/role profile block that
  opens Profile. The expanded sidebar has a "Main Menu" label and a tinted active row; the collapsed
  rail keeps its solid purple pill.

### D-039: Patient flow chart, ward filter, login passwords, sign-out confirmation

- **Dashboard chart** restyled after the team's reference (grouped slim bars with rounded tops, dot
  legend by the title, range chips, dark tooltip pill). The reference compared in- vs out-patients,
  but WAH2.0 is inpatient-only, so it shows **Admissions vs Discharges** (user story 39) for 7D / 1M /
  1Y. Colors come from the tokens (wah-deep, flipped to lavender in dark mode, and wah-neon) instead
  of the harsher red/orange/green risk stack. Ward occupancy bars are a single purple, turning soft
  rose only at 90%+. `ADMISSION_TRENDS` (which had an OPD series) was replaced by `PATIENT_FLOW`.
- **Bed board ward filter**: a dropdown for all wards, only wards with free beds, or one ward, each
  option listing its free beds.
- **Login passwords.** Each portal has a prototype password shown on the form (doctor2026,
  nurse2026, admin2026). These aren't secrets and there's no account behind them. Signup requires a
  password of at least 8 characters plus confirmation, and that account can log back in with it until
  the page reloads. There's a show/hide toggle. Try Demo stays password-free because it's the guided
  tour. The real version is the Identity service (argon2 + JWT, Phase 1).
- **Sign-out confirmation**: a small confirm dialog (Escape or backdrop = cancel) before logging out.

### D-040: Dashboard keeps the risk chart, only restyled
- The user wanted the earlier dashboard info and colors back, keeping just the new chart shape.
  So the Admissions vs Discharges chart from D-039 is gone and the **Patient Risk by Department**
  chart (Low / Medium / High MEWS per department, green / orange / red like MewsChip) is back.
  It now uses the new look: grouped slim bars with rounded tops, a dot legend by the title, and a
  dark tooltip pill. No range chips, because the risk counts have no time axis.
- Ward occupancy bars are green / orange / red again (under 70%, 70-89%, 90%+).
- `PatientFlowChart`, `PATIENT_FLOW` and `PatientFlowPoint` were removed since nothing uses them. The
  Nurse tour chips no longer mention revenue or admission trends.

### D-041: No Billing tab for clinicians, no Inventory tab for IT
- **Billing** was removed from the Doctor and Nurse portals. The paper gives UC-12/13 (charges and
  eClaims) to Billing Staff, and revenue belongs to Billing Staff and the Hospital Admin. Those
  portals aren't built yet, so `BillingView` was deleted. It can be brought back from git history
  when they are. The `manageBilling` permission and `REVENUE_DATA` stay for that later portal.
- **Inventory** was removed from the IT portal. No FSA or use case covers stock management, and
  pharmacy is dispensing-only. `InventoryView` was deleted. The `INVENTORY` list stays because
  E-Prescribing uses it for drug name suggestions.
- The tours lost those steps: Nurse 6 steps, IT 3 steps.

### D-042: Conversion to microservices
- The eight FSAs from the paper (TABLE IV) are now separate NestJS 11 services, each in its own
  container. Every service has REST controller → service → repository layers, `/health`, and
  OpenAPI docs at `/api/<name>/docs`.
- **NestJS 11, not 12.** NestJS 12 is ESM-only, which clashed with the shared package that the
  CommonJS services and the Next app both import. 11 is still maintained.
- **Stack as in TABLE IX:** Nginx (the only exposed port, 8080) → Kong 3.9 in DB-less mode (JWT
  check, rate limit, CORS, correlation IDs) → the services. RabbitMQ topic exchange `wah.events`
  with a dead-letter queue. One PostgreSQL 16 instance with one schema and one login per service
  and no cross-schema grants. Docker Compose runs all of it.
- **Kong path handling:** services use `/api/<name>` as their own global prefix and Kong doesn't
  strip it. When Kong stripped the prefix, the Swagger UI asset links broke.
- **JWTs are checked twice:** at Kong and again in each service, since services are reachable
  inside the Docker network without passing Kong.
- **Consumers are idempotent:** every service has a `processed_events` table keyed by `eventId`.
  A handler that throws sends the message to the dead-letter queue instead of retrying forever.
- **Publishing never blocks a request:** if RabbitMQ is down, events wait in memory and go out on
  reconnect. Tested: with Notifications stopped, vitals still save (201), and the alert is
  delivered from the queue after a restart (UC-05 6a, objective 2).
- **Per-service copies of patient data.** Clinical Records, Orders & Diagnostics, and
  Interoperability keep their own copies of the demographics they need, filled from
  `patient.registered`, instead of calling Identity (the C4 L2 event flows).
- **Seeds:** each service seeds the same 12 fictional patients as the web mock, so both modes look
  the same. Prototype passwords are stored as argon2id hashes of the public demo values.
- **Login:** a named account signs in with its own password. Any other name can use the portal's
  prototype password and gets a session under that name, tied to the portal's demo account ID, so
  the audit trail still points at a real row. Sign-up creates a real account. TODO(Phase 10): drop
  the prototype fallback.
- **Roles without portals** (Pharmacist, Billing Staff, Lab Staff, Hospital Admin) can be named
  on endpoints. Nobody holds them yet, so those endpoints (dispense, charges) stay closed.
- **Two web modes:** with `NEXT_PUBLIC_API_URL` set (Docker), every screen reads and writes
  through the services. Without it (the Vercel preview), the same screens run on the mock data.
  Supabase was removed, as the master prompt routes everything through Kong.
- **Inventory → formulary:** the old `INVENTORY` mock became `FORMULARY`, with no stock fields,
  matching dispensing-only.

### D-043: One folder per service, frontend and backend together
- Each service folder holds both halves: `services/<name>/backend` (the NestJS service) and
  `services/<name>/frontend` (the tab screens for that service's data plus its `api.ts` client).
  This lets anyone reading the repo see a whole service in one place.
- Screens were moved, not changed: Dashboard and Patients → clinical-records; Bed Management →
  scheduling; E-Prescribing, Pharmacy, and Laboratory → orders-diagnostics; Login, Profile, and
  Staff & Access → identity; the notification bell and MEWS Alerts panel → notifications. The
  audit table from Staff & Access became `AuditLogPanel` in audit-log, rendered in the same place.
- `apps/web` stays as the shell that builds the frontends into one Next.js app: routing by portal,
  sidebar, guided tour, shared UI (StatCard, ConfirmDialog), the data context, and the
  Architecture tab. That tab monitors all eight services, so it doesn't belong to any one of them.
- Next compiles the service frontends through `experimental.externalDir`. The `@services/*` path
  alias points at `services/`, and Tailwind scans `services/*/frontend`.
- The Billing and Interoperability frontends are empty for now (a README says why). Their screens
  belong to portals we haven't built.
- `npm run lint:frontends` lints the service frontends with the web app's ESLint config.

### D-044: Showing when a service is down
- When a service is down, Kong answers 502/503/504, or the request times out after 10s. The web
  shows "<Service> is unavailable right now. Nothing was saved; try again in a moment." instead of
  Kong's raw "invalid response from the upstream server".
- The data context records which services failed their last refresh. Each tab lists the services
  it reads from (`TABS[tab].services`), and `ServiceOfflineNotice` shows an amber notice on the
  affected tabs only. Other tabs, and the parts of the same tab served by other services, keep
  working. The notice clears itself on the next refresh after the service is back.
- The Dashboard's connectivity pill now says how many services are offline instead of always
  "Optimal".
- A failed MEWS acknowledgment now shows its error on the alert, which stays open. Before this
  the error was swallowed.
- Kong upstream timeouts are down to 3s connect / 15s read with 1 retry. With the defaults (60s,
  5 retries), a stopped container took about a minute to show up as down.

### D-045: Pharmacist and Billing Staff portals, remembered sign-in, loading screen
- **Two new portals** (TABLE XIII roles): Pharmacist (Pharmacy + Profile) and Billing Staff
  (Billing + Profile). The token role for Billing Staff is `Billing`. Demo accounts are
  `pharmacy2026` and `billing2026`, and the seeded pharmacist (Grace Villanueva) and billing clerk
  (Mark Aquino) can sign in too. Lab/Radiology, Registrar, and Hospital Admin portals come later
  the same way.
- **Dispensing (UC-10)** lives in Orders & Diagnostics: only a Pending order, with a quantity
  (partial fills allowed) and an optional note. A Review order or an already dispensed one is
  refused with a reason. RA 9165 controlled drugs are refused until step-up approval (master
  prompt §13) exists; one signature isn't enough, and we'd rather block than fake it. It
  publishes `medication.dispensed`, and Billing posts the drug charge from that event.
- **Billing (UC-12):** a copy of patient names, a per-patient accounts endpoint, and pricing of
  unpriced lines. Each price goes into an append-only `charge_adjustments` log with the reason and
  who set it, and publishes `charge.priced` (so it lands in the audit trail). Correcting a line
  that's already priced waits for Phase 6 (it needs a supervisor).
- **Each portal loads only what it reads.** A pharmacist never calls Clinical Records (they'd
  get a 403 anyway). Only "service unreachable" counts as offline, never a 403.
- **Staying signed in:** the JWT pair and the portal profile (name, role, open tab) are kept in
  sessionStorage, so a refresh lands on the same tab. We chose sessionStorage over localStorage
  on purpose: closing the tab or browser ends the session, which suits a shared ward PC. Signing
  out clears both. An expired refresh token sends you back to login.
- **Loading screen:** shown while the saved session is checked on start, and over the portal
  until its first data load finishes. It lists each service the portal needs as it answers
  (Connecting → Ready / Offline). It stays at least 700 ms so it never just flashes.
- The seed and schema files were edited in place instead of adding migrations, since nothing is
  deployed with a database yet. Anyone who ran the earlier stack needs `docker compose down -v`.
