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

- Database schema `patient_registry`: `patients` (MPI), `patient_merges`, `identity_reviews`
- Endpoints (through Kong, under `/api/patient-registry`):
  - `GET /patients?ids=A,B` and `?identifier=`, `GET /patients/search?q=`, `GET /patients/:id`
    (patient-facing roles and other services; never the System Administrator)
  - `POST /patients/match`, `POST /patients`, `PATCH /patients/:id` (Admitting Clerk, Nurse)
  - `POST /patients/:id/duplicate-reports` (Admitting Clerk, Nurse, Physician)
  - `GET /identity-reviews`, `POST /identity-reviews/:id/merge`, `/keep-separate` (System Administrator)
  - `GET /health` and API docs at `/docs`
- Publishes: `patient.registered`, `patient.updated`, `patient.merged`, `patient.review.flagged`, `patient.review.resolved`
- Listens for: `interop.exchange.updated` (whether WAH Systems has the record)

## Frontend

- `RegistrationView.tsx`: **Registration** (Admitting Clerk, Nurse)
- `PatientSearchView.tsx`: **Patient Search** (Admitting Clerk, Billing Staff)
- `IdentityReviewView.tsx`: **Identity Review** (System Administrator)
- `RegistrationForm.tsx`, `PatientSearch.tsx`, `PatientProfileCard.tsx`, `validation.ts`: the pieces
- `api.ts`: also the ID-to-name lookups used by `DataContext`
