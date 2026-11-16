-- The two alerts raised by Clinical Care's seeded vitals (VS-0001 High,
-- VS-0002 Medium). On a fresh stack they'd arrive over the bus, but the
-- seeds are loaded straight into each schema, so we add them here too.
INSERT INTO alerts (id, vitals_id, patient_id, mews_score, risk, raised_at) VALUES
  ('AL-VS-0001', 'VS-0001', 'WAH-2026-00001', 11, 'High', now() - interval '12 minutes'),
  ('AL-VS-0002', 'VS-0002', 'WAH-2026-00004', 3, 'Medium', now() - interval '35 minutes');
