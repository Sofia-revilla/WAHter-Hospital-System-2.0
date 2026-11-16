-- Patient Registry (MPI): the only place patient identity is stored
-- (comment matrix 1 and 3). Every other service keeps just the patient ID
-- and asks this service for names and birth dates when it needs to show them.

CREATE TABLE patients (
  id text PRIMARY KEY,
  name text NOT NULL,
  sex text NOT NULL CHECK (sex IN ('Male', 'Female')),
  birth_date date NOT NULL,
  -- 12-digit PhilHealth Identification Number; exact match wins in MPI matching
  philhealth_pin char(12) UNIQUE,
  -- merged records are kept and pointed at the surviving one, never deleted
  merged_into text REFERENCES patients (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE patient_number START 13;
