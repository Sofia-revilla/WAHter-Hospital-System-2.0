-- Phase 3 (UC-02, US-6 to US-9, US-44): real rooms and beds, one admission
-- per stay with its bed history, a log of every bed status change, and the
-- scheduling queue.

-- ─── wards, rooms, beds ───

ALTER TABLE wards
  -- the clinical department an admission here starts in (Clinical Care
  -- opens the encounter there)
  ADD COLUMN department text NOT NULL DEFAULT 'Internal Medicine',
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

UPDATE wards SET department = CASE id
  WHEN 'W-003' THEN 'ICU'
  WHEN 'W-004' THEN 'Pediatrics'
  ELSE 'Internal Medicine'
END;

CREATE TABLE rooms (
  id text PRIMARY KEY,
  ward_id text NOT NULL REFERENCES wards (id),
  code text NOT NULL,
  UNIQUE (ward_id, code)
);

CREATE TABLE beds (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES rooms (id),
  -- what staff call it, e.g. "W003-05"
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Available'
    CHECK (status IN ('Available', 'Occupied', 'Cleaning', 'Maintenance')),
  current_admission_id text,
  -- bumped on every change, so a screen can tell its copy is stale
  version integer NOT NULL DEFAULT 0,
  CHECK ((status = 'Occupied') = (current_admission_id IS NOT NULL))
);

-- Existing wards: rooms of five beds, numbered as the old grid labelled them
INSERT INTO rooms (id, ward_id, code)
SELECT w.id || '-R' || r, w.id, 'Room ' || r
  FROM wards w, generate_series(1, ceil(w.capacity / 5.0)::int) AS r;

INSERT INTO beds (id, room_id, code)
SELECT 'BED-' || replace(w.id, '-', '') || '-' || lpad(b::text, 2, '0'),
       w.id || '-R' || ceil(b / 5.0)::int,
       replace(w.id, '-', '') || '-' || lpad(b::text, 2, '0')
  FROM wards w, generate_series(1, w.capacity) AS b;

-- ─── admissions: one row per stay ───

ALTER TABLE admissions RENAME TO admissions_v1;
DROP INDEX IF EXISTS admissions_one_patient_per_bed;
DROP INDEX IF EXISTS admissions_one_bed_per_patient;

CREATE TABLE admissions (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  -- provider ID from the Access & Provider Registry
  attending_physician_id text NOT NULL,
  admission_type text NOT NULL CHECK (admission_type IN ('Direct admit', 'ER-to-ward transfer', 'Scheduled')),
  admitting_diagnosis text NOT NULL,
  admitted_at timestamptz NOT NULL,
  admitted_by_id text NOT NULL,
  current_bed_id text REFERENCES beds (id),
  -- Phase 7 (discharge) moves it through ReadyForDischarge to Discharged
  status text NOT NULL DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'ReadyForDischarge', 'Discharged')),
  discharged_at timestamptz,
  -- the booking it came from, if it was scheduled
  appointment_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- one stay at a time per patient
CREATE UNIQUE INDEX admissions_one_open_per_patient ON admissions (patient_id) WHERE status <> 'Discharged';

-- Which bed, from when to when. A transfer ends one row and starts another.
CREATE TABLE bed_assignments (
  id bigserial PRIMARY KEY,
  admission_id text NOT NULL REFERENCES admissions (id),
  bed_id text NOT NULL REFERENCES beds (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by_id text NOT NULL,
  ended_at timestamptz,
  end_reason text CHECK (end_reason IN ('Transferred', 'Discharged')),
  -- US-8: why the patient moved
  transfer_reason text
);

-- the database's own guarantee against double booking (UC-02 6b)
CREATE UNIQUE INDEX bed_assignments_one_patient_per_bed ON bed_assignments (bed_id) WHERE ended_at IS NULL;

-- Carry over anything admitted before this migration (each old row was one bed stay)
INSERT INTO admissions (id, patient_id, attending_physician_id, admission_type, admitting_diagnosis, admitted_at,
                        admitted_by_id, current_bed_id, status, discharged_at)
SELECT a.id, a.patient_id, a.attending_physician_id, a.admission_type, 'Not recorded (admitted before Phase 3)',
       a.assigned_at, a.assigned_by_id,
       CASE WHEN a.ended_at IS NULL THEN 'BED-' || replace(a.ward_id, '-', '') || '-' || lpad((a.bed_index + 1)::text, 2, '0') END,
       CASE WHEN a.ended_at IS NULL THEN 'Admitted' ELSE 'Discharged' END,
       a.ended_at
  FROM admissions_v1 a;

INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, assigned_by_id, ended_at, end_reason)
SELECT a.id, 'BED-' || replace(a.ward_id, '-', '') || '-' || lpad((a.bed_index + 1)::text, 2, '0'),
       a.assigned_at, a.assigned_by_id, a.ended_at, a.end_reason
  FROM admissions_v1 a;

UPDATE beds b SET status = 'Occupied', current_admission_id = a.id
  FROM admissions a WHERE a.current_bed_id = b.id AND a.status = 'Admitted';

DROP TABLE admissions_v1;

-- The old "occupied before go-live" head count had no patients behind it,
-- so beds it covered could never be freed. Real admissions replace it.
ALTER TABLE wards DROP COLUMN capacity;
ALTER TABLE wards DROP COLUMN census_occupied;

-- "Every bed status change goes to a bed status log" (Phase 3 brief)
CREATE TABLE bed_status_log (
  id bigserial PRIMARY KEY,
  bed_id text NOT NULL REFERENCES beds (id),
  from_status text,
  to_status text NOT NULL,
  admission_id text,
  reason text NOT NULL,
  changed_by_id text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bed_status_log_by_bed ON bed_status_log (bed_id, changed_at DESC);

-- ─── scheduling and queue (US-6's scheduled side, UC-02 steps 4 to 9) ───

CREATE TABLE appointments (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  department text NOT NULL,
  physician_id text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'Booked' CHECK (status IN ('Booked', 'CheckedIn', 'Completed', 'Cancelled', 'NoShow')),
  -- the day's queue number in the department, given at check-in
  queue_date date,
  queue_number integer,
  checked_in_at timestamptz,
  booked_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- a physician can't be booked twice for the same slot (UC-02 6b)
CREATE UNIQUE INDEX appointments_one_per_slot ON appointments (physician_id, scheduled_at)
  WHERE status IN ('Booked', 'CheckedIn');
CREATE UNIQUE INDEX appointments_queue_number ON appointments (department, queue_date, queue_number)
  WHERE queue_number IS NOT NULL;

CREATE SEQUENCE appointment_number START 1;
