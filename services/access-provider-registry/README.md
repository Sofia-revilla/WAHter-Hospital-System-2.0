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

- Database schema `access`: `staff` (provider registry), `accounts`, `login_challenges`, `approval_requests`
- Endpoints (through Kong, under `/api/access-provider-registry`):
  - `POST /auth/login`, `/auth/verify`, `/auth/refresh`, `/auth/demo` (no token); `POST /auth/logout`
  - `GET/POST /accounts`, `PATCH /accounts/:id`, `POST /accounts/:id/unlock`, `/restore`,
    `/approval-requests`; `GET /approval-requests`, `POST /approval-requests/:id/approve`, `/reject`
    (System Administrator)
  - `GET /providers?role=` (every staff role, and other services)
  - `GET /health` and API docs at `/docs`
- Publishes: `access.login.succeeded`, `access.login.failed`, `access.login.ended`, `access.account.*`
  (created, updated, disabled, restored, locked, unlocked), `access.role.changed`, `access.approval.*`
- Listens for: nothing

## Frontend

- `LoginScreen.tsx`: System Access, Staff Login, Access Key Verification
- `ProfileView.tsx`: the **Profile** tab (every portal)
- `UsersRolesView.tsx`: **Users and Roles** (System Administrator)
- `ProviderRegistryView.tsx`: **Provider Registry** (System Administrator)
