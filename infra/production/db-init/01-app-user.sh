#!/bin/sh
# Creates least-privilege application role on first DB init.
# Passwords come from environment at container first-boot only.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'musooka_app') THEN
    CREATE ROLE musooka_app LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO musooka_app;
GRANT USAGE ON SCHEMA public TO musooka_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO musooka_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO musooka_app;
EOSQL
