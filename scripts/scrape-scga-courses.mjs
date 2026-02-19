/**
 * Scrape golf course names from SCGA Course Directory
 * https://newfrontier.scga.org/course-directory
 *
 * Usage: node scripts/scrape-scga-courses.mjs
 *
 * Note: Verify SCGA's Terms of Service before scraping. This script is for
 * building a local dataset for your club's autocomplete feature.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

function fetchUrl(url) {
  return execSync(`curl -sL "${url.replace(/"/g, '\\"')}"`, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function extractCourseNames(html) {
  const re = /class="course-listing__course--name"[^>]*>[\s]*([^<]+)[\s]*</g;
  const names = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].trim();
    if (name.length > 0) names.push(name);
  }
  return names;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://newfrontier.scga.org/course-directory";
const OUTPUT_PATH = join(__dirname, "../src/data/california-golf-courses.json");

const allCourses = new Set();
let page = 1;
let hasMore = true;

while (hasMore) {
  const url =
    page === 1 ? BASE_URL : `${BASE_URL}?page=${page}&hsLang=en`;
  console.log(`Fetching page ${page}: ${url}`);

  let html;
  try {
    html = await fetchUrl(url);
  } catch (err) {
    console.error(`Failed to fetch page ${page}:`, err.message);
    break;
  }
  const names = extractCourseNames(html);

  if (names.length === 0) {
    console.log(`No courses found on page ${page}, stopping.`);
    hasMore = false;
    break;
  }

  names.forEach((name) => allCourses.add(name));
  console.log(`  Found ${names.length} courses (${allCourses.size} total)`);

  page++;
  if (page > 20) {
    console.log("Reached max page limit (20), stopping.");
    break;
  }

  await new Promise((r) => setTimeout(r, 500));
}

const sorted = [...allCourses].sort();
const output = sorted.map((name) => ({ name }));

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

console.log(`\nWrote ${output.length} courses to ${OUTPUT_PATH}`);
