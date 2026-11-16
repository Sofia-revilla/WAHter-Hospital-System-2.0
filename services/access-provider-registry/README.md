# Access & Provider Registry service

Staff login (JWT), roles and permissions, and the provider registry: one of the two DOH-mandated registries (comment matrix 1 and 3). Other services keep only provider IDs and look names up here.

Use cases: UC-08 Administer System Access and System Audit

```
services/access-provider-registry/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=access-provider-registry`.

## Backend

- Database schema `access`: `staff`
- Endpoints (through Kong, under `/api/access-provider-registry`):
  - `POST /auth/login`, `/auth/signup`, `/auth/refresh` (no token)
  - `GET /staff` (System Administrator)
  - `GET /providers?role=` (every staff role, and other services)
  - `GET /health` and API docs at `/docs`
- Publishes: `access.login.succeeded`
- Listens for: nothing

## Frontend

- `LoginScreen.tsx`: the login overlay
- `ProfileView.tsx`: the **Profile** tab (every portal)
- `StaffAccessView.tsx`: **Staff & Access** (System Administrator), with the audit panel from `audit-log/frontend`
