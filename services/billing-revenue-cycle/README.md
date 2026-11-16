# Billing & Revenue Cycle service

Charge capture from bus events and pricing with a logged adjustment. Invoices, payments, PhilHealth claims, and the discharge clearance come with Phases 7 and 8.

Use cases: UC-06 Process Patient Billing and Claims

```
services/billing-revenue-cycle/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=billing-revenue-cycle`.

## Backend

- Database schema `billing`: `charge_master`, `charges`, `charge_adjustments`
- Endpoints (through Kong, under `/api/billing-revenue-cycle`):
  - `GET /charges`, `GET /accounts`, `POST /charges/:id/price` (Billing Staff)
  - `GET /health` and API docs at `/docs`
- Publishes: `billing.charge.posted`, `billing.charge.priced`
- Listens for: `flow.patient.admitted`, `diagnostics.order.placed`, `pharmacy.medication.dispensed`

## Frontend

- `BillingView.tsx`: the **Billing** tab
