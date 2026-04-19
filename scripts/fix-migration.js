#!/usr/bin/env node
/**
 * Fixes a stuck migration record in the _prisma_migrations table.
 *
 * The migration 20260322151132_add_tournament_description may be in one of
 * two states:
 *
 *   1. The "description" column already exists on the Tournament table but
 *      there is no corresponding record in _prisma_migrations (or the record
 *      is stuck/failed).  Running `prisma migrate deploy` would fail with
 *      `ERROR: column "description" of relation "Tournament" already exists`.
 *      In this case we insert a completed migration record so Prisma treats
 *      the migration as already applied and moves on.
 *
 *   2. The column does NOT exist yet.  We delete any stuck record and let
 *      `prisma migrate deploy` apply the migration normally.
 */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const MIGRATION_NAME = "20260322151132_add_tournament_description";
const MIGRATION_SQL_PATH = path.join(
  __dirname,
  "..",
  "prisma",
  "migrations",
  MIGRATION_NAME,
  "migration.sql"
);

const url = process.env.DATABASE_URL || "";
const isPostgres =
  url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
  console.log("Skipping fix-migration: not using PostgreSQL");
  process.exit(0);
}

const cwd = path.join(__dirname, "..");

/**
 * Compute the SHA-256 checksum of the migration SQL file, which is the same
 * format Prisma stores in the `checksum` column of _prisma_migrations.
 */
function computeChecksum(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  return crypto.createHash("sha256").update(contents).digest("hex");
}

async function main() {
  const prisma = new PrismaClient();

  try {
    // Check whether the column already exists in the live database.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'Tournament' AND column_name = 'description'`
    );
    const columnExists = rows.length > 0;

    if (columnExists) {
      // The column is already present — inserting the migration record is all
      // that is needed.  Remove any existing (possibly failed/stuck) record
      // first so the INSERT doesn't conflict, then mark it as applied.
      console.log(
        `Column "description" already exists on Tournament — marking migration as applied without re-running SQL.`
      );

      await prisma.$executeRawUnsafe(
        `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
        MIGRATION_NAME
      );

      const checksum = computeChecksum(MIGRATION_SQL_PATH);
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, logs, rolled_back_at,
            started_at, applied_steps_count)
         VALUES
           (gen_random_uuid(), $1, $2::timestamptz, $3, NULL, NULL, $2::timestamptz, 1)`,
        checksum,
        now,
        MIGRATION_NAME
      );

      console.log(
        `Inserted migration record for ${MIGRATION_NAME} (checksum: ${checksum})`
      );
    } else {
      // Column does not exist — delete any stuck record and let Prisma apply
      // the migration normally.
      const deleted = await prisma.$executeRawUnsafe(
        `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
        MIGRATION_NAME
      );
      if (deleted > 0) {
        console.log(`Deleted stuck migration record: ${MIGRATION_NAME}`);
      } else {
        console.log(
          `Migration record not found (already removed or never inserted): ${MIGRATION_NAME}`
        );
      }
    }
  } catch (err) {
    // If the _prisma_migrations table doesn't exist the database is brand-new
    // — nothing to fix, let migrate deploy handle everything.
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
      console.error("Failed to fix migration record:", err.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }

  // Apply all pending migrations (the description migration will be skipped if
  // we just inserted its record above).
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
