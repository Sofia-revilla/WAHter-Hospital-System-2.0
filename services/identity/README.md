# Identity service

Staff login (JWT), role-based access, and the Master Patient Index (MPI).

Use cases: UC-01 Register Patient Identity, UC-16 User Access

```
services/identity/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `identity`: `staff`, `patients` (MPI)
- Endpoints (through Kong):
  - `POST /api/identity/auth/login`, `/auth/signup`, `/auth/refresh`
  - `GET /api/identity/staff` (IT)
  - `GET /api/identity/patients`, `POST /patients`, `POST /patients/match` (MPI matching)
  - `GET /api/identity/health` and API docs at `/api/identity/docs`
- Publishes: `staff.logged-in`, `patient.registered`
- Listens for: nothing

## Frontend

- `LoginScreen.tsx`: the login overlay (portal picker, sign in, sign up, Try Demo)
- `ProfileView.tsx`: the **Profile** tab (all five portals)
- `StaffAccessView.tsx`: the **Staff & Access** tab (IT), with the audit panel from `audit-log/frontend`
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
