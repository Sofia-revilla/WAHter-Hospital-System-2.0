-- Billing: the charge master and the charges posted against each patient's
-- account (UC-12). eClaims (UC-13) builds on these in Phase 7a.

CREATE TABLE charge_master (
  code text PRIMARY KEY,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Room', 'Laboratory', 'Radiology', 'Medication')),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  -- what an event is matched on: a ward ID for rooms, the test or drug name otherwise
  match_key text NOT NULL UNIQUE
);

CREATE TABLE charges (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  code text REFERENCES charge_master (code),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_amount numeric(10, 2) NOT NULL,
  amount numeric(10, 2) NOT NULL,
  -- UC-12 BR: an item with no charge master price is posted at zero and
  -- flagged, so billing staff can price it before the statement goes out
  is_unpriced boolean NOT NULL DEFAULT false,
  -- the bus event that caused this charge; unique so a replay can't double-bill
  source_event_id uuid NOT NULL UNIQUE,
  source_type text NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX charges_by_patient ON charges (patient_id, posted_at);
CREATE SEQUENCE charge_number START 1;
