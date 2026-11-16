# Patient Registry service (MPI)

The DOH-mandated patient registry and Master Patient Index (comment matrix 1 and 3). The only place patient identity is stored; every other service holds just the MPI number.

Use cases: UC-01 Register and Manage Patient Identity

```
services/patient-registry/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=patient-registry`.

## Backend

- Database schema `patient_registry`: `patients`
- Endpoints (through Kong, under `/api/patient-registry`):
  - `GET /patients?ids=A,B` and `?identifier=` (patient-facing roles and other services; never the System Administrator)
  - `GET /patients/:id`
  - `POST /patients/match`, `POST /patients` (Admitting Clerk, Nurse)
  - `GET /health` and API docs at `/docs`
- Publishes: `patient.registered`
- Listens for: nothing

## Frontend

- `api.ts`: ID-to-name lookups used by `DataContext`. The registration screens come with Phase 2.
