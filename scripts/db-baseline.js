#!/usr/bin/env node
/**
<<<<<<< Updated upstream
 * Production DB setup: baselines migrations (so migrate deploy won't fail)
 * and adds any missing columns. Run as pre-deploy or at startup.
 */
const { execSync } = require("child_process");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
=======
 * Baselines the production database so Prisma Migrate knows existing migrations
 * are already applied. Run at startup before the app. Safe to run repeatedly.
 */
const { execSync } = require("child_process");
const path = require("path");
>>>>>>> Stashed changes

const url = process.env.DATABASE_URL || "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
<<<<<<< Updated upstream
  console.log("Skipping db-prepare: not using PostgreSQL");
=======
>>>>>>> Stashed changes
  process.exit(0);
}

const cwd = path.join(__dirname, "..");
<<<<<<< Updated upstream

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
=======
try {
  execSync(
    'npx prisma migrate resolve --applied "20260322151132_add_tournament_description"',
    { cwd, stdio: "inherit" }
  );
  console.log("Database baselined");
} catch (err) {
  if (err.status === 0) process.exit(0);
  if (String(err.stderr || err.stdout || "").includes("already applied")) {
    console.log("Migration already marked as applied");
    process.exit(0);
  }
  console.warn("Baseline skipped (non-fatal):", err.message);
  process.exit(0);
}
>>>>>>> Stashed changes
