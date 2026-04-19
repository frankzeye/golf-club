#!/usr/bin/env node
/**
 * Fixes a stuck migration record in the _prisma_migrations table.
 *
 * The migration 20260322151132_add_tournament_description was recorded as
 * applied in Postgres but the actual schema change (adding the description
 * column to Tournament) was never executed because the migration was
 * originally written for SQLite. This script deletes the stuck record so
 * that `prisma migrate deploy` can re-apply it cleanly.
 */
const { execSync } = require("child_process");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const MIGRATION_NAME = "20260322151132_add_tournament_description";

const url = process.env.DATABASE_URL || "";
const isPostgres =
  url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
  console.log("Skipping fix-migration: not using PostgreSQL");
  process.exit(0);
}

const cwd = path.join(__dirname, "..");

async function main() {
  const prisma = new PrismaClient();

  try {
    // Delete the stuck migration record so migrate deploy will re-apply it.
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
      MIGRATION_NAME
    );
    if (result > 0) {
      console.log(`Deleted stuck migration record: ${MIGRATION_NAME}`);
    } else {
      console.log(
        `Migration record not found (already removed or never inserted): ${MIGRATION_NAME}`
      );
    }
  } catch (err) {
    // If the table doesn't exist yet the database is brand-new — nothing to fix.
    if (
      err.message &&
      (err.message.includes("does not exist") ||
        err.message.includes("relation") ||
        err.message.includes("_prisma_migrations"))
    ) {
      console.log(
        "_prisma_migrations table not found — skipping (fresh database)"
      );
    } else {
      console.error("Failed to delete stuck migration record:", err.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }

  // Now re-apply all pending migrations, including the one we just unblocked.
  console.log("Running prisma migrate deploy...");
  try {
    execSync("npx prisma migrate deploy", { cwd, stdio: "inherit" });
    console.log("Migrations applied successfully");
  } catch (err) {
    console.error("prisma migrate deploy failed:", err.message);
    process.exit(1);
  }
}

main();
