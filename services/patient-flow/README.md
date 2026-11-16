# Patient Flow service

Wards, rooms, and beds; admission with the bed lock; transfers; scheduling and the queue. The
discharge process comes in Phase 7 (comment matrix 2: discharge lives here).

Use cases: UC-02 Manage Patient Scheduling and Admission (US-6 to US-9, US-44)

```
services/patient-flow/
├── backend/    NestJS service, its own container and database schema
│   ├── src/    REST controllers → services → repositories
│   └── db/     numbered SQL migrations + seed.sql (fictional data)
└── frontend/   the screens for this service, bundled into apps/web
```

The image is built from `infra/docker/service.Dockerfile` with `SERVICE=patient-flow`.

## Backend

- Database schema `patient_flow`: `wards`, `rooms`, `beds`, `admissions`, `bed_assignments`,
  `bed_status_log`, `appointments`
- `src/flow-rules.ts`: free slots and alternative beds, unit tested in `flow-rules.test.ts`
- Endpoints (through Kong, under `/api/patient-flow`):
  - `GET /bed-board` (Admitting Clerk, Physician, Nurse): wards → rooms → beds with occupants
  - `GET /wards` (also System Administrator): the layout, no occupants
  - `GET /admissions`, `GET /admissions/:id` (Admitting Clerk, Physician, Nurse)
  - `POST /admissions` (Admitting Clerk, Nurse): checks the patient and physician first; 409 with
    free beds when the bed was taken
  - `POST /admissions/:id/transfer` (Nurse): new bed and a reason
  - `GET /appointments`, `GET /appointments/availability`, `POST /appointments`,
    `POST /appointments/:id/check-in`, `POST /appointments/:id/status`, `GET /queue` (Admitting Clerk)
  - `/config/...` (System Administrator): add wards, rooms, beds; set a bed's status; bed history
  - `GET /admissions/history` (other services only, closed at Kong)
  - `GET /health` and API docs at `/docs`
- Publishes: `flow.patient.admitted`, `flow.bed.assigned`, `flow.patient.transferred`,
  `flow.bed.status-changed`, `flow.ward.configured`, `flow.appointment.booked`,
  `flow.appointment.updated`
- Listens for: nothing

## Frontend

- `BedManagementView.tsx`: the **Bed Management** tab (live bed board)
- `AdmitDialog.tsx`: admit and assign a bed; the patient comes from the Patient Registry, the
  attending physician from the Provider Registry
- `TransferDialog.tsx`: the nurse's transfer, with a reason
- `SchedulingView.tsx`: the **Scheduling and Queue** tab (Admitting Clerk)
- `WardSetupView.tsx`: the **Wards, Rooms and Beds** tab (System Administrator)
