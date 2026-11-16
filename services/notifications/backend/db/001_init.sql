-- Notifications: MEWS alerts, acknowledgment, and escalation (UC-03 6a, US-32).
-- Alerts are only ever created from the bus (system-triggered), never by a
-- person through the API. patient_id and acknowledged_by_id are reference IDs.

CREATE TABLE alerts (
  id text PRIMARY KEY,
  vitals_id text NOT NULL UNIQUE,
  patient_id text NOT NULL,
  mews_score integer NOT NULL,
  risk text NOT NULL CHECK (risk IN ('Medium', 'High')),
  raised_at timestamptz NOT NULL,
  acknowledged_at timestamptz,
  acknowledged_by_id text,
  note text,
  -- "false alarm / data correction needed"
  is_false_alarm boolean,
  -- set when a High alert sat unacknowledged too long and was escalated
  escalated_at timestamptz
);

CREATE INDEX alerts_open ON alerts (raised_at) WHERE acknowledged_at IS NULL;

-- An acknowledgment is final. Once acknowledged_at is set the
-- acknowledgment fields can't change and the row can't be deleted.
CREATE FUNCTION protect_acknowledged_alert() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'alerts are never deleted';
  END IF;
  IF OLD.acknowledged_at IS NOT NULL AND (
       NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at
    OR NEW.acknowledged_by_id IS DISTINCT FROM OLD.acknowledged_by_id
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
