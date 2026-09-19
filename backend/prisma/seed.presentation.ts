/**
 * CLI: npm run db:seed:presentation
 * Deterministic staging presentation dataset (never production).
 */
import { PrismaClient } from "@prisma/client";
import { seedPresentation } from "../src/staging/presentationSeed.js";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed.presentation.ts must not run in production.");
  }
  await seedPresentation(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
