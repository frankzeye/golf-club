#!/usr/bin/env node
// Swaps Prisma schema to PostgreSQL for production builds.
// Uses DATABASE_URL if it points to postgres, otherwise NODE_ENV=production
// (Railway may not inject DATABASE_URL at build time, but NODE_ENV is set).
const fs = require("fs");
const path = require("path");

// Load .env if present (for local npm install only - .env is gitignored)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
  }
}

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const url = process.env.DATABASE_URL || "";
const isRailway = !!process.env.RAILWAY_PROJECT_ID;
const isProduction = process.env.NODE_ENV === "production";
const usePostgres =
  url.startsWith("postgresql://") ||
  url.startsWith("postgres://") ||
  isRailway ||
  isProduction;

if (usePostgres) {
  let schema = fs.readFileSync(schemaPath, "utf8");
  schema = schema.replace(/provider = "sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  const reason = url.startsWith("postgres")
    ? ""
    : isRailway
      ? " (Railway)"
      : " (NODE_ENV=production)";
  console.log("Using PostgreSQL schema" + reason);
}
