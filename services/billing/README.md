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

- Database: `billing`: `patients` (copy), `charge_master`, `charges`, `charge_adjustments` (append-only)
- Endpoints (through Kong):
  - `GET /api/billing/charges`, `GET /api/billing/accounts` (Billing Staff, Hospital Admin)
  - `POST /api/billing/charges/:id/price` (prices an unpriced line and logs the reason)
  - `GET /api/billing/health` and API docs at `/api/billing/docs`
- Publishes: `charge.posted`, `charge.priced`
- Listens for: `patient.admitted`, `diagnostic.ordered`, `medication.dispensed`, `patient.registered`

## Frontend

- `BillingView.tsx`: the **Billing** tab (Billing Staff): accounts, captured charges, pricing
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
