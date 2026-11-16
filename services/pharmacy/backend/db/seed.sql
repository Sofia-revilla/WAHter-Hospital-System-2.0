-- Fictional formulary and orders for local development, on the 12 Patient
-- Registry inpatients.

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

INSERT INTO medication_orders (id, patient_id, drug, dose, frequency, route, duration, status, prescribed_by_id, ordered_at) VALUES
  ('RX-1001', 'WAH-2026-00003', 'Losartan 50mg', '1 tab', 'OD', 'PO', '30 days', 'Dispensed', 'EMP-0001', now() - interval '1 day'),
  ('RX-1002', 'WAH-2026-00002', 'Paracetamol 500mg', '1 tab', 'PRN', 'PO', '5 days', 'Dispensed', 'EMP-0012', now() - interval '4 hours'),
  ('RX-1003', 'WAH-2026-00001', 'Amoxicillin 500mg', '1 cap', 'TID', 'PO', '7 days', 'Pending', 'EMP-0001', now() - interval '2 hours'),
  ('RX-1004', 'WAH-2026-00009', 'Metformin 500mg', '1 tab', 'OD', 'PO', '30 days', 'Review', 'EMP-0001', now() - interval '1 hour');

-- who released the two orders that are already dispensed
UPDATE medication_orders
   SET dispensed_quantity = 10, dispensed_by_id = 'EMP-0005', dispensed_at = ordered_at + interval '40 minutes'
 WHERE id IN ('RX-1001', 'RX-1002');
