-- The five wards from the web prototype (70 beds, 46 taken on go-live day)
INSERT INTO wards (id, name, type, capacity, census_occupied, color) VALUES
  ('W-001', 'General Ward', 'Male', 20, 14, '#a855f7'),
  ('W-002', 'General Ward', 'Female', 20, 18, '#ec4899'),
  ('W-003', 'Intensive Care Unit (ICU)', 'Specialized', 10, 7, '#ef4444'),
  ('W-004', 'Pediatrics Ward', 'Children', 15, 5, '#3b82f6'),
  ('W-005', 'Isolation Ward', 'Specialized', 5, 2, '#10b981');
