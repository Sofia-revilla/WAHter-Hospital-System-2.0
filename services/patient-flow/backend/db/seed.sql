-- The five wards from the web prototype (70 beds), split into rooms of five
-- beds, and the 12 fictional inpatients from the Patient Registry seed in
-- real beds. Admission times match their Clinical Care encounters.
INSERT INTO wards (id, name, type, color, department) VALUES
  ('W-001', 'General Ward', 'Male', '#a855f7', 'Internal Medicine'),
  ('W-002', 'General Ward', 'Female', '#ec4899', 'Internal Medicine'),
  ('W-003', 'Intensive Care Unit (ICU)', 'Specialized', '#ef4444', 'ICU'),
  ('W-004', 'Pediatrics Ward', 'Children', '#3b82f6', 'Pediatrics'),
  ('W-005', 'Isolation Ward', 'Specialized', '#10b981', 'Internal Medicine');

INSERT INTO rooms (id, ward_id, code)
SELECT w.id || '-R' || r, w.id, 'Room ' || r
  FROM (VALUES ('W-001', 20), ('W-002', 20), ('W-003', 10), ('W-004', 15), ('W-005', 5)) AS w (id, beds),
       generate_series(1, ceil(w.beds / 5.0)::int) AS r;

INSERT INTO beds (id, room_id, code)
SELECT 'BED-' || replace(w.id, '-', '') || '-' || lpad(b::text, 2, '0'),
       w.id || '-R' || ceil(b / 5.0)::int,
       replace(w.id, '-', '') || '-' || lpad(b::text, 2, '0')
  FROM (VALUES ('W-001', 20), ('W-002', 20), ('W-003', 10), ('W-004', 15), ('W-005', 5)) AS w (id, beds),
       generate_series(1, w.beds) AS b;

INSERT INTO admissions (id, patient_id, attending_physician_id, admission_type, admitting_diagnosis, admitted_at,
                        admitted_by_id, current_bed_id) VALUES
  ('ADM-00001', 'WAH-2026-00001', 'EMP-0001', 'ER-to-ward transfer', 'Acute respiratory failure', current_date - interval '100 hours', 'EMP-0002', 'BED-W003-01'),
  ('ADM-00002', 'WAH-2026-00002', 'EMP-0012', 'Direct admit', 'Dengue fever without warning signs', current_date - interval '172 hours', 'EMP-0007', 'BED-W004-01'),
  ('ADM-00003', 'WAH-2026-00003', 'EMP-0001', 'Direct admit', 'Uncontrolled hypertension', current_date - interval '78 hours', 'EMP-0007', 'BED-W001-01'),
  ('ADM-00004', 'WAH-2026-00004', 'EMP-0001', 'ER-to-ward transfer', 'Community-acquired pneumonia, high risk', current_date - interval '115 hours', 'EMP-0002', 'BED-W003-02'),
  ('ADM-00005', 'WAH-2026-00005', 'EMP-0011', 'Direct admit', 'Acute appendicitis, post appendectomy', current_date - interval '67 hours', 'EMP-0007', 'BED-W002-01'),
  ('ADM-00006', 'WAH-2026-00006', 'EMP-0012', 'Direct admit', 'Acute gastroenteritis with moderate dehydration', current_date - interval '243 hours', 'EMP-0007', 'BED-W004-02'),
  ('ADM-00007', 'WAH-2026-00007', 'EMP-0011', 'Direct admit', 'Hip fracture, for open reduction', current_date - interval '275 hours', 'EMP-0007', 'BED-W001-02'),
  ('ADM-00008', 'WAH-2026-00008', 'EMP-0012', 'ER-to-ward transfer', 'Asthma in acute exacerbation', current_date - interval '212 hours', 'EMP-0002', 'BED-W004-03'),
  ('ADM-00009', 'WAH-2026-00009', 'EMP-0001', 'Direct admit', 'Type 2 diabetes with hyperglycemia', current_date - interval '177 hours', 'EMP-0007', 'BED-W001-03'),
  ('ADM-00010', 'WAH-2026-00010', 'EMP-0001', 'ER-to-ward transfer', 'Blunt abdominal trauma, for observation', current_date - interval '88 hours', 'EMP-0002', 'BED-W001-04'),
  ('ADM-00011', 'WAH-2026-00011', 'EMP-0001', 'Direct admit', 'Congestive heart failure', current_date - interval '132 hours', 'EMP-0007', 'BED-W002-02'),
  ('ADM-00012', 'WAH-2026-00012', 'EMP-0001', 'Direct admit', 'Urinary tract infection with sepsis', current_date - interval '175 hours', 'EMP-0007', 'BED-W002-03');

INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, assigned_by_id)
SELECT id, current_bed_id, admitted_at, admitted_by_id FROM admissions;

UPDATE beds b SET status = 'Occupied', current_admission_id = a.id, version = 1
  FROM admissions a WHERE a.current_bed_id = b.id;

INSERT INTO bed_status_log (bed_id, from_status, to_status, admission_id, reason, changed_by_id, changed_at)
SELECT current_bed_id, 'Available', 'Occupied', id, 'Admitted', admitted_by_id, admitted_at FROM admissions;

SELECT setval('admission_number', 12);
