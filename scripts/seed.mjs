#!/usr/bin/env node
/**
 * Standalone seed script for production/staging database or local testing.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  console.log("[db:seed] Seeding database...");
  const { seedDatabase } = await import("../src/server/seed/seed-runner.ts");
  await seedDatabase();
  console.log("[db:seed] Done!");
  process.exit(0);
}

main().catch((err) => {
  console.error("[db:seed] Error seeding database:", err);
  process.exit(1);
});
