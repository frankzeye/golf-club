#!/usr/bin/env node
/**
 * Production DB setup: baselines migrations (so migrate deploy won't fail)
 * and adds any missing columns. Run as pre-deploy or at startup.
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

const cwd = path.join(__dirname, "..");

async function main() {
  // 1. Baseline: mark existing migration as applied (fixes P3005)
  try {
    execSync(
      'npx prisma migrate resolve --applied "20260322151132_add_tournament_description"',
      { cwd, stdio: "pipe" }
    );
    console.log("Database baselined");
  } catch (err) {
    const out = String(err.stderr || err.stdout || err.message || "");
    if (out.includes("already applied") || out.includes("already exists")) {
      console.log("Migration already marked as applied");
    } else {
      console.warn("Baseline (non-fatal):", out.slice(0, 200));
    }
  }

  // 2. Add description column if missing
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
