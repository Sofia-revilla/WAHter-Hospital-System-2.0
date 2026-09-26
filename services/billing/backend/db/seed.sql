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
