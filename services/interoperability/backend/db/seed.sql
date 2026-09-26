-- Same 12 fictional patients as Identity's seed (IDs, sex, birth dates, PINs).

INSERT INTO patients (id, name, sex, birth_date, philhealth_pin) VALUES
  ('WAH-2026-00001', 'Michael Davis', 'Male', current_date - interval '45 years' - interval '40 days', '190000000001'),
  ('WAH-2026-00002', 'Olivia Johnson', 'Male', current_date - interval '15 years' - interval '63 days', '190000007920'),
  ('WAH-2026-00003', 'Jennifer Miller', 'Male', current_date - interval '19 years' - interval '86 days', NULL),
  ('WAH-2026-00004', 'James Smith', 'Female', current_date - interval '87 years' - interval '109 days', '190000023758'),
  ('WAH-2026-00005', 'Patricia Brown', 'Female', current_date - interval '40 years' - interval '132 days', '190000031677'),
  ('WAH-2026-00006', 'Sophia Martinez', 'Male', current_date - interval '8 years' - interval '155 days', NULL),
  ('WAH-2026-00007', 'John Garcia', 'Male', current_date - interval '85 years' - interval '178 days', '190000047515'),
  ('WAH-2026-00008', 'Mia Smith', 'Male', current_date - interval '13 years' - interval '201 days', '190000055434'),
  ('WAH-2026-00009', 'James Smith', 'Male', current_date - interval '34 years' - interval '224 days', NULL),
  ('WAH-2026-00010', 'David Martinez', 'Male', current_date - interval '22 years' - interval '247 days', '190000071272'),
  ('WAH-2026-00011', 'Linda Rodriguez', 'Female', current_date - interval '73 years' - interval '270 days', '190000079191'),
  ('WAH-2026-00012', 'Elizabeth Jones', 'Female', current_date - interval '75 years' - interval '293 days', NULL);
