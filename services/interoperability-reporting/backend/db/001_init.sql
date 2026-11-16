-- Interoperability & Reporting: FHIR R4 exchange and hospital/DOH reports
-- (UC-07, UC-09). It keeps no copies of patients or admissions: it reads them
-- from the Patient Registry and Patient Flow through their APIs when a
-- resource or report is asked for (comment matrix 3 and 7).

CREATE TABLE report_runs (
  id text PRIMARY KEY,
  kind text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  generated_by_id text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  -- the exported rows, kept so a submitted report can be re-downloaded as it was
  payload jsonb NOT NULL
);

CREATE SEQUENCE report_number START 1;
