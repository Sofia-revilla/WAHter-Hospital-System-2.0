#!/bin/sh
# Runs once, when the Postgres volume is first created. One shared instance,
# but every service gets its own schema and its own login that can only see
# that schema (paper Limitation i: schema-per-service). No cross-schema
# grants, so services can only share data over REST or the event bus.
set -eu

create_service() {
  role="$1"
  schema="$2"
  password="$3"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE $role LOGIN PASSWORD '$password';
CREATE SCHEMA $schema AUTHORIZATION $role;
ALTER ROLE $role SET search_path = $schema;
SQL
}

# nobody but the admin creates anything in public
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "REVOKE CREATE ON SCHEMA public FROM PUBLIC;"

# the ten services (paper TABLE IV)
create_service access_provider_registry_svc access "$ACCESS_PROVIDER_REGISTRY_DB_PASSWORD"
create_service patient_registry_svc patient_registry "$PATIENT_REGISTRY_DB_PASSWORD"
create_service patient_flow_svc patient_flow "$PATIENT_FLOW_DB_PASSWORD"
create_service clinical_care_svc clinical "$CLINICAL_CARE_DB_PASSWORD"
create_service diagnostics_svc diagnostics "$DIAGNOSTICS_DB_PASSWORD"
create_service pharmacy_svc pharmacy "$PHARMACY_DB_PASSWORD"
create_service billing_revenue_cycle_svc billing "$BILLING_REVENUE_CYCLE_DB_PASSWORD"
create_service interoperability_reporting_svc interop "$INTEROPERABILITY_REPORTING_DB_PASSWORD"
create_service notifications_svc notifications "$NOTIFICATIONS_DB_PASSWORD"
create_service audit_log_svc audit "$AUDIT_LOG_DB_PASSWORD"
