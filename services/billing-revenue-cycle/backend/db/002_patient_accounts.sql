-- Phase 3: an admission opens the patient's account for that stay (UC-02 →
-- UC-06), so billing has somewhere to put charges even before the first one
-- arrives. Phase 8 builds invoices, payments, and claims on top.
CREATE TABLE patient_accounts (
  id text PRIMARY KEY,
  patient_id text NOT NULL,
  -- reference ID into Patient Flow
  admission_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Cleared', 'Closed')),
  opened_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX patient_accounts_by_patient ON patient_accounts (patient_id);
CREATE SEQUENCE patient_account_number START 1;
