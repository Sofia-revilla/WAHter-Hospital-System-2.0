# Audit Log service

Append-only record of every event on the bus, plus every search and export of the log itself. The one place an actor's name is stored next to the action, since an audit record has to say who did it at the time.

Use cases: UC-08 (US-41 to US-43)

```
services/audit-log/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=audit-log`.

## Backend

- Database schema `audit`: `entries` (append-only)
- Endpoints (through Kong, under `/api/audit-log`):
  - `GET /entries`, `POST /entries/exports` (System Administrator)
  - `GET /health` and API docs at `/docs`
- Publishes: nothing
- Listens for: `#` (every event)

## Frontend

- `AuditLogPanel.tsx`: the audit trail on **Staff & Access**
