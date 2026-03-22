#!/usr/bin/env node
/**
 * Adds the description column to the Tournament table if it doesn't exist.
 * Use for production (PostgreSQL) when the column was added to the schema
 * after the database was created. Run with: railway run node scripts/add-description-column.js
 */
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const url = process.env.DATABASE_URL || "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");

// When running standalone (e.g. railway run) with postgres URL, schema may still be sqlite
if (isPostgres) {
  const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf8");
  if (schema.includes('provider = "sqlite"')) {
    const original = schema;
    try {
      fs.writeFileSync(schemaPath, original.replace(/provider = "sqlite"/, 'provider = "postgresql"'));
      execSync("npx prisma generate", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
    } finally {
      fs.writeFileSync(schemaPath, original);
    }
  }
}

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if (!isPostgres) {
    console.log("Skipping add-description-column: not using PostgreSQL");
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "description" TEXT;`
    );
    console.log("Added description column to Tournament (or it already existed)");
  } catch (err) {
    console.error("Failed to add description column:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
