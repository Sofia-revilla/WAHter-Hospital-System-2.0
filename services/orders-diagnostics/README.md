# Orders & Diagnostics service

The formulary, medication orders, and lab/radiology orders. Pharmacy is dispensing-only, so there's no stock.

Use cases: UC-09 Prescribe, UC-10 Dispense, UC-11 Diagnostic Order

```
services/orders-diagnostics/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `orders`: `patients` (copy), `formulary`, `medication_orders`, `diagnostic_orders`
- Endpoints (through Kong):
  - `GET /api/orders-diagnostics/formulary`
  - `GET /api/orders-diagnostics/medication-orders`, `POST` (Doctor)
  - `GET /api/orders-diagnostics/diagnostic-orders`, `POST` (Doctor)
  - `GET /api/orders-diagnostics/health` and API docs at `/api/orders-diagnostics/docs`
- Publishes: `medication.ordered`, `diagnostic.ordered`
- Listens for: `patient.registered`

## Frontend

- `PrescriptionView.tsx`: the **E-Prescribing** tab (Doctor)
- `PharmacyView.tsx`: the **Pharmacy** tab (Doctor, Nurse; read-only until the Pharmacist portal)
- `LaboratoryView.tsx`: the **Laboratory** tab (Doctor orders, Nurse follows)
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
