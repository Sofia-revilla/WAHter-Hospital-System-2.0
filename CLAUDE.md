# WAHter (WAH2.0) — working notes for Claude Code

Inpatient hospital information system for Philippine Level 2–3 LGU hospitals.
Team UNICA-HIJA, built with the WAH NGO. PBL capstone: the code is reviewed and
graded as academic work.

## Read first

1. **docs/MASTER_PROMPT.md**: the build spec (architecture, services, UI, phases). Read it fully.
2. **PLAN.md**: phase checklist and what's already done.
3. **DECISIONS.md**: every place we deviated from the master prompt, and why.

## Which source wins

User's direct instruction (including the numbered "Prompt N" build prompts) >
docs/MASTER_PROMPT.md > the WAH2.0 paper (background context only).
If the master prompt contradicts itself, take the reading closest to its literal
text and write the choice down in DECISIONS.md. Don't stop to ask unless a wrong
guess would be expensive to undo.

## Repo layout

```
apps/web            Next.js 15 + React 19 + Tailwind 4 frontend (src/App.tsx is the main file)
services/*          NestJS services (not started yet; see PLAN.md)
packages/shared     shared types, event contracts, role constants (not started yet)
infra/              docker, kong, nginx (not started yet)
docs/               master prompt, ERD.md, PHCORE_MAPPING.md
```

## Commands

```
npm install                 # from the repo root (npm workspaces)
npm run dev:web             # http://localhost:3000
npm run build:web
npm run lint:web
```

## Code style (from the team's developer briefing)

- Write like a competent mid-level dev: clear over clever. No `any` unless unavoidable, and comment why.
- PascalCase components, camelCase helpers and hooks. Props interface sits right above its component.
- Named exports only, except Next.js page entries.
- Tailwind class lists longer than ~6 tokens go on their own line(s) inside `cn()`.
- SCREAMING_SNAKE_CASE only for module-level constant arrays/config objects.
- **Comments explain WHY, never WHAT.** Comment an import only if its name is surprising
  (e.g. `motion/react`, not `framer-motion`). Record decisions, gotchas and workarounds.
- TODOs name the real work and why it's deferred: `// TODO(Phase 3): …`. No bare "TODO: fix".
- JSX comments only for genuinely ambiguous blocks (e.g. a click-to-close backdrop).
- Section dividers stay short: `// ─── LOGIN SCREEN ───`. Number them only in big monolith files like App.tsx.
- File header: ≤10 lines, team name, purpose, anything a newcomer needs. No decorative borders.
- No `/** */` on internal components, no `// end of X`, no AI attribution in code,
  no ALL-CAPS except `WARNING` / `HACK`.
- Write for a teammate catching up after a sick day. "We" is fine.

## Hard rules

- All seed and mock data is fictional. No real patient data, ever.
- Never commit secrets; `.env.example` only.
- Local only: no cloud deployment config.
