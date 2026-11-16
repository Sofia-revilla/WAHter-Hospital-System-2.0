-- Access & Provider Registry owns staff accounts, roles, and the provider
-- registry. Patients live in the Patient Registry service, not here
-- (comment matrix 3).

CREATE TABLE staff (
  id text PRIMARY KEY,
  name text NOT NULL,
  -- role key from packages/shared/src/roles.ts
  role text NOT NULL CHECK (role IN ('AdmittingClerk', 'Physician', 'Nurse', 'Pharmacist', 'LaboratoryStaff',
                                     'RadiologyStaff', 'BillingStaff', 'HospitalAdministrator', 'SystemAdministrator')),
  department text NOT NULL,
  license text,
  password_hash text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deactivated')),
  -- the shared per-portal demo login shown on the login screen
  is_prototype_account boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_role_name ON staff (role, lower(name));
CREATE SEQUENCE staff_number START 100;
