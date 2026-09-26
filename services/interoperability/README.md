# Interoperability service

FHIR R4 reads (Patient, Encounter) and DOH report exports. The only service allowed to talk to outside systems.

Use cases: UC-14 FHIR Exchange, UC-15 DOH Report

```
services/interoperability/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `interop`: `patients` and `admissions` (copies), `report_runs`
- Endpoints (through Kong):
  - `GET /api/interoperability/fhir/Patient`, `/fhir/Patient/:id`, `/fhir/Encounter`
  - `GET /api/interoperability/reports`, `POST /reports/admissions-summary` (aggregate, no patient IDs)
  - `GET /api/interoperability/health` and API docs at `/api/interoperability/docs`
- Publishes: `report.generated`
- Listens for: `patient.registered`, `patient.admitted`

## Frontend

No tab yet: FHIR is for other WAH systems, and DOH reports belong to the Hospital Admin portal. Screens for them will go in this folder.
