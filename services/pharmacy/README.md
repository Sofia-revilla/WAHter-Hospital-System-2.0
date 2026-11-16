# Pharmacy service

Prescriptions, the formulary, and dispensing. Dispensing only: no stock levels or reorder points (paper Limitation d).

Use cases: UC-04 Process Medication Orders and Dispensing

```
services/pharmacy/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=pharmacy`.

## Backend

- Database schema `pharmacy`: `formulary`, `medication_orders`
- Endpoints (through Kong, under `/api/pharmacy`):
  - `GET /formulary`
  - `GET /medication-orders` (Physician, Nurse, Pharmacist)
  - `POST /medication-orders` (Physician)
  - `POST /medication-orders/:id/dispense` (Pharmacist)
  - `GET /health` and API docs at `/docs`
- Publishes: `pharmacy.medication.ordered`, `pharmacy.medication.dispensed`
- Listens for: nothing

## Frontend

- `PrescriptionView.tsx`: **E-Prescribing** (Physician)
- `PharmacyView.tsx`: the **Pharmacy** worklist
