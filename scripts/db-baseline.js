#!/usr/bin/env node
/**
 * Production DB setup: ensures any missing columns exist and applies any
 * pending migrations that Prisma's own deploy command may have missed.
 * Run as pre-deploy or at startup.
 */
const { execSync } = require("child_process");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
  console.log("Skipping db-prepare: not using PostgreSQL");
  process.exit(0);
}

async function main() {
  // Ensure description column exists on Tournament table (legacy safety net).
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "description" TEXT;`
    );
    console.log("Tournament.description column ensured.");
  } catch (err) {
    console.error("Failed to update schema:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  // Apply any pending migrations that prisma migrate deploy may have missed.
  console.log("Running apply-migrations...");
  execSync(`node ${path.join(__dirname, "apply-migrations.js")}`, {
    stdio: "inherit",
  });
}

main();
