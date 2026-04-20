#!/usr/bin/env node
/**
 * Production DB setup: ensures any missing columns exist.
 * Run as pre-deploy or at startup.
 */
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
  console.log("Skipping db-prepare: not using PostgreSQL");
  process.exit(0);
}

async function main() {
  // Ensure description column exists on Tournament table
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
