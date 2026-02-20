#!/usr/bin/env node
// Swaps Prisma schema to PostgreSQL for production builds (when DATABASE_URL uses postgresql)
const fs = require("fs");
const path = require("path");

// Load .env if present (for local npm install)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^DATABASE_URL=(.+)$/);
    if (m) process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
  }
}

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const url = process.env.DATABASE_URL || "";

if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
  let schema = fs.readFileSync(schemaPath, "utf8");
  schema = schema.replace(/provider = "sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log("Using PostgreSQL schema");
}
