-- Diagnostics: laboratory and radiology orders and their results (UC-05).
-- patient_id and ordered_by_id are reference IDs into the Patient Registry
-- and the Access & Provider Registry; no names are copied here.

CREATE TABLE diagnostic_orders (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  test text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('Laboratory', 'Radiology')),
  priority text NOT NULL CHECK (priority IN ('Urgent', 'Routine')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In-Progress', 'Completed')),
  -- UC-05 8a: critical results are flagged for immediate physician notice
  is_critical boolean NOT NULL DEFAULT false,
  ordered_by_id text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  resulted_at timestamptz
);

CREATE SEQUENCE diagnostic_order_number START 5600;
