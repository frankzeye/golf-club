#!/usr/bin/env node
/**
 * Import US golf courses from OpenGolfAPI into the local database.
 *
 * Usage: node scripts/import-golf-courses.js
 *        node scripts/import-golf-courses.js --file /path/to/opengolfapi-us.csv
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
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

const CSV_URL =
  "https://github.com/opengolfapi/data/releases/download/v2.1.0/opengolfapi-us.csv.gz";
const BATCH_SIZE = 500;

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

function toFloat(value) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value) {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    city: row.city || null,
    state: row.state || null,
    latitude: toFloat(row.latitude),
    longitude: toFloat(row.longitude),
    par: toInt(row.par),
  };
}

async function loadCsv(fileArg) {
  if (fileArg) {
    const raw = fs.readFileSync(fileArg);
    if (fileArg.endsWith(".gz")) {
      return zlib.gunzipSync(raw).toString("utf8");
    }
    return raw.toString("utf8");
  }

  console.log(`Downloading ${CSV_URL}...`);
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return zlib.gunzipSync(buffer).toString("utf8");
}

async function main() {
  const fileArg = process.argv.includes("--file")
    ? process.argv[process.argv.indexOf("--file") + 1]
    : null;

  const csvText = await loadCsv(fileArg);
  const rows = parseCsv(csvText).map(mapRow).filter((row) => row.id && row.name);

  console.log(`Parsed ${rows.length} courses`);

  const prisma = new PrismaClient();
  try {
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((row) =>
          prisma.golfCourse.upsert({
            where: { id: row.id },
            create: row,
            update: {
              name: row.name,
              city: row.city,
              state: row.state,
              latitude: row.latitude,
              longitude: row.longitude,
              par: row.par,
            },
          })
        )
      );
      imported += batch.length;
      process.stdout.write(`\rImported ${imported}/${rows.length}`);
    }
    console.log("\nDone.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
