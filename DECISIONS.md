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
