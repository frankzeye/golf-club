import { NextRequest, NextResponse } from "next/server";
import { formatCourseLabel } from "@/lib/golf-course";
import {
  golfCourseDirectoryCount,
  searchGolfCourses,
  tokenizeCourseSearchQuery,
} from "@/lib/course-search";

/**
 * GET /api/courses/search?q=pebble
 * Search US golf courses by name, city, or state (multi-word AND).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || tokenizeCourseSearchQuery(q).length === 0) {
    return NextResponse.json([]);
  }

  try {
    const total = await golfCourseDirectoryCount();
    if (total === 0) {
      return NextResponse.json(
        {
          error:
            "Course directory has not been loaded on this server yet. Ask an admin to run npm run import:courses.",
        },
        { status: 503 }
      );
    }

    const courses = await searchGolfCourses(q);

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
    const message =
      error instanceof Error ? error.message : "Course search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
