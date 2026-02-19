import { NextRequest, NextResponse } from "next/server";
import coursesData from "@/data/california-golf-courses.json";

const courses = coursesData as { name: string }[];
const MAX_RESULTS = 15;

/**
 * GET /api/courses/search?q=pebble
 * Search California golf courses by name
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const matches = courses
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS)
    .map((c) => c.name);

  return NextResponse.json(matches);
}
