#!/usr/bin/env node
/**
 * Applies any pending Prisma migrations that are not yet recorded in the
 * _prisma_migrations table. This is a fallback for cases where
 * `prisma migrate deploy` reports "Schema up to date" but migrations have
 * not actually been applied (e.g. the migrations table is out of sync).
 *
 * Usage: node scripts/apply-migrations.js
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
const isPostgres =
  url.startsWith("postgresql://") || url.startsWith("postgres://");

if (!isPostgres) {
  console.log("Skipping apply-migrations: not using PostgreSQL");
  process.exit(0);
}

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

async function main() {
  const prisma = new PrismaClient();

  try {
    // Ensure the _prisma_migrations table exists before querying it.
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    VARCHAR(36)  NOT NULL PRIMARY KEY,
        "checksum"              VARCHAR(64)  NOT NULL,
        "finished_at"           TIMESTAMPTZ,
        "migration_name"        VARCHAR(255) NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        TIMESTAMPTZ,
        "started_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "applied_steps_count"   INTEGER      NOT NULL DEFAULT 0
      );
    `);

    // Fetch the names of migrations already recorded.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM "_prisma_migrations";`
    );
    const applied = new Set(rows.map((r) => r.migration_name));

    // Collect all migration directories, sorted chronologically.
    const entries = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    let appliedCount = 0;

    for (const migrationName of entries) {
      if (applied.has(migrationName)) {
        console.log(`  [skip] ${migrationName} — already applied`);
        continue;
      }

      const sqlFile = path.join(MIGRATIONS_DIR, migrationName, "migration.sql");
      if (!fs.existsSync(sqlFile)) {
        console.log(`  [skip] ${migrationName} — no migration.sql found`);
        continue;
      }

      const sql = fs.readFileSync(sqlFile, "utf8").trim();
      if (!sql) {
        console.log(`  [skip] ${migrationName} — migration.sql is empty`);
        continue;
      }

      console.log(`  [apply] ${migrationName}`);
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err) {
        // Tolerate "already exists" errors so the script is idempotent when
        // objects were created outside of Prisma's migration history.
        const msg = err.message || "";
        const isAlreadyExists =
          msg.includes("already exists") || msg.includes("duplicate");
        if (!isAlreadyExists) {
          throw err;
        }
        console.log(
          `    (tolerated error: ${msg.split("\n")[0]})`
        );
      }

      // Record the migration as applied.
      const id = require("crypto").randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES
           ($1, $2, now(), $3, NULL, NULL, now(), 1);`,
        id,
        "", // checksum — left empty; Prisma will recompute on next deploy
        migrationName
      );

      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log("All migrations already applied — nothing to do.");
    } else {
      console.log(`Applied ${appliedCount} migration(s) successfully.`);
    }
  } catch (err) {
    console.error("apply-migrations failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
