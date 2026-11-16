-- The clinical side of the 12 fictional inpatients in the Patient Registry seed:
-- department, condition, and the last MEWS from the web prototype's mock.
-- Two of them have real charted vitals, scored with the shared MEWS code.

INSERT INTO encounters (id, patient_id, department, condition, admitted_at, latest_mews, latest_risk) VALUES
  ('ENC-0001', 'WAH-2026-00001', 'ICU', 'Critical', current_date - interval '100 hours', 11, 'High'),
  ('ENC-0002', 'WAH-2026-00002', 'Pediatrics', 'Stable', current_date - interval '172 hours', 7, 'High'),
  ('ENC-0003', 'WAH-2026-00003', 'Internal Medicine', 'Observation', current_date - interval '78 hours', 0, 'Low'),
  ('ENC-0004', 'WAH-2026-00004', 'ICU', 'Observation', current_date - interval '115 hours', 3, 'Medium'),
  ('ENC-0005', 'WAH-2026-00005', 'Surgical Suite', 'Stable', current_date - interval '67 hours', 2, 'Low'),
  ('ENC-0006', 'WAH-2026-00006', 'Pediatrics', 'Stable', current_date - interval '243 hours', 7, 'High'),
  ('ENC-0007', 'WAH-2026-00007', 'Surgical Suite', 'Stable', current_date - interval '275 hours', 2, 'Low'),
  ('ENC-0008', 'WAH-2026-00008', 'Pediatrics', 'Recovering', current_date - interval '212 hours', 9, 'High'),
  ('ENC-0009', 'WAH-2026-00009', 'Internal Medicine', 'Recovering', current_date - interval '177 hours', 1, 'Low'),
  ('ENC-0010', 'WAH-2026-00010', 'ER', 'Observation', current_date - interval '88 hours', 0, 'Low'),
  ('ENC-0011', 'WAH-2026-00011', 'Internal Medicine', 'Stable', current_date - interval '132 hours', 6, 'High'),
  ('ENC-0012', 'WAH-2026-00012', 'Pediatrics', 'Critical', current_date - interval '175 hours', 0, 'Low');

INSERT INTO vitals (id, patient_id, encounter_id, respiratory_rate, oxygen_saturation, temperature, systolic_bp, heart_rate, consciousness, mews_score, risk, recorded_by_id, recorded_at) VALUES
  ('VS-0001', 'WAH-2026-00001', 'ENC-0001', 24, 91, 38.6, 95, 115, 'Voice', 11, 'High', 'EMP-N000', now() - interval '12 minutes'),
  ('VS-0002', 'WAH-2026-00004', 'ENC-0004', 22, 95, 37.4, 112, 98, 'Alert', 3, 'Medium', 'EMP-N000', now() - interval '35 minutes');

SELECT setval('vitals_number', 2);
