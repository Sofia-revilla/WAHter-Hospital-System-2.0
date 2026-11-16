<p align="center">
  <img src="apps/web/public/wahter-logo.png" alt="WAH logo" width="96" />
</p>

# WAHter (WAH2.0) Hospital System

WAHter is an inpatient hospital information system for Philippine DOH Level 2–3 LGU hospitals.
It re-engineers WAH4H V1 from one monolith into ten microservices, one per functional service
area in our paper (TABLE IV): Access & Provider Registry, Patient Registry (MPI), Patient Flow,
Clinical Care, Diagnostics, Pharmacy, Billing & Revenue Cycle, Interoperability & Reporting,
Notifications, and Audit Log. The pilot reference site is Concepcion District Hospital.

> All patients, staff, and records in this system are fictional. No real patient data is used.

## How the repo is organized

Every service has its own folder with its own **backend** (a NestJS service in its own container,
with its own database schema) and its own **frontend** (the screens that show that service's
data). The web app in `apps/web` is only the shell that puts the portals together.

```
services/
├── access-provider-registry/   login, roles and permissions, provider registry   schema "access"
├── patient-registry/           Master Patient Index (MPI)                         schema "patient_registry"
├── patient-flow/               wards, beds, admission, transfer (discharge later) schema "patient_flow"
├── clinical-care/              encounters, vital signs, MEWS                      schema "clinical"
├── diagnostics/                laboratory and radiology orders                    schema "diagnostics"
├── pharmacy/                   prescriptions, formulary, dispensing only          schema "pharmacy"
├── billing-revenue-cycle/      charge capture and pricing                         schema "billing"
├── interoperability-reporting/ FHIR R4 exchange, hospital and DOH reports          schema "interop"
├── notifications/              MEWS alerts, acknowledgment, escalation            schema "notifications"
└── audit-log/                  append-only audit trail                            schema "audit"

apps/web/                 the shell: portal routing, sidebar, guided tour, shared UI,
                          and the Architecture tab (it watches all ten services)
packages/shared/          event bus, database access, JWT guard, roles, MEWS scoring
infra/                    nginx, Kong (API gateway), Postgres setup, the service Dockerfile
docker-compose.yml        runs the whole system on network wah-net
```

Each `services/<name>/README.md` lists that service's tables, endpoints, and events.

### How the pieces talk

```
browser → nginx (:8080) → Kong (JWT, rate limit, CORS) → /api/<service>/... → that service
                                                                   │
                                   services never share tables ────┤
                                   they publish events on RabbitMQ ┘
```

- **One Postgres, one schema per service.** Each service logs in as its own database user that can
  only see its own schema, so no service can read another's tables.
- **Registries own identity.** Patient details live only in the Patient Registry and provider
  details only in the Access & Provider Registry. Every other service keeps reference IDs and
  asks the registry when it needs a name (comment matrix 3 and 7). No foreign keys cross schemas.
- **Events instead of cross-service writes.** Event names follow `service.thing.action`.
  Charting High-risk vitals in Clinical Care publishes `clinical.mews.alert`; Notifications turns
  it into an alert and Audit Log records it. Admitting a patient in Patient Flow makes Billing
  post the bed charge and Clinical Care open the encounter.
- **Fault isolation.** If a service is down, the rest keep working. Vitals still save with
  Notifications stopped, and the alert is delivered from the queue once it's back. A message a
  consumer can't handle goes to the dead-letter queue, never silently dropped.

## Running the system (Docker)

Needs Docker Desktop.

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:8080. The first build takes a few minutes. The databases are created
and seeded on first start.

- API docs for each service: `http://localhost:8080/api/<service>/docs`, for example
  http://localhost:8080/api/clinical-care/docs
- RabbitMQ dashboard (watch the event queues): http://localhost:15672, user `wahter` with the
  password from `.env`

To start again from a clean database: `docker compose down -v`. Do this once if you ran a version
from before the ten-service split, since the schemas changed.

There's no mock or offline mode any more: the web app always reads the live services. If they
can't be reached, the login screen says so and keeps checking until they're back.

## Signing in

Pick a portal and sign in with its prototype password. These are public demo values, not secrets.

| Portal | Password |
| --- | --- |
| Physician's Portal | `doctor2026` |
| Nurse's Portal | `nurse2026` |
| Pharmacy Portal | `pharmacy2026` |
| Billing Portal | `billing2026` |
| System Admin Portal | `admin2026` |

The Admitting Clerk, Ancillary (Laboratory and Radiology), and Hospital Administrator portals are
being added in the current update (see PLAN.md). A refresh keeps you signed in; signing out or
closing the tab ends it.

## What each role sees

Role names follow the use case diagram and live in one file, `packages/shared/src/roles.ts`.

- **Physician**: Dashboard, Patients, E-Prescribing, Pharmacy (view), Laboratory (order tests),
  Bed Management, Profile
- **Nurse**: Dashboard, Patients (chart vitals with MEWS), Pharmacy (view), Bed Management
  (admit/transfer), Laboratory (view), Profile
- **Pharmacist**: Pharmacy (dispense physician orders, partial fills, controlled drugs blocked
  until step-up approval exists), Profile
- **Billing Staff**: Billing (every captured charge per patient, price flagged items with a logged
  reason), Profile
- **System Administrator**: Architecture (live health of all ten services), Staff & Access
  (accounts and audit log), Profile. No patient data (RA 10173).

MEWS is decision support only. It never replaces clinical judgment.

## Tech stack

Next.js 15, React 19, TypeScript, Tailwind CSS 4 · NestJS 11 · Kong 3.9 (DB-less) · Nginx ·
RabbitMQ 3.13 · PostgreSQL 16 · Docker Compose

`PLAN.md` has the build phases and `DECISIONS.md` logs the choices we made along the way.

## Hosted version

The hosted version (Vercel, with an optional Cloudflare tunnel and Supabase database) is paused
while this update is built and tested locally. `npm run tunnel` and `npm run up:supabase` still
exist but shouldn't be run until the team decides to update the hosted version; PLAN.md will
have the checklist.

## Team Unica Hija

- Cheng, Sheila Nicole
- Ramos, Niña Arcel
- Revilla, Ma. Sofia Anne
- Salud, Gwyneth

**Advisers:** Jose Eugenio L. Quesada and Ryan John Perez

Built with the Wireless Access for Health (WAH) team as our partner.
