-- Same 12 fictional inpatients as Identity's seed, with the clinical side:
-- department, condition, and the last MEWS from the web prototype's mock.
-- Two of them have real charted vitals, scored with the shared MEWS code.

INSERT INTO patients (id, name, sex, birth_date) VALUES
  ('WAH-2026-00001', 'Michael Davis', 'Male', current_date - interval '45 years' - interval '40 days'),
  ('WAH-2026-00002', 'Olivia Johnson', 'Male', current_date - interval '15 years' - interval '63 days'),
  ('WAH-2026-00003', 'Jennifer Miller', 'Male', current_date - interval '19 years' - interval '86 days'),
  ('WAH-2026-00004', 'James Smith', 'Female', current_date - interval '87 years' - interval '109 days'),
  ('WAH-2026-00005', 'Patricia Brown', 'Female', current_date - interval '40 years' - interval '132 days'),
  ('WAH-2026-00006', 'Sophia Martinez', 'Male', current_date - interval '8 years' - interval '155 days'),
  ('WAH-2026-00007', 'John Garcia', 'Male', current_date - interval '85 years' - interval '178 days'),
  ('WAH-2026-00008', 'Mia Smith', 'Male', current_date - interval '13 years' - interval '201 days'),
  ('WAH-2026-00009', 'James Smith', 'Male', current_date - interval '34 years' - interval '224 days'),
  ('WAH-2026-00010', 'David Martinez', 'Male', current_date - interval '22 years' - interval '247 days'),
  ('WAH-2026-00011', 'Linda Rodriguez', 'Female', current_date - interval '73 years' - interval '270 days'),
  ('WAH-2026-00012', 'Elizabeth Jones', 'Female', current_date - interval '75 years' - interval '293 days');

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

INSERT INTO vitals (id, patient_id, encounter_id, respiratory_rate, oxygen_saturation, temperature, systolic_bp, heart_rate, consciousness, mews_score, risk, recorded_by, recorded_by_id, recorded_at) VALUES
  ('VS-0001', 'WAH-2026-00001', 'ENC-0001', 24, 91, 38.6, 95, 115, 'Voice', 11, 'High', 'RN Demo Nurse', 'EMP-N000', now() - interval '12 minutes'),
  ('VS-0002', 'WAH-2026-00004', 'ENC-0004', 22, 95, 37.4, 112, 98, 'Alert', 3, 'Medium', 'RN Demo Nurse', 'EMP-N000', now() - interval '35 minutes');

SELECT setval('vitals_number', 2);
