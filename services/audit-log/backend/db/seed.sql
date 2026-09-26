-- The morning's activity from the web prototype's mock audit log. Fictional
-- staff; resources are IDs only.
INSERT INTO entries (event_type, source, actor_id, actor_name, actor_role, action, resource, occurred_at) VALUES
  ('staff.logged-in', 'identity', 'EMP-0007', 'Joy Pascual', 'Patient Registrar', 'LOGIN', 'Session', current_date + time '06:40'),
  ('patient.viewed', 'identity', 'EMP-0007', 'Joy Pascual', 'Patient Registrar', 'VIEW', 'Patient WAH-2026-00007', current_date + time '06:41'),
  ('staff.logged-in', 'identity', 'EMP-0002', 'RN Carlo Bautista', 'Nurse', 'LOGIN', 'Session', current_date + time '06:55'),
  ('staff.logged-in', 'identity', 'EMP-0009', 'Alex Reyes', 'System Administrator', 'LOGIN', 'Session', current_date + time '07:00'),
  ('staff.logged-in', 'identity', 'EMP-0001', 'Dr. Andrea Mendoza', 'Physician', 'LOGIN', 'Session', current_date + time '07:02'),
  ('patient.registered', 'identity', 'EMP-0007', 'Joy Pascual', 'Patient Registrar', 'CREATE', 'Patient WAH-2026-00012', current_date + time '07:12'),
  ('staff.logged-in', 'identity', 'EMP-0003', 'Liza Ramos', 'Laboratory Staff', 'LOGIN', 'Session', current_date + time '07:30'),
  ('staff.logged-in', 'identity', 'EMP-0005', 'Grace Villanueva', 'Pharmacist', 'LOGIN', 'Session', current_date + time '07:45'),
  ('medication.dispensed', 'orders-diagnostics', 'EMP-0005', 'Grace Villanueva', 'Pharmacist', 'UPDATE', 'Dispense RX-1002', current_date + time '07:51'),
  ('vitals.recorded', 'clinical-records', 'EMP-0002', 'RN Carlo Bautista', 'Nurse', 'CREATE', 'Vitals for WAH-2026-00001', current_date + time '07:58'),
  ('diagnostic.ordered', 'orders-diagnostics', 'EMP-0001', 'Dr. Andrea Mendoza', 'Physician', 'CREATE', 'Lab order LAB-5501', current_date + time '08:02'),
  ('charge.viewed', 'billing', 'EMP-0006', 'Mark Aquino', 'Billing Staff', 'VIEW', 'Account WAH-2026-00004', current_date + time '08:14');
