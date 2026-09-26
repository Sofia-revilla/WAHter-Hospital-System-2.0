# Clinical Records service

The inpatient census, vital signs charting, and MEWS scoring.

Use cases: UC-05 Chart Encounter, UC-06 Record Diagnosis

```
services/clinical-records/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   ├── db/     numbered SQL migrations + seed.sql (fictional data)
│   └── Dockerfile
└── frontend/   the tab screens for this service, bundled into apps/web
```

## Backend

- Database: `clinical`: `patients` (copy), `encounters`, `vitals` (immutable)
- Endpoints (through Kong):
  - `GET /api/clinical-records/patients` (census)
  - `GET /api/clinical-records/vitals`, `POST /vitals` (scores MEWS server-side)
  - `GET /api/clinical-records/health` and API docs at `/api/clinical-records/docs`
- Publishes: `vitals.recorded`, `mews.alert.medium`, `mews.alert.high`
- Listens for: `patient.registered`, `patient.admitted`

## Frontend

- `DashboardView.tsx`: the **Dashboard** tab (Doctor, Nurse)
- `PatientsView.tsx` + `VitalsDialog.tsx`: the **Patients** tab and vitals charting
- `PatientCard.tsx`, `PatientRiskChart.tsx`, `MewsChip.tsx`: pieces of the two tabs above
- `api.ts`: this service's API calls, used by `apps/web/src/context/DataContext.tsx`
