#!/usr/bin/env node
/**
 * Production DB setup: ensures any missing columns exist.
 * The migration 20260322151132_add_tournament_description is already recorded
 * as applied in the database, so we skip prisma migrate resolve and just
 * guarantee the column is present via a safe ALTER TABLE ... IF NOT EXISTS.
 */
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
  console.log("Skipping db-prepare: not using PostgreSQL");
  process.exit(0);
}

async function main() {
  // Add description column if missing (idempotent — safe to run repeatedly)
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "description" TEXT;`
    );
    console.log("Schema up to date");
  } catch (err) {
    console.error("Failed to update schema:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
