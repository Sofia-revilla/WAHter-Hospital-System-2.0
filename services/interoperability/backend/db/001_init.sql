-- Interoperability: FHIR R4 reads and DOH reports (UC-14, UC-15). It's the
-- only service allowed to talk to systems outside the hospital, so it keeps
-- its own copies of what it exposes instead of proxying other services.

CREATE TABLE patients (
  id text PRIMARY KEY,
  name text NOT NULL,
  sex text NOT NULL,
  birth_date date NOT NULL,
  philhealth_pin text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admissions (
  admission_id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients (id),
  ward_id text NOT NULL,
  admission_type text NOT NULL,
  admitted_at timestamptz NOT NULL
);

CREATE TABLE report_runs (
  id text PRIMARY KEY,
  kind text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  generated_by text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  -- the exported rows, kept so a submitted report can be re-downloaded as it was
  payload jsonb NOT NULL
);

CREATE SEQUENCE report_number START 1;
