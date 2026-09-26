-- Orders & Diagnostics: the formulary, medication orders, and lab/radiology
-- orders (UC-09, UC-10, UC-11). Pharmacy is dispensing-only in WAH2.0, so
-- the formulary is a list of orderable drugs, with no stock counts.

CREATE TABLE patients (
  id text PRIMARY KEY,
  name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE formulary (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  form text NOT NULL,
  -- RA 9165 dangerous drugs need a second approval when dispensed (master prompt §13)
  is_controlled boolean NOT NULL DEFAULT false
);

CREATE TABLE medication_orders (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients (id),
  drug text NOT NULL,
  dose text NOT NULL,
  frequency text NOT NULL,
  route text,
  duration text,
  instructions text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispensed', 'Review')),
  prescribed_by text NOT NULL,
  prescribed_by_id text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  -- UC-10: filled in by the pharmacist. A partial fill still counts as
  -- dispensed; the quantity says how much actually went to the ward.
  dispensed_quantity integer CHECK (dispensed_quantity > 0),
  dispense_note text,
  dispensed_by text,
  dispensed_by_id text,
  dispensed_at timestamptz
);

CREATE SEQUENCE medication_order_number START 1100;

CREATE TABLE diagnostic_orders (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients (id),
  test text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('Laboratory', 'Radiology')),
  priority text NOT NULL CHECK (priority IN ('Urgent', 'Routine')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In-Progress', 'Completed')),
  -- UC-11 BR: critical results are flagged for immediate physician notice
  is_critical boolean NOT NULL DEFAULT false,
  ordered_by text NOT NULL,
  ordered_by_id text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  resulted_at timestamptz
);

CREATE SEQUENCE diagnostic_order_number START 5600;
