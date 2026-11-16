# Interoperability & Reporting service

FHIR R4 exchange and hospital/DOH reports. Keeps no copies of patients or admissions: it reads them through the Patient Registry and Patient Flow APIs when asked. Export files only, no live submission.

Use cases: UC-07 Generate Hospital Reports, UC-09 Exchange Clinical Data (FHIR)

```
services/interoperability-reporting/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=interoperability-reporting`.

## Backend

- Database schema `interop`: `report_runs`, `exchange_transactions` (the outbox to WAH Systems)
- Endpoints (through Kong, under `/api/interoperability-reporting`):
  - `GET /fhir/Patient`, `/fhir/Patient/:id`, `/fhir/Encounter`
  - `GET /reports`, `POST /reports/admissions-summary` (Hospital Administrator)
  - `GET /health` and API docs at `/docs`
- Publishes: `reporting.report.generated`, `interop.exchange.updated`
- Listens for: `patient.registered`, `patient.updated`, `patient.merged` (shares them with WAH Systems)

## Frontend

- None yet. The Hospital Administrator portal comes with Phase 9 and the Data Exchange screen with Phase 10.
