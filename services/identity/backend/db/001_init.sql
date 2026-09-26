-- Identity owns staff accounts and the Master Patient Index (MPI).
-- Other services only ever hold copies of patient demographics, filled from
-- the patient.registered event.

CREATE TABLE staff (
  id text PRIMARY KEY,
  name text NOT NULL,
  -- the paper's user class (TABLE XIII)
  hospital_role text NOT NULL,
  -- which login portal the account can use; null for roles without a portal yet
  portal_role text CHECK (portal_role IN ('Doctor', 'Nurse', 'IT')),
  department text NOT NULL,
  license text,
  password_hash text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated')),
  -- the shared per-portal demo login shown on the login screen
  is_prototype_account boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_portal_name ON staff (portal_role, lower(name)) WHERE portal_role IS NOT NULL;
CREATE SEQUENCE staff_number START 100;

CREATE TABLE patients (
  id text PRIMARY KEY,
  name text NOT NULL,
  sex text NOT NULL CHECK (sex IN ('Male', 'Female')),
  birth_date date NOT NULL,
  -- 12-digit PhilHealth Identification Number; exact match wins in MPI matching
  philhealth_pin char(12) UNIQUE,
  -- UC-02: merged records are kept and pointed at the surviving one, never deleted
  merged_into text REFERENCES patients (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE patient_number START 13;
