<p align="center">
  <img src="apps/web/public/wah-logo.png" alt="WAH logo" width="96" />
</p>

# WAHter (WAH2.0) Hospital System

WAHter is an inpatient hospital information system for Philippine DOH Level 2–3 LGU hospitals.
It re-engineers WAH4H V1 from one monolith into eight microservices, one per functional service
area in our paper: Identity, Clinical Records, Scheduling, Orders & Diagnostics, Billing,
Interoperability, Notifications, and Audit Log. The pilot reference site is Concepcion District
Hospital.

**Live demo:** https://wahter-hospital-system.vercel.app (the web app on mock data, see below)

> All patients, staff, and records in this system are fictional. No real patient data is used.

## How the repo is organized

Every service has its own folder with its own **backend** (a NestJS service in its own container,
with its own database schema) and its own **frontend** (the tab screens that show that service's
data). The web app in `apps/web` is only the shell that puts the portals together.

```
services/
├── identity/             login, staff accounts, patient registry (MPI)
│   ├── backend/          → own container, schema "identity"
│   └── frontend/         → Login screen, Profile tab, Staff & Access tab
├── clinical-records/     census, vital signs, MEWS
│   ├── backend/          → schema "clinical"
│   └── frontend/         → Dashboard tab, Patients tab
├── scheduling/           wards, beds, admissions
│   ├── backend/          → schema "scheduling"
│   └── frontend/         → Bed Management tab
├── orders-diagnostics/   prescriptions, formulary, lab/radiology orders
│   ├── backend/          → schema "orders"
│   └── frontend/         → E-Prescribing, Pharmacy, and Laboratory tabs
├── notifications/        MEWS alerts, acknowledgment, escalation
│   ├── backend/          → schema "notifications"
│   └── frontend/         → notification bell, MEWS Alerts panel
├── audit-log/            append-only audit trail
│   ├── backend/          → schema "audit"
│   └── frontend/         → Audit Log panel (in Staff & Access)
├── billing/              charge capture from bus events
│   ├── backend/          → schema "billing"
│   └── frontend/         → (Billing Staff portal, not built yet)
└── interoperability/     FHIR R4 reads, DOH report exports
    ├── backend/          → schema "interop"
    └── frontend/         → (Hospital Admin portal, not built yet)

apps/web/                 the shell: portal routing, sidebar, guided tour, shared UI,
                          and the Architecture tab (it watches all eight services)
packages/shared/          event bus, database access, JWT guard, MEWS scoring
infra/                    nginx, Kong (API gateway), Postgres setup
docker-compose.yml        runs the whole system
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
- **Events instead of cross-service calls.** Charting High-risk vitals in Clinical Records
  publishes `mews.alert.high`. Notifications turns it into an alert and Audit Log records it.
  Admitting a patient in Scheduling makes Billing post the bed charge on its own.
- **Fault isolation.** If a service is down, the rest keep working. Vitals still save with
  Notifications stopped, and the alert is delivered from the queue once it's back.

## Running the full system (Docker)

Needs Docker Desktop.

```bash
cp .env.example .env
docker compose up --build
```

Then open http://localhost:8080. The first build takes a few minutes. The databases are created
and seeded on first start.

- API docs for each service: `http://localhost:8080/api/<service>/docs`, for example
  http://localhost:8080/api/clinical-records/docs
- RabbitMQ dashboard (watch the event queues): http://localhost:15672, user `wahter` with the
  password from `.env`

To start again from a clean database: `docker compose down -v`

## Running only the web app (no Docker)

```bash
npm install
npm run dev:web
```

Then open http://localhost:3000. Without `NEXT_PUBLIC_API_URL`, the screens run on the mock data in
`apps/web/src/constants.ts`. This is how the Vercel demo runs. To point the dev server at the Docker
services instead, start it with `NEXT_PUBLIC_API_URL=http://localhost:8080/api`.

## Signing in

Pick a portal and sign in with its prototype password. These are public demo values, not secrets.

| Portal | Password |
| --- | --- |
| Doctor's Portal | `doctor2026` |
| Nurse's Portal | `nurse2026` |
| Administrator Portal | `admin2026` |

**Try Demo** gives a guided tour of each role. With Docker running, logins go through the Identity
service and get a real JWT.

## What each role sees

- **Doctor**: Dashboard, Patients, E-Prescribing, Pharmacy (view), Laboratory (order tests), Bed
  Management, Profile
- **Nurse**: Dashboard, Patients (chart vitals with MEWS), Pharmacy (view), Bed Management
  (admit/transfer), Laboratory (view), Profile
- **IT Admin**: Architecture (live service health), Staff & Access (accounts and audit log),
  Profile. No patient data (RA 10173).

MEWS is decision support only. It never replaces clinical judgment.

## Tech stack

Next.js 15, React 19, TypeScript, Tailwind CSS 4 · NestJS 11 · Kong 3.9 (DB-less) · Nginx ·
RabbitMQ 3.13 · PostgreSQL 16 · Docker Compose

`PLAN.md` has the build phases and `DECISIONS.md` logs the choices we made along the way.

## Team Unica Hija

- Cheng, Sheila Nicole
- Ramos, Niña Arcel
- Revilla, Ma. Sofia Anne
- Salud, Gwyneth

**Advisers:** Jose Eugenio L. Quesada and Ryan John Perez

Built with the Wireless Access for Health (WAH) team as our partner.
