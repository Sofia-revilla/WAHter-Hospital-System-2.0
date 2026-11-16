-- Phase 1 (US-41 to US-43): every entry says how it ended, and the trail
-- covers failed sign-ins, sign-outs, denied access, and deletions too.

ALTER TABLE entries DROP CONSTRAINT entries_action_check;
ALTER TABLE entries ADD CONSTRAINT entries_action_check CHECK (action IN (
  'LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'ACCESS_DENIED', 'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'AUDIT_QUERY'
));

-- Success, Failure (e.g. a wrong password), or Denied (a role or token check said no)
ALTER TABLE entries ADD COLUMN outcome text NOT NULL DEFAULT 'Success'
  CHECK (outcome IN ('Success', 'Failure', 'Denied'));

-- the filters on the Audit Log screen (US-42)
CREATE INDEX entries_by_actor ON entries (actor_id, occurred_at DESC);
CREATE INDEX entries_by_action ON entries (action, occurred_at DESC);
