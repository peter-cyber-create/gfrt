/**
 * Staging entrypoint seed — realistic presentation dataset.
 * Accounts: admin|reviewer|user@gfrt.local
 * Never runs against production / musooka.site.
 */
import { PrismaClient } from "@prisma/client";
import { seedPresentation } from "../src/staging/presentationSeed.js";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed.staging.ts must not run in production.");
  }

  await seedPresentation(prisma, {
    password: process.env.STAGING_SEED_PASSWORD,
    requisitionCount: Number(process.env.STAGING_SEED_REQUISITIONS || 180),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
