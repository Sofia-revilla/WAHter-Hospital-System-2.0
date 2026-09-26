#!/bin/sh
# Runs once, when the Postgres volume is first created. One shared instance,
# but every service gets its own schema and its own login that can only see
# that schema (paper TABLE IX: schema-per-service). No cross-schema grants,
# so services can only share data over REST or the event bus.
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

create_service identity_svc identity "$IDENTITY_DB_PASSWORD"
create_service clinical_records_svc clinical "$CLINICAL_RECORDS_DB_PASSWORD"
create_service scheduling_svc scheduling "$SCHEDULING_DB_PASSWORD"
create_service orders_diagnostics_svc orders "$ORDERS_DIAGNOSTICS_DB_PASSWORD"
create_service billing_svc billing "$BILLING_DB_PASSWORD"
create_service interoperability_svc interop "$INTEROPERABILITY_DB_PASSWORD"
create_service notifications_svc notifications "$NOTIFICATIONS_DB_PASSWORD"
create_service audit_log_svc audit "$AUDIT_LOG_DB_PASSWORD"
