-- Clinical Care: encounters, vital signs, and MEWS (UC-03).
-- patient_id is a reference into the Patient Registry. No copy of the
-- patient's name or birth date is kept here (comment matrix 3 and 7).

CREATE TABLE encounters (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  department text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('Critical', 'Stable', 'Recovering', 'Observation')),
  -- ICD-10 primary diagnosis; nullable because a provisional uncoded one is allowed
  primary_dx_code text,
  primary_dx_text text,
  admitted_at timestamptz NOT NULL,
  discharged_at timestamptz,
  -- cached from the newest vitals row so the census doesn't rescan vitals
  latest_mews integer,
  latest_risk text
);

-- one open encounter per patient; discharge closes it
CREATE UNIQUE INDEX encounters_one_open ON encounters (patient_id) WHERE discharged_at IS NULL;
CREATE SEQUENCE encounter_number START 100;

CREATE TABLE vitals (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  encounter_id text REFERENCES encounters (id),
  respiratory_rate numeric(5, 1) NOT NULL,
  oxygen_saturation numeric(5, 1) NOT NULL,
  temperature numeric(4, 1) NOT NULL,
  systolic_bp numeric(5, 1) NOT NULL,
  heart_rate numeric(5, 1) NOT NULL,
  consciousness text NOT NULL CHECK (consciousness IN ('Alert', 'Voice', 'Pain', 'Unresponsive')),
  mews_score integer NOT NULL,
  risk text NOT NULL CHECK (risk IN ('Low', 'Medium', 'High')),
  had_implausible_reading boolean NOT NULL DEFAULT false,
  recorded_by_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vitals_by_patient ON vitals (patient_id, recorded_at DESC);
CREATE SEQUENCE vitals_number START 1;

-- UC-03 7a: charted vitals are never edited or deleted. A wrong entry is
-- corrected by charting a new set, so the history stays honest.
CREATE FUNCTION reject_vitals_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'vitals are immutable; chart a new set instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vitals_immutable
  BEFORE UPDATE OR DELETE ON vitals
  FOR EACH ROW EXECUTE FUNCTION reject_vitals_change();
