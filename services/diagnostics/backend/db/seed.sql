-- Fictional lab orders for local development, on the 12 Patient Registry inpatients.

INSERT INTO diagnostic_orders (id, patient_id, test, kind, priority, status, is_critical, ordered_by_id, ordered_at, resulted_at) VALUES
  ('LAB-5501', 'WAH-2026-00004', 'Complete Blood Count (CBC)', 'Laboratory', 'Urgent', 'In-Progress', false, 'EMP-0001', now() - interval '10 minutes', NULL),
  ('LAB-5502', 'WAH-2026-00002', 'Urinalysis', 'Laboratory', 'Routine', 'Pending', false, 'EMP-0012', now() - interval '25 minutes', NULL),
  ('LAB-5503', 'WAH-2026-00003', 'Lipid Profile', 'Laboratory', 'Urgent', 'Completed', false, 'EMP-0001', now() - interval '1 hour', now() - interval '20 minutes'),
  ('LAB-5504', 'WAH-2026-00005', 'Fasting Blood Sugar', 'Laboratory', 'Routine', 'Pending', false, 'EMP-0011', now() - interval '2 hours', NULL);
