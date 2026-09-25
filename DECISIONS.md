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
