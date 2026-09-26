-- Charge master with made-up peso amounts for a Level 2 LGU hospital.
-- Not real CDH prices.
INSERT INTO charge_master (code, description, category, amount, match_key) VALUES
  ('RM-GW-M', 'General Ward (Male) bed, first day', 'Room', 1200.00, 'W-001'),
  ('RM-GW-F', 'General Ward (Female) bed, first day', 'Room', 1200.00, 'W-002'),
  ('RM-ICU', 'ICU bed, first day', 'Room', 4500.00, 'W-003'),
  ('RM-PED', 'Pediatrics Ward bed, first day', 'Room', 1200.00, 'W-004'),
  ('RM-ISO', 'Isolation Ward bed, first day', 'Room', 2000.00, 'W-005'),
  ('LB-CBC', 'Complete Blood Count (CBC)', 'Laboratory', 350.00, 'Complete Blood Count (CBC)'),
  ('LB-UA', 'Urinalysis', 'Laboratory', 150.00, 'Urinalysis'),
  ('LB-LIPID', 'Lipid Profile', 'Laboratory', 800.00, 'Lipid Profile'),
  ('LB-FBS', 'Fasting Blood Sugar', 'Laboratory', 180.00, 'Fasting Blood Sugar'),
  ('RD-CXR', 'Chest X-ray (PA view)', 'Radiology', 450.00, 'Chest X-ray'),
  ('MD-PCM500', 'Paracetamol 500mg tablet', 'Medication', 3.50, 'Paracetamol 500mg'),
  ('MD-AMX500', 'Amoxicillin 500mg capsule', 'Medication', 8.00, 'Amoxicillin 500mg'),
  ('MD-LOS50', 'Losartan 50mg tablet', 'Medication', 12.00, 'Losartan 50mg'),
  ('MD-MET500', 'Metformin 500mg tablet', 'Medication', 4.00, 'Metformin 500mg');

-- Same 12 fictional inpatients as the other services
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

-- Charges already captured before go-live day, so the Billing tab isn't
-- empty on a fresh stack. Each gets a random source event ID, like a real
-- event would. One nebulization kit has no charge master price on purpose,
-- to show the unpriced flag (UC-12).
INSERT INTO charges (id, patient_id, code, description, quantity, unit_amount, amount, is_unpriced,
                     source_event_id, source_type, posted_at) VALUES
  ('CHG-000001', 'WAH-2026-00001', 'RM-ICU', 'ICU bed, first day', 1, 4500.00, 4500.00, false, gen_random_uuid(), 'patient.admitted', now() - interval '100 hours'),
  ('CHG-000002', 'WAH-2026-00004', 'RM-ICU', 'ICU bed, first day', 1, 4500.00, 4500.00, false, gen_random_uuid(), 'patient.admitted', now() - interval '115 hours'),
  ('CHG-000003', 'WAH-2026-00002', 'RM-PED', 'Pediatrics Ward bed, first day', 1, 1200.00, 1200.00, false, gen_random_uuid(), 'patient.admitted', now() - interval '172 hours'),
  ('CHG-000004', 'WAH-2026-00005', 'RM-GW-F', 'General Ward (Female) bed, first day', 1, 1200.00, 1200.00, false, gen_random_uuid(), 'patient.admitted', now() - interval '67 hours'),
  ('CHG-000005', 'WAH-2026-00004', 'LB-CBC', 'Complete Blood Count (CBC)', 1, 350.00, 350.00, false, gen_random_uuid(), 'diagnostic.ordered', now() - interval '10 minutes'),
  ('CHG-000006', 'WAH-2026-00002', 'LB-UA', 'Urinalysis', 1, 150.00, 150.00, false, gen_random_uuid(), 'diagnostic.ordered', now() - interval '25 minutes'),
  ('CHG-000007', 'WAH-2026-00003', 'LB-LIPID', 'Lipid Profile', 1, 800.00, 800.00, false, gen_random_uuid(), 'diagnostic.ordered', now() - interval '1 hour'),
  ('CHG-000008', 'WAH-2026-00005', 'LB-FBS', 'Fasting Blood Sugar', 1, 180.00, 180.00, false, gen_random_uuid(), 'diagnostic.ordered', now() - interval '2 hours'),
  ('CHG-000009', 'WAH-2026-00003', 'MD-LOS50', 'Losartan 50mg tablet', 10, 12.00, 120.00, false, gen_random_uuid(), 'medication.dispensed', now() - interval '23 hours'),
  ('CHG-000010', 'WAH-2026-00002', 'MD-PCM500', 'Paracetamol 500mg tablet', 10, 3.50, 35.00, false, gen_random_uuid(), 'medication.dispensed', now() - interval '3 hours'),
  ('CHG-000011', 'WAH-2026-00001', NULL, 'Nebulization kit', 1, 0.00, 0.00, true, gen_random_uuid(), 'medication.dispensed', now() - interval '6 hours');
