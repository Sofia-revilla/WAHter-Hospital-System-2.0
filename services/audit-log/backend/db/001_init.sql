-- Audit Log: an append-only record of every event on the bus plus every
-- search of the log itself (UC-16).

CREATE TABLE entries (
  id bigserial PRIMARY KEY,
  -- the bus event this came from; null for entries the audit service writes itself
  event_id uuid UNIQUE,
  event_type text NOT NULL,
  source text NOT NULL,
  actor_id text,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL CHECK (action IN ('LOGIN', 'VIEW', 'CREATE', 'UPDATE', 'EXPORT', 'AUDIT_QUERY')),
  -- IDs only, never clinical details (RA 10173)
  resource text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entries_by_time ON entries (occurred_at DESC);

-- UC-16 BR: the audit trail is immutable. Not even this service can edit or
-- remove an entry once it's written.
CREATE FUNCTION reject_audit_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit entries are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_append_only
  BEFORE UPDATE OR DELETE ON entries
  FOR EACH ROW EXECUTE FUNCTION reject_audit_change();
