import { PrismaClient } from "@prisma/client";

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("MIGRATE_DATABASE_URL or DATABASE_URL required for grants");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  const dbName = process.env.POSTGRES_DB || "musooka_staging";
  const statements = [
    `GRANT CONNECT ON DATABASE ${dbName} TO musooka_app`,
    `GRANT USAGE ON SCHEMA public TO musooka_app`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO musooka_app`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO musooka_app`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO musooka_app`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO musooka_app`,
  ];
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Granted DML privileges on public schema to musooka_app");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
