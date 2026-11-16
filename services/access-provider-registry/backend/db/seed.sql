-- Fictional staff for local development. Nobody here is real.
--
-- Every account signs in with its portal's prototype password (doctor2026,
-- nurse2026, pharmacy2026, billing2026, admin2026, clerk2026, lab2026,
-- radiology2026, hospadmin2026). They're argon2id hashes of public demo
-- values, not secrets. Access keys go to the @wahter.local addresses, which
-- only exist in the local Mailpit inbox (http://localhost:8025).

-- the provider registry
INSERT INTO staff (id, name, role, department, license, status) VALUES
  ('EMP-D000', 'Demo Doctor', 'Physician', 'Internal Medicine', 'MED-DEMO-0001', 'Active'),
  ('EMP-N000', 'Demo Nurse', 'Nurse', 'Medical Ward', 'MED-DEMO-0002', 'Active'),
  ('EMP-P000', 'Demo Pharmacist', 'Pharmacist', 'Pharmacy', 'MED-DEMO-0004', 'Active'),
  ('EMP-B000', 'Demo Billing', 'BillingStaff', 'Billing', 'MED-DEMO-0005', 'Active'),
  ('EMP-A000', 'Demo Admin', 'SystemAdministrator', 'IT Department', 'MED-DEMO-0003', 'Active'),
  ('EMP-0001', 'Dr. Andrea Mendoza', 'Physician', 'Internal Medicine', 'MED-4821-0193', 'Active'),
  ('EMP-0011', 'Dr. Miguel Torres', 'Physician', 'Surgery', 'MED-5530-2217', 'Active'),
  ('EMP-0012', 'Dr. Carla Dizon', 'Physician', 'Pediatrics', 'MED-6194-3042', 'Active'),
  ('EMP-0002', 'RN Carlo Bautista', 'Nurse', 'Medical Ward', 'MED-7302-1185', 'Active'),
  ('EMP-0003', 'Liza Ramos', 'LaboratoryStaff', 'Laboratory', NULL, 'Active'),
  ('EMP-0004', 'Paolo Santos', 'RadiologyStaff', 'Radiology', NULL, 'Active'),
  ('EMP-0005', 'Grace Villanueva', 'Pharmacist', 'Pharmacy', 'MED-3318-6604', 'Active'),
  ('EMP-0006', 'Mark Aquino', 'BillingStaff', 'Billing', 'MED-2275-9186', 'Active'),
  ('EMP-0007', 'Joy Pascual', 'AdmittingClerk', 'Admitting', NULL, 'Active'),
  ('EMP-0008', 'Dr. Ramon Castillo', 'HospitalAdministrator', 'Administration', NULL, 'Active'),
  ('EMP-0009', 'Alex Reyes', 'SystemAdministrator', 'IT Department', 'MED-8840-5521', 'Active'),
  ('EMP-0010', 'RN Nina Garcia', 'Nurse', 'ICU', 'MED-9021-7730', 'Active'),
  -- a second System Administrator, so role changes and deactivations have
  -- someone to approve them (UC-08)
  ('EMP-0013', 'Bea Lim', 'SystemAdministrator', 'IT Department', NULL, 'Active');

-- the logins
INSERT INTO accounts (id, staff_id, username, email, password_hash, status, is_demo, last_login_at) VALUES
  ('ACC-0001', 'EMP-0001', 'amendoza', 'amendoza@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '07:02'),
  ('ACC-0011', 'EMP-0011', 'mtorres', 'mtorres@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '06:30'),
  ('ACC-0012', 'EMP-0012', 'cdizon', 'cdizon@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', false, current_date + time '07:15'),
  ('ACC-0002', 'EMP-0002', 'cbautista', 'cbautista@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Active', false, current_date + time '06:55'),
  ('ACC-0003', 'EMP-0003', 'lramos', 'lramos@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$J5iePs1SLTYsaUJIL91y/A$9poI+foI+MneAj1DcrnHDu02e77b5rA7ySQdFYIZmyU', 'Active', false, current_date + time '07:30'),
  ('ACC-0004', 'EMP-0004', 'psantos', 'psantos@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$/CQhuo87Z2xJbsvUOmtilQ$ah5y4sJN0ifbKCZr+p43mDEtLWc6DWsFSFyCx7nfJMI', 'Active', false, current_date - 1 + time '16:12'),
  ('ACC-0005', 'EMP-0005', 'gvillanueva', 'gvillanueva@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$c6Fx3oszqSQYej6S4F7lGA$uKSU/c8H/4CUs9GYIErcJbEazPj5r6m/eQPlqD+6hr8', 'Active', false, current_date + time '07:45'),
  ('ACC-0006', 'EMP-0006', 'maquino', 'maquino@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$x6gmGQXEUAdNmyvk2F7weA$0LCT+ug/QnzrhFZWS+jGjv4kxMwRgFBXVGTrxnyAoeo', 'Active', false, current_date + time '08:10'),
  ('ACC-0007', 'EMP-0007', 'jpascual', 'jpascual@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$Zjlkqh3uOvF+DeyKMC7L3w$uXA48pTcncOBT6oo/ubrBmUTDqZg6KIIc2myVE6bD0o', 'Active', false, current_date + time '06:40'),
  ('ACC-0008', 'EMP-0008', 'rcastillo', 'rcastillo@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$vA9Us2BCxJVAmZkrG8iEkQ$S0QX8MfkSTc8nKTAMg6qOKSlzmWS3KooXbEmkpY2He4', 'Active', false, current_date - 1 + time '17:05'),
  ('ACC-0009', 'EMP-0009', 'areyes', 'areyes@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', false, current_date + time '07:00'),
  ('ACC-0010', 'EMP-0010', 'ngarcia', 'ngarcia@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Disabled', false, now() - interval '12 days'),
  ('ACC-0013', 'EMP-0013', 'blim', 'blim@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', false, NULL),
  -- Try Demo's accounts; refused unless the server has DEMO_ACCOUNTS_ENABLED=true
  ('ACC-D000', 'EMP-D000', 'demo.physician', 'demo.physician@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M', 'Active', true, NULL),
  ('ACC-N000', 'EMP-N000', 'demo.nurse', 'demo.nurse@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$CmP0Ozn7W7qbchN9sxSqJg$iv8tfSi2KDkwt6fERd6eMMmBEbBR9RjTTMlvLp9BpvI', 'Active', true, NULL),
  ('ACC-P000', 'EMP-P000', 'demo.pharmacist', 'demo.pharmacist@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$c6Fx3oszqSQYej6S4F7lGA$uKSU/c8H/4CUs9GYIErcJbEazPj5r6m/eQPlqD+6hr8', 'Active', true, NULL),
  ('ACC-B000', 'EMP-B000', 'demo.billing', 'demo.billing@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$x6gmGQXEUAdNmyvk2F7weA$0LCT+ug/QnzrhFZWS+jGjv4kxMwRgFBXVGTrxnyAoeo', 'Active', true, NULL),
  ('ACC-A000', 'EMP-A000', 'demo.admin', 'demo.admin@wahter.local', '$argon2id$v=19$m=65536,t=3,p=4$7VezbIGMumZkpPmiyQaHoA$4yn7U++r+QIck4isRBSTkMS18OeB1bE96zeiZXogdIM', 'Active', true, NULL);
