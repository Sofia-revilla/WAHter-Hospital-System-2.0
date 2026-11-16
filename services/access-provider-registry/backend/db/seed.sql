-- Fictional staff for local development. Nobody here is real.
-- Every account with a portal uses its portal's prototype password (doctor2026,
-- nurse2026, pharmacy2026, billing2026, admin2026), the same ones printed on the login screen. They're
-- argon2id hashes of public demo values, not secrets.

INSERT INTO staff (id, name, role, department, license, password_hash, status, is_prototype_account, last_login_at) VALUES
  ('EMP-D000', 'Demo Doctor', 'Physician', 'Internal Medicine', 'MED-DEMO-0001', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', true, NULL),
  ('EMP-N000', 'Demo Nurse', 'Nurse', 'Medical Ward', 'MED-DEMO-0002', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Active', true, NULL),
  ('EMP-P000', 'Demo Pharmacist', 'Pharmacist', 'Pharmacy', 'MED-DEMO-0004', '$argon2id$v=19$m=65536,t=3,p=4$c6Fx3oszqSQYej6S4F7lGA$uKSU/c8H/4CUs9GYIErcJbEazPj5r6m/eQPlqD+6hr8', 'Active', true, NULL),
  ('EMP-B000', 'Demo Billing', 'BillingStaff', 'Billing', 'MED-DEMO-0005', '$argon2id$v=19$m=65536,t=3,p=4$x6gmGQXEUAdNmyvk2F7weA$0LCT+ug/QnzrhFZWS+jGjv4kxMwRgFBXVGTrxnyAoeo', 'Active', true, NULL),
  ('EMP-A000', 'Demo Admin', 'SystemAdministrator', 'IT Department', 'MED-DEMO-0003', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', true, NULL),
  ('EMP-0001', 'Dr. Andrea Mendoza', 'Physician', 'Internal Medicine', 'MED-4821-0193', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '07:02'),
  ('EMP-0011', 'Dr. Miguel Torres', 'Physician', 'Surgery', 'MED-5530-2217', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '06:30'),
  ('EMP-0012', 'Dr. Carla Dizon', 'Physician', 'Pediatrics', 'MED-6194-3042', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '07:15'),
  ('EMP-0002', 'RN Carlo Bautista', 'Nurse', 'Medical Ward', 'MED-7302-1185', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Active', false, current_date + time '06:55'),
  ('EMP-0003', 'Liza Ramos', 'LaboratoryStaff', 'Laboratory', NULL, NULL, 'Active', false, current_date + time '07:30'),
  ('EMP-0004', 'Paolo Santos', 'RadiologyStaff', 'Radiology', NULL, NULL, 'Active', false, current_date - 1 + time '16:12'),
  ('EMP-0005', 'Grace Villanueva', 'Pharmacist', 'Pharmacy', 'MED-3318-6604', '$argon2id$v=19$m=65536,t=3,p=4$c6Fx3oszqSQYej6S4F7lGA$uKSU/c8H/4CUs9GYIErcJbEazPj5r6m/eQPlqD+6hr8', 'Active', false, current_date + time '07:45'),
  ('EMP-0006', 'Mark Aquino', 'BillingStaff', 'Billing', 'MED-2275-9186', '$argon2id$v=19$m=65536,t=3,p=4$x6gmGQXEUAdNmyvk2F7weA$0LCT+ug/QnzrhFZWS+jGjv4kxMwRgFBXVGTrxnyAoeo', 'Active', false, current_date + time '08:10'),
  ('EMP-0007', 'Joy Pascual', 'AdmittingClerk', 'Admitting', NULL, NULL, 'Active', false, current_date + time '06:40'),
  ('EMP-0008', 'Dr. Ramon Castillo', 'HospitalAdministrator', 'Administration', NULL, NULL, 'Active', false, current_date - 1 + time '17:05'),
  ('EMP-0009', 'Alex Reyes', 'SystemAdministrator', 'IT Department', 'MED-8840-5521', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', false, current_date + time '07:00'),
  ('EMP-0010', 'RN Nina Garcia', 'Nurse', 'ICU', 'MED-9021-7730', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Deactivated', false, now() - interval '12 days');
