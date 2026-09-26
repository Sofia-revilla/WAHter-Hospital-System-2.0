# Billing service

Charge capture. Billing listens for admissions, test orders, and dispensing on the bus and posts the charges itself; unpriced items are flagged.

Use cases: UC-12 Itemize Charges (UC-13 eClaims comes in Phase 7a)

```
services/billing/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `billing`: `charge_master`, `charges`
- Endpoints (through Kong):
  - `GET /api/billing/charges` (Billing Staff and Hospital Admin only)
  - `GET /api/billing/health` and API docs at `/api/billing/docs`
- Publishes: `charge.posted`
- Listens for: `patient.admitted`, `diagnostic.ordered`, `medication.dispensed`

## Frontend

Billing has no tab yet: it belongs to the Billing Staff and Hospital Admin portals, which aren't built (see DECISIONS.md D-041). Their screens will go in this folder.
