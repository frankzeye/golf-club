#!/usr/bin/env node
/**
 * Usage: node scripts/promote-admin.js <email>
 * Sets User.role to "admin" for the given email (case-insensitive).
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

const email = (process.argv[2] || "").toLowerCase().trim();
if (!email) {
  console.error("Usage: node scripts/promote-admin.js <email>");
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "admin" },
      select: { email: true, role: true },
    });
    console.log("OK:", user.email, "is now", user.role);
  } catch (e) {
    if (e && e.code === "P2025") {
      console.error("No user with email:", email);
      process.exit(1);
    }
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main();
