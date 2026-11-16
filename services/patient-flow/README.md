# Patient Flow service

Wards, beds, admission with the bed lock, and transfers. Scheduling, the queue, and the discharge process come in later phases (comment matrix 2: discharge lives here).

Use cases: UC-02 Manage Patient Scheduling and Admission

```
services/patient-flow/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=patient-flow`.

## Backend

- Database schema `patient_flow`: `wards`, `admissions`
- Endpoints (through Kong, under `/api/patient-flow`):
  - `GET /wards`, `GET /admissions` (Admitting Clerk, Physician, Nurse)
  - `POST /admissions` (Admitting Clerk, Nurse): checks the patient with the Patient Registry first
  - `GET /admissions/history` (other services only)
  - `GET /health` and API docs at `/docs`
- Publishes: `flow.patient.admitted`, `flow.patient.transferred`
- Listens for: nothing

## Frontend

- `BedManagementView.tsx`: the **Bed Management** tab
- `AdmitDialog.tsx`: admit and transfer; the attending physician comes from the provider registry
