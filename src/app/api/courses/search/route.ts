import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatCourseLabel } from "@/lib/golf-course";

const MAX_RESULTS = 15;

/**
 * GET /api/courses/search?q=pebble
 * Search US golf courses by name or city
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const courses = await prisma.$queryRaw<
      Array<{ id: string; name: string; city: string | null; state: string | null }>
    >`
      SELECT id, name, city, state
      FROM "GolfCourse"
      WHERE name ILIKE ${"%" + q + "%"}
         OR city ILIKE ${"%" + q + "%"}
      ORDER BY
        CASE
          WHEN name ILIKE ${q + "%"} THEN 0
          WHEN name ILIKE ${"%" + q + "%"} THEN 1
          ELSE 2
        END,
        name ASC
      LIMIT ${MAX_RESULTS}
    `;

    return NextResponse.json(
      courses.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        label: formatCourseLabel(c.name, c.city, c.state),
      }))
    );
  } catch (error) {
    console.error("GET /api/courses/search failed:", error);
    return NextResponse.json([]);
  }
}
