-- Phase 2 (UC-01, US-1 to US-5): full demographics, merge history, the
-- identity review queue for the System Administrator (UC-08 4b), and where
-- each record stands with WAH Systems (UC-01 9a).

-- Name parts, so matching and the PHCDI Patient mapping don't have to guess
-- where the given name ends. `name` stays as the display form other screens use.
ALTER TABLE patients
  ADD COLUMN family_name text,
  ADD COLUMN given_name text,
  ADD COLUMN middle_name text,
  ADD COLUMN suffix text,
  ADD COLUMN civil_status text CHECK (civil_status IN ('Single', 'Married', 'Widowed', 'Separated', 'Annulled')),
  ADD COLUMN contact_number text,
  -- street, barangay, municipality, province. JSONB because addresses vary
  -- (sitio, purok, building) and the PSGC codes may be added later.
  ADD COLUMN address jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN created_by_id text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  -- Pending until Interoperability & Reporting confirms WAH Systems has it
  ADD COLUMN exchange_status text NOT NULL DEFAULT 'Pending'
    CHECK (exchange_status IN ('Pending', 'Sent', 'Rejected')),
  ADD COLUMN exchange_error text;

-- Records from before this migration only have the full name: split it on
-- the last space ("Juan Dela Cruz" becomes Juan Dela / Cruz; staff can fix
-- the rare wrong split on the profile)
UPDATE patients
   SET given_name = regexp_replace(name, '\s+\S+$', ''),
       family_name = regexp_replace(name, '^.*\s', '')
 WHERE family_name IS NULL;

ALTER TABLE patients ALTER COLUMN family_name SET NOT NULL;
ALTER TABLE patients ALTER COLUMN given_name SET NOT NULL;

CREATE INDEX patients_by_family_name ON patients (lower(family_name));
CREATE INDEX patients_by_birth_date ON patients (birth_date);

-- "Track merges of duplicate records": who folded which record into which.
-- The merged record itself stays (merged_into points at the survivor).
CREATE TABLE patient_merges (
  id bigserial PRIMARY KEY,
  source_id text NOT NULL REFERENCES patients (id),
  target_id text NOT NULL REFERENCES patients (id),
  review_id text,
  reason text NOT NULL,
  merged_by_id text NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source_id <> target_id)
);

-- UC-01 6a and UC-08 4b: a possible duplicate nobody at the desk could decide
-- on. The System Administrator merges the two or keeps them apart.
CREATE TABLE identity_reviews (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES patients (id),
  candidate_id text NOT NULL REFERENCES patients (id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Merged', 'KeptSeparate')),
  reported_by_id text NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  resolved_by_id text,
  resolved_at timestamptz,
  resolution_note text,
  survivor_id text REFERENCES patients (id),
  CHECK (patient_id <> candidate_id)
);

-- one open review per pair, whichever way round it was reported
CREATE UNIQUE INDEX identity_reviews_one_open_pair
  ON identity_reviews (least(patient_id, candidate_id), greatest(patient_id, candidate_id))
  WHERE status = 'Pending';
CREATE SEQUENCE identity_review_number START 1;
