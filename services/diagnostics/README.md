# Diagnostics service

Laboratory and radiology orders. Worklists, result entry, and release come with Phase 6 (the Ancillary portal).

Use cases: UC-05 Process Diagnostic Orders and Results

```
services/diagnostics/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=diagnostics`.

## Backend

- Database schema `diagnostics`: `diagnostic_orders`
- Endpoints (through Kong, under `/api/diagnostics`):
  - `GET /diagnostic-orders` (Physician, Nurse, Laboratory and Radiology Staff)
  - `POST /diagnostic-orders` (Physician)
  - `GET /health` and API docs at `/docs`
- Publishes: `diagnostics.order.placed`
- Listens for: nothing

## Frontend

- `LaboratoryView.tsx`: the **Laboratory** tab
