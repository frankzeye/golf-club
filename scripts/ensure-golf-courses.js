#!/usr/bin/env node
/**
 * Ensure the GolfCourse table is populated. Imports from OpenGolfAPI when empty.
 * Safe to run on every deploy — skips when courses already exist.
 */
const { execSync } = require("child_process");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const url = process.env.DATABASE_URL || "";
const isPostgres =
  url.startsWith("postgresql://") || url.startsWith("postgres://");

async function main() {
  if (!isPostgres) {
    console.log("Skipping ensure-golf-courses: not using PostgreSQL");
    return;
  }

  const prisma = new PrismaClient();
  try {
    let count = 0;
    try {
      count = await prisma.golfCourse.count();
    } catch (err) {
      console.log(
        "Skipping ensure-golf-courses: GolfCourse table not ready yet.",
        err.message
      );
      return;
    }

    if (count > 0) {
      console.log(`Golf courses already loaded (${count.toLocaleString()}).`);
      return;
    }

    console.log("GolfCourse table is empty — importing US course directory...");
    execSync(`node ${path.join(__dirname, "import-golf-courses.js")}`, {
      stdio: "inherit",
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("ensure-golf-courses failed:", err.message);
  process.exit(1);
});
