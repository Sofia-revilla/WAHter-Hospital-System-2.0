#!/bin/sh
# Fills the JWT secret into the declarative config, then starts Kong as usual.
# Keep JWT_SECRET to letters, digits, and dashes: it goes through sed.
set -eu
: "${JWT_SECRET:?JWT_SECRET must be set in .env}"
sed "s|__JWT_SECRET__|${JWT_SECRET}|" /etc/kong/wahter/kong.template.yml > /tmp/kong.yml
export KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
exec /docker-entrypoint.sh kong docker-start
