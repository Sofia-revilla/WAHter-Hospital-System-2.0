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
