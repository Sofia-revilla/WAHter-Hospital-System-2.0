# Scheduling service

Wards, bed assignment, admissions, and transfers. The bed lock is a unique index, so two nurses can't take the same bed.

Use cases: UC-03 Manage Scheduling, UC-04 Admit and Assign Bed

```
services/scheduling/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `scheduling`: `wards`, `admissions`
- Endpoints (through Kong):
  - `GET /api/scheduling/wards`
  - `GET /api/scheduling/admissions`, `POST /admissions` (admit or transfer; 409 if the bed was just taken)
  - `GET /api/scheduling/health` and API docs at `/api/scheduling/docs`
- Publishes: `patient.admitted`, `patient.transferred`
- Listens for: nothing

## Frontend

- `BedManagementView.tsx` + `AdmitDialog.tsx`: the **Bed Management** tab (Doctor, Nurse)
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
