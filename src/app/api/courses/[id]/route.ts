import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchAndCacheCourseDetails,
  formatCourseLabel,
  OPENGOLF_ATTRIBUTION,
} from "@/lib/golf-course";

/**
 * GET /api/courses/[id] - Course details with OpenGolfAPI cache
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const course = await prisma.golfCourse.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        par: true,
        detailsJson: true,
        detailsCachedAt: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let details = course.detailsJson;
    try {
      details = await fetchAndCacheCourseDetails(id);
    } catch (error) {
      console.error(`Failed to fetch OpenGolfAPI details for ${id}:`, error);
      if (!details) {
        return NextResponse.json(
          { error: "Failed to load course details" },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      id: course.id,
      name: course.name,
      city: course.city,
      state: course.state,
      latitude: course.latitude,
      longitude: course.longitude,
      par: course.par,
      label: formatCourseLabel(course.name, course.city, course.state),
      details,
      attribution: OPENGOLF_ATTRIBUTION,
    });
  } catch (error) {
    console.error("GET /api/courses/[id] failed:", error);
    return NextResponse.json({ error: "Failed to load course" }, { status: 500 });
  }
}
