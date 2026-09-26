# Audit Log service

An append-only record of every event on the bus. Searching or exporting the log is logged too (meta-audit).

Use cases: UC-16 Inspect Audit Trail

```
services/audit-log/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `audit`: `entries` (a trigger blocks UPDATE and DELETE)
- Endpoints (through Kong):
  - `GET /api/audit-log/entries?search=` (IT; the search itself is logged)
  - `POST /api/audit-log/entries/exports` (IT; records a CSV export)
  - `GET /api/audit-log/health` and API docs at `/api/audit-log/docs`
- Publishes: nothing
- Listens for: `#` (every event)

## Frontend

- `AuditLogPanel.tsx`: the Audit Log section of the **Staff & Access** tab (IT)
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
