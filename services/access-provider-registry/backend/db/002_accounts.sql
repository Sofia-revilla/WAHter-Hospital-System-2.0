-- Phase 1 (UC-08, US-41 to US-44): login accounts are separate from the
-- provider registry. `staff` stays the registry of who works here (name,
-- role, department, PRC license); `accounts` is how one of them signs in.
-- Disabling a login doesn't remove anyone from the registry, so old orders
-- and charts still point at a real provider.

CREATE TABLE accounts (
  id text PRIMARY KEY,
  staff_id text NOT NULL UNIQUE REFERENCES staff (id),
  username text NOT NULL,
  -- where the access key goes (the paper's Access Key Verification step)
  email text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Disabled')),
  -- consecutive wrong passwords or access keys; reset on a good sign-in
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  -- demo accounts only sign in when the server has DEMO_ACCOUNTS_ENABLED=true
  is_demo boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_id text
);

CREATE UNIQUE INDEX accounts_username ON accounts (lower(username));
CREATE SEQUENCE account_number START 100;

-- Existing databases: every staff row with a password becomes an account.
-- (A fresh database has no staff yet at this point; seed.sql fills both.)
INSERT INTO accounts (id, staff_id, username, email, password_hash, status, is_demo, last_login_at)
SELECT 'ACC-' || lpad(nextval('account_number')::text, 4, '0'),
       id,
       lower(regexp_replace(name, '^(dr\.|rn)\s+|[^A-Za-z]', '', 'gi')) || lower(id),
       lower(id) || '@wahter.local',
       password_hash,
       CASE WHEN status = 'Active' THEN 'Active' ELSE 'Disabled' END,
       is_prototype_account,
       last_login_at
  FROM staff
 WHERE password_hash IS NOT NULL;

ALTER TABLE staff DROP COLUMN password_hash;
ALTER TABLE staff DROP COLUMN is_prototype_account;
ALTER TABLE staff DROP COLUMN last_login_at;
-- the provider's own standing in the registry, apart from any login
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_status_check;
UPDATE staff SET status = 'Active' WHERE status = 'Deactivated';
ALTER TABLE staff ADD CONSTRAINT staff_status_check CHECK (status IN ('Active', 'Inactive'));

-- The paper's Access Key Verification: after the password, a one-time
-- six-digit key goes to the account's email and has to be typed in.
CREATE TABLE login_challenges (
  id uuid PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts (id),
  -- the portal they chose; the token is issued for this role
  role text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- UC-08: role changes and disabling an account need a second System
-- Administrator. The request and the decision are kept, never deleted.
CREATE TABLE approval_requests (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('RoleChange', 'Disable')),
  account_id text NOT NULL REFERENCES accounts (id),
  -- the change being asked for, e.g. {"newRole": "Nurse"}; JSONB because
  -- each kind carries different details
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_by_id text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by_id text,
  decided_at timestamptz,
  decision_note text,
  -- the person who asked can never be the one who approves
  CHECK (decided_by_id IS NULL OR decided_by_id <> requested_by_id)
);

-- one open request per account at a time, so two admins can't race
CREATE UNIQUE INDEX approval_requests_one_open ON approval_requests (account_id) WHERE status = 'Pending';
CREATE SEQUENCE approval_number START 1;
