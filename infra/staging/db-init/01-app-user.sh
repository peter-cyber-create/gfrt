#!/bin/bash
# Creates least-privilege musooka_app role on first database init.
set -e

: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD must be set}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'musooka_app') THEN
      CREATE ROLE musooka_app WITH LOGIN PASSWORD '${POSTGRES_APP_PASSWORD}';
    ELSE
      ALTER ROLE musooka_app WITH PASSWORD '${POSTGRES_APP_PASSWORD}';
    END IF;
  END
  \$\$;

  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO musooka_app;
  GRANT USAGE ON SCHEMA public TO musooka_app;
  GRANT CREATE ON SCHEMA public TO musooka_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO musooka_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO musooka_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO musooka_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO musooka_app;
EOSQL

echo "musooka_app role configured for ${POSTGRES_DB}"
