-- Fictional staff and patients for local development. Nobody here is real.
-- Every account with a portal uses its portal's prototype password (doctor2026,
-- nurse2026, admin2026), the same ones printed on the login screen. They're
-- argon2id hashes of public demo values, not secrets.

INSERT INTO staff (id, name, hospital_role, portal_role, department, license, password_hash, status, is_prototype_account, last_login_at) VALUES
  ('EMP-D000', 'Demo Doctor', 'Physician', 'Doctor', 'Internal Medicine', 'MED-DEMO-0001', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', true, NULL),
  ('EMP-N000', 'Demo Nurse', 'Nurse', 'Nurse', 'Medical Ward', 'MED-DEMO-0002', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Active', true, NULL),
  ('EMP-A000', 'Demo Admin', 'System Administrator', 'IT', 'IT Department', 'MED-DEMO-0003', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', true, NULL),
  ('EMP-0001', 'Dr. Andrea Mendoza', 'Physician', 'Doctor', 'Internal Medicine', 'MED-4821-0193', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '07:02'),
  ('EMP-0011', 'Dr. Miguel Torres', 'Physician', 'Doctor', 'Surgery', 'MED-5530-2217', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '06:30'),
  ('EMP-0012', 'Dr. Carla Dizon', 'Physician', 'Doctor', 'Pediatrics', 'MED-6194-3042', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '07:15'),
  ('EMP-0002', 'RN Carlo Bautista', 'Nurse', 'Nurse', 'Medical Ward', 'MED-7302-1185', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Active', false, current_date + time '06:55'),
  ('EMP-0003', 'Liza Ramos', 'Laboratory Staff', NULL, 'Laboratory', NULL, NULL, 'Active', false, current_date + time '07:30'),
  ('EMP-0004', 'Paolo Santos', 'Radiology Staff', NULL, 'Radiology', NULL, NULL, 'Active', false, current_date - 1 + time '16:12'),
  ('EMP-0005', 'Grace Villanueva', 'Pharmacist', NULL, 'Pharmacy', NULL, NULL, 'Active', false, current_date + time '07:45'),
  ('EMP-0006', 'Mark Aquino', 'Billing Staff', NULL, 'Billing', NULL, NULL, 'Active', false, current_date + time '08:10'),
  ('EMP-0007', 'Joy Pascual', 'Patient Registrar', NULL, 'Admitting', NULL, NULL, 'Active', false, current_date + time '06:40'),
  ('EMP-0008', 'Dr. Ramon Castillo', 'Hospital Administrator', NULL, 'Administration', NULL, NULL, 'Active', false, current_date - 1 + time '17:05'),
  ('EMP-0009', 'Alex Reyes', 'System Administrator', 'IT', 'IT Department', 'MED-8840-5521', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', false, current_date + time '07:00'),
  ('EMP-0010', 'RN Nina Garcia', 'Nurse', 'Nurse', 'ICU', 'MED-9021-7730', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Deactivated', false, now() - interval '12 days');

-- The 12 mock inpatients from the web prototype. Birth dates are anchored to
-- the day the database is created so the ages match what the app showed.
INSERT INTO patients (id, name, sex, birth_date, philhealth_pin) VALUES
  ('WAH-2026-00001', 'Michael Davis', 'Male', current_date - interval '45 years' - interval '40 days', '190000000001'),
  ('WAH-2026-00002', 'Olivia Johnson', 'Male', current_date - interval '15 years' - interval '63 days', '190000007920'),
  ('WAH-2026-00003', 'Jennifer Miller', 'Male', current_date - interval '19 years' - interval '86 days', NULL),
  ('WAH-2026-00004', 'James Smith', 'Female', current_date - interval '87 years' - interval '109 days', '190000023758'),
  ('WAH-2026-00005', 'Patricia Brown', 'Female', current_date - interval '40 years' - interval '132 days', '190000031677'),
  ('WAH-2026-00006', 'Sophia Martinez', 'Male', current_date - interval '8 years' - interval '155 days', NULL),
  ('WAH-2026-00007', 'John Garcia', 'Male', current_date - interval '85 years' - interval '178 days', '190000047515'),
  ('WAH-2026-00008', 'Mia Smith', 'Male', current_date - interval '13 years' - interval '201 days', '190000055434'),
  ('WAH-2026-00009', 'James Smith', 'Male', current_date - interval '34 years' - interval '224 days', NULL),
  ('WAH-2026-00010', 'David Martinez', 'Male', current_date - interval '22 years' - interval '247 days', '190000071272'),
  ('WAH-2026-00011', 'Linda Rodriguez', 'Female', current_date - interval '73 years' - interval '270 days', '190000079191'),
  ('WAH-2026-00012', 'Elizabeth Jones', 'Female', current_date - interval '75 years' - interval '293 days', NULL);
