-- Patient Flow: wards, beds, and admissions (UC-02). Patients and physicians
-- are reference IDs into the two registry services, never copies.

CREATE TABLE wards (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Male', 'Female', 'Specialized', 'Children')),
  capacity integer NOT NULL CHECK (capacity > 0),
  -- beds already taken by patients admitted before WAHter went live. They
  -- fill the first beds of the grid and have no admission rows.
  census_occupied integer NOT NULL DEFAULT 0,
  color text NOT NULL
);

CREATE TABLE admissions (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  ward_id text NOT NULL REFERENCES wards (id),
  bed_index integer NOT NULL CHECK (bed_index >= 0),
  admission_type text NOT NULL CHECK (admission_type IN ('Direct admit', 'ER-to-ward transfer')),
  -- provider ID from the Access & Provider Registry
  attending_physician_id text NOT NULL,
  assigned_by_id text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  -- set when the patient moves beds or goes home; the row itself stays as history
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('Transferred', 'Discharged'))
);

-- UC-02 6b: the atomic bed lock. Two nurses admitting into the same bed at
-- the same moment can't both win, because the second insert breaks this index.
CREATE UNIQUE INDEX admissions_one_patient_per_bed ON admissions (ward_id, bed_index) WHERE ended_at IS NULL;
-- one active bed per patient
CREATE UNIQUE INDEX admissions_one_bed_per_patient ON admissions (patient_id) WHERE ended_at IS NULL;

CREATE SEQUENCE admission_number START 1;
