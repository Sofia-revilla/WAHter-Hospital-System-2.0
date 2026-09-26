<p align="center">
  <img src="apps/web/public/wah-logo.png" alt="WAH logo" width="96" />
</p>

# WAHter (WAH2.0) Hospital System

WAHter is an inpatient hospital information system for Philippine DOH Level 2–3 LGU hospitals.
It re-engineers WAH4H V1 into separate functional service areas: Identity, Clinical Care,
Scheduling, Billing, Orders & Diagnostics, Interoperability, Notifications, and Audit Log. The
pilot reference site is Concepcion District Hospital.

This repo has the web prototype of the staff portals. It covers ward census, bed management,
patient charting with MEWS (Modified Early Warning Score) alerts, prescriptions and dispensing,
lab orders, and a system view for the IT admin.

**Live demo:** https://wahter-hospital-system.vercel.app

> All patients, staff, and records in this prototype are fictional. No real patient data is used.

## Trying the demo

On the login screen, pick a portal and sign in with its prototype password. These are only for the
demo and there is no real account behind them.

| Portal | Password |
| --- | --- |
| Doctor's Portal | `doctor2026` |
| Nurse's Portal | `nurse2026` |
| Administrator Portal | `admin2026` |

You can also click **Try Demo** for a guided tour of each role, no password needed.

## What's in the prototype

- **Dashboard**: live admitted count, bed occupancy, MEWS alerts, and patient risk per department
- **Patients**: chart vitals (RR, SpO2, temperature, systolic BP, heart rate, level of consciousness);
  the MEWS score is computed right away and Medium/High raises an alert
- **Bed Management**: admit or transfer a patient into a free bed, filter wards
- **Pharmacy**: dispensing only (no stock or inventory, per the paper's scope)
- **Laboratory**: doctors order tests, results show with a critical flag
- **IT Admin**: service architecture status, staff access, and the audit log (no patient data)

MEWS is decision support only. It never replaces clinical judgment.

## Running it locally

Needs Node.js 20 or newer.

```bash
npm install
npm run dev:web
```

Then open http://localhost:3000. No environment variables are needed; the app runs on the mock data
in `apps/web/src/constants.ts`.

## Tech stack

- **Web prototype (this repo):** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Recharts, Motion
- **Planned backend (from the paper):** NestJS services behind Kong and Nginx, RabbitMQ event bus,
  PostgreSQL with one schema per service, Docker Compose

`PLAN.md` has the build phases and `DECISIONS.md` logs the choices we made along the way.

## Team Unica Hija

- Cheng, Sheila Nicole
- Ramos, Niña Arcel
- Revilla, Ma. Sofia Anne
- Salud, Gwyneth

**Advisers:** Jose Eugenio L. Quesada and Ryan John Perez

Built with the Wireless Access for Health (WAH) team as our partner.
