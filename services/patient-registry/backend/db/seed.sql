-- The 12 fictional inpatients from the web prototype. Nobody here is real.
-- Birth dates are anchored to the day the database is created so the ages
-- stay the same. Addresses are made up, in the pilot site's municipality
-- (Concepcion, Tarlac). They count as already shared with WAH Systems.
INSERT INTO patients (id, name, given_name, family_name, sex, birth_date, philhealth_pin, address, exchange_status) VALUES
  ('WAH-2026-00001', 'Michael Davis', 'Michael', 'Davis', 'Male', current_date - interval '45 years' - interval '40 days', '190000000001', '{"barangay": "San Nicolas", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00002', 'Olivia Johnson', 'Olivia', 'Johnson', 'Male', current_date - interval '15 years' - interval '63 days', '190000007920', '{"barangay": "Santa Cruz", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00003', 'Jennifer Miller', 'Jennifer', 'Miller', 'Male', current_date - interval '19 years' - interval '86 days', NULL, '{"barangay": "San Jose", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00004', 'James Smith', 'James', 'Smith', 'Female', current_date - interval '87 years' - interval '109 days', '190000023758', '{"barangay": "Alfonso", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00005', 'Patricia Brown', 'Patricia', 'Brown', 'Female', current_date - interval '40 years' - interval '132 days', '190000031677', '{"barangay": "Balutu", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00006', 'Sophia Martinez', 'Sophia', 'Martinez', 'Male', current_date - interval '8 years' - interval '155 days', NULL, '{"barangay": "Cafe", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00007', 'John Garcia', 'John', 'Garcia', 'Male', current_date - interval '85 years' - interval '178 days', '190000047515', '{"barangay": "Calius Gueco", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00008', 'Mia Smith', 'Mia', 'Smith', 'Male', current_date - interval '13 years' - interval '201 days', '190000055434', '{"barangay": "Dutung-A-Matas", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00009', 'James Smith', 'James', 'Smith', 'Male', current_date - interval '34 years' - interval '224 days', NULL, '{"barangay": "Green Village", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00010', 'David Martinez', 'David', 'Martinez', 'Male', current_date - interval '22 years' - interval '247 days', '190000071272', '{"barangay": "Lilibangan", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00011', 'Linda Rodriguez', 'Linda', 'Rodriguez', 'Female', current_date - interval '73 years' - interval '270 days', '190000079191', '{"barangay": "Malupa", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent'),
  ('WAH-2026-00012', 'Elizabeth Jones', 'Elizabeth', 'Jones', 'Female', current_date - interval '75 years' - interval '293 days', NULL, '{"barangay": "Pitabunan", "municipality": "Concepcion", "province": "Tarlac"}', 'Sent');
