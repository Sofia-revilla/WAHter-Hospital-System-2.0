# Clinical Care service

Encounters, vital signs, and MEWS. Notes, ICD-10 diagnoses, and the discharge summary come with Phases 4 and 7.

Use cases: UC-03 Document and Monitor Patient Care

```
services/clinical-care/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=clinical-care`.

## Backend

- Database schema `clinical`: `encounters`, `vitals` (immutable)
- Endpoints (through Kong, under `/api/clinical-care`):
  - `GET /encounters/open` (Physician, Nurse)
  - `GET /vitals`, `POST /vitals` (Physician, Nurse)
  - `GET /health` and API docs at `/docs`
- Publishes: `clinical.vitals.recorded`, `clinical.mews.alert`
- Listens for: `flow.patient.admitted` (opens the encounter)

## Frontend

- `DashboardView.tsx`: the **Dashboard**
- `PatientsView.tsx`: the **Patients** tab
- `VitalsDialog.tsx`: charting vitals with the live MEWS preview
