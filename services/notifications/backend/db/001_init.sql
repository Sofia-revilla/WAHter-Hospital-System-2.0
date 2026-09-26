-- Notifications: MEWS alerts, acknowledgment, and escalation (UC-08).
-- Alerts are only ever created from the bus (UC-08 BR-01: system-triggered),
-- never by a person through the API.

CREATE TABLE alerts (
  id text PRIMARY KEY,
  vitals_id text NOT NULL UNIQUE,
  patient_id text NOT NULL,
  patient_name text NOT NULL,
  mews_score integer NOT NULL,
  risk text NOT NULL CHECK (risk IN ('Medium', 'High')),
  raised_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  acknowledged_by text,
  acknowledged_by_id text,
  note text,
  -- UC-08 ext 4a: "false alarm / data correction needed"
  is_false_alarm boolean,
  -- set when a High alert sat unacknowledged too long and was escalated
  escalated_at timestamptz
);

CREATE INDEX alerts_open ON alerts (raised_at) WHERE acknowledged_at IS NULL;

-- UC-08 BR-03: an acknowledgment is final. Once acknowledged_at is set the
-- acknowledgment fields can't change and the row can't be deleted.
CREATE FUNCTION protect_acknowledged_alert() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'alerts are never deleted';
  END IF;
  IF OLD.acknowledged_at IS NOT NULL AND (
       NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at
    OR NEW.acknowledged_by IS DISTINCT FROM OLD.acknowledged_by
    OR NEW.note IS DISTINCT FROM OLD.note
    OR NEW.is_false_alarm IS DISTINCT FROM OLD.is_false_alarm) THEN
    RAISE EXCEPTION 'alert % was already acknowledged', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_acknowledgment_is_final
  BEFORE UPDATE OR DELETE ON alerts
  FOR EACH ROW EXECUTE FUNCTION protect_acknowledged_alert();
