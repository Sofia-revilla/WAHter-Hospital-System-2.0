-- Pharmacy: the formulary, medication orders, and dispensing (UC-04).
-- Dispensing only: the formulary is a list of orderable drugs with no stock
-- counts (paper Limitation d, ERD Step 11). patient_id, prescribed_by_id,
-- and dispensed_by_id are reference IDs into the two registry services.

CREATE TABLE formulary (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  form text NOT NULL,
  -- RA 9165 dangerous drugs need a second approval when dispensed
  is_controlled boolean NOT NULL DEFAULT false
);

CREATE TABLE medication_orders (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  drug text NOT NULL,
  dose text NOT NULL,
  frequency text NOT NULL,
  route text,
  duration text,
  instructions text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Dispensed', 'Review')),
  prescribed_by_id text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  -- filled in by the pharmacist. A partial fill still counts as dispensed;
  -- the quantity says how much actually went to the ward.
  dispensed_quantity integer CHECK (dispensed_quantity > 0),
  dispense_note text,
  dispensed_by_id text,
  dispensed_at timestamptz
);

CREATE SEQUENCE medication_order_number START 1100;
