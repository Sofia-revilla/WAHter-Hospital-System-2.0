# Notifications service

MEWS alerts, acknowledgment (final once given), and escalation of High alerts nobody acknowledges within 15 minutes.

Use cases: UC-08 Acknowledge MEWS Alert

```
services/notifications/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `notifications`: `alerts`
- Endpoints (through Kong):
  - `GET /api/notifications/alerts`
  - `POST /api/notifications/alerts/:id/acknowledge`
  - `GET /api/notifications/health` and API docs at `/api/notifications/docs`
- Publishes: `alert.acknowledged`
- Listens for: `mews.alert.*`

## Frontend

- `NotificationBell.tsx`: the bell in the top bar (every role)
- `MewsAlertsPanel.tsx`: the MEWS Alerts card on the Dashboard
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
