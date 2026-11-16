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

- Database schema `audit`: `entries` (append-only, with an outcome per entry)
- Endpoints (through Kong, under `/api/audit-log`):
  - `GET /entries?actor=&action=&from=&to=&page=&pageSize=`, `GET /entries/export` (CSV) (System Administrator)
  - `POST /internal/gateway-log` (Kong only, on wah-net; not routed through Kong)
  - `GET /health` and API docs at `/docs`
- Publishes: nothing
- Listens for: `#` (every event)

## Frontend

- `AuditLogView.tsx`: the **Audit Log** tab (System Administrator)
