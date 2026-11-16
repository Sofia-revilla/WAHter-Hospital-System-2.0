-- Phase 2 (UC-01 step 9, extension 9a; groundwork for UC-09): every record
-- that has to reach WAH Systems gets a transaction here. If WAH Systems is
-- down the transaction stays Pending and is retried; the local record is
-- never affected. Phase 10 adds the other resources and the Data Exchange screen.

CREATE TABLE exchange_transactions (
  id text PRIMARY KEY,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('Create', 'Update', 'Merge')),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Sent', 'Rejected')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  -- the ID WAH Systems gave the resource, once it accepted it
  external_id text,
  -- the bus event that asked for this, so a redelivery doesn't queue it twice
  source_event_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX exchange_transactions_due ON exchange_transactions (next_attempt_at) WHERE status = 'Pending';
CREATE INDEX exchange_transactions_by_resource ON exchange_transactions (resource_type, resource_id, created_at DESC);
CREATE SEQUENCE exchange_transaction_number START 1;
