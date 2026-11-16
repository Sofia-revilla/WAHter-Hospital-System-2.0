# Notifications service

MEWS alerts, acknowledgment (final once given), and escalation of High alerts nobody acknowledges within 15 minutes.

Use cases: UC-03 extension 6a, US-32

```
services/notifications/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=notifications`.

## Backend

- Database schema `notifications`: `alerts`
- Endpoints (through Kong, under `/api/notifications`):
  - `GET /alerts`, `POST /alerts/:id/acknowledge` (Physician, Nurse)
  - `GET /health` and API docs at `/docs`
- Publishes: `notifications.alert.acknowledged`
- Listens for: `clinical.mews.alert`

## Frontend

- `NotificationBell.tsx`: the bell in the top bar
- `MewsAlertsPanel.tsx`: the MEWS Alerts card on the Dashboard
