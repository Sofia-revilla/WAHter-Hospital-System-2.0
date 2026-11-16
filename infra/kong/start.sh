#!/bin/sh
# Fills the secrets into the declarative config, then starts Kong as usual.
# Keep both secrets to letters, digits, and dashes: they go through sed.
set -eu
: "${JWT_SECRET:?JWT_SECRET must be set in .env}"
: "${GATEWAY_LOG_SECRET:?GATEWAY_LOG_SECRET must be set in .env}"
sed -e "s|__JWT_SECRET__|${JWT_SECRET}|" -e "s|__GATEWAY_LOG_SECRET__|${GATEWAY_LOG_SECRET}|" \
  /etc/kong/wahter/kong.template.yml > /tmp/kong.yml
export KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
exec /docker-entrypoint.sh kong docker-start
