-- Fictional orders for local development, on the same 12 mock inpatients.

INSERT INTO patients (id, name) VALUES
  ('WAH-2026-00001', 'Michael Davis'),
  ('WAH-2026-00002', 'Olivia Johnson'),
  ('WAH-2026-00003', 'Jennifer Miller'),
  ('WAH-2026-00004', 'James Smith'),
  ('WAH-2026-00005', 'Patricia Brown'),
  ('WAH-2026-00006', 'Sophia Martinez'),
  ('WAH-2026-00007', 'John Garcia'),
  ('WAH-2026-00008', 'Mia Smith'),
  ('WAH-2026-00009', 'James Smith'),
  ('WAH-2026-00010', 'David Martinez'),
  ('WAH-2026-00011', 'Linda Rodriguez'),
  ('WAH-2026-00012', 'Elizabeth Jones');

INSERT INTO formulary (id, name, form, is_controlled) VALUES
  ('FRM-001', 'Paracetamol 500mg', 'Tablet', false),
  ('FRM-002', 'Amoxicillin 500mg', 'Capsule', false),
  ('FRM-003', 'Amoxicillin 250mg/5mL', 'Syrup', false),
  ('FRM-004', 'Losartan 50mg', 'Tablet', false),
  ('FRM-005', 'Metformin 500mg', 'Tablet', false),
  ('FRM-006', 'Cefuroxime 750mg', 'IV vial', false),
  ('FRM-007', 'Omeprazole 40mg', 'IV vial', false),
  ('FRM-008', 'Salbutamol 2.5mg/2.5mL', 'Nebule', false),
  ('FRM-009', 'Sodium Chloride 0.9% 1L', 'IV bag', false),
  ('FRM-010', 'Morphine 10mg/mL', 'Ampule', true);

INSERT INTO medication_orders (id, patient_id, drug, dose, frequency, route, duration, status, prescribed_by, prescribed_by_id, ordered_at) VALUES
  ('RX-1001', 'WAH-2026-00003', 'Losartan 50mg', '1 tab', 'OD', 'PO', '30 days', 'Dispensed', 'Dr. Andrea Mendoza', 'EMP-0001', now() - interval '1 day'),
  ('RX-1002', 'WAH-2026-00002', 'Paracetamol 500mg', '1 tab', 'PRN', 'PO', '5 days', 'Dispensed', 'Dr. Carla Dizon', 'EMP-0012', now() - interval '4 hours'),
  ('RX-1003', 'WAH-2026-00001', 'Amoxicillin 500mg', '1 cap', 'TID', 'PO', '7 days', 'Pending', 'Dr. Andrea Mendoza', 'EMP-0001', now() - interval '2 hours'),
  ('RX-1004', 'WAH-2026-00009', 'Metformin 500mg', '1 tab', 'OD', 'PO', '30 days', 'Review', 'Dr. Andrea Mendoza', 'EMP-0001', now() - interval '1 hour');

-- who released the two orders that are already dispensed
UPDATE medication_orders
   SET dispensed_quantity = 10, dispensed_by = 'Grace Villanueva', dispensed_by_id = 'EMP-0005',
       dispensed_at = ordered_at + interval '40 minutes'
 WHERE id IN ('RX-1001', 'RX-1002');

INSERT INTO diagnostic_orders (id, patient_id, test, kind, priority, status, is_critical, ordered_by, ordered_by_id, ordered_at, resulted_at) VALUES
  ('LAB-5501', 'WAH-2026-00004', 'Complete Blood Count (CBC)', 'Laboratory', 'Urgent', 'In-Progress', false, 'Dr. Andrea Mendoza', 'EMP-0001', now() - interval '10 minutes', NULL),
  ('LAB-5502', 'WAH-2026-00002', 'Urinalysis', 'Laboratory', 'Routine', 'Pending', false, 'Dr. Carla Dizon', 'EMP-0012', now() - interval '25 minutes', NULL),
  ('LAB-5503', 'WAH-2026-00003', 'Lipid Profile', 'Laboratory', 'Urgent', 'Completed', false, 'Dr. Andrea Mendoza', 'EMP-0001', now() - interval '1 hour', now() - interval '20 minutes'),
  ('LAB-5504', 'WAH-2026-00005', 'Fasting Blood Sugar', 'Laboratory', 'Routine', 'Pending', false, 'Dr. Miguel Torres', 'EMP-0011', now() - interval '2 hours', NULL);
