import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseCourseScorecard } from "@/lib/course-scorecard";
import {
  parseStrokeIndexesJson,
  resolveStrokeIndexOverrides,
  strokeIndexesToJson,
  validateStrokeIndexesPayload,
} from "@/lib/course-stroke-indexes";
import { fetchAndCacheCourseDetails } from "@/lib/golf-course";
import { loadPlayRoundScorecard } from "@/lib/load-play-round-scorecard";
import { prisma } from "@/lib/db";

/**
 * GET /api/courses/[id]/stroke-indexes — Hole stroke indexes for admin editing
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(_request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id } = await params;

  try {
    const course = await prisma.golfCourse.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        par: true,
        strokeIndexesJson: true,
        detailsJson: true,
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let details = course.detailsJson;
    try {
      details = await fetchAndCacheCourseDetails(id);
    } catch (fetchError) {
      console.error(`Failed to refresh course details for ${id}:`, fetchError);
    }

    const baseScorecard = parseCourseScorecard(details, {
      holeCount: 18,
      totalPar: course.par,
    });
    const effectiveScorecard = await loadPlayRoundScorecard(id, baseScorecard.length, course.par);
    const savedStrokeIndexes = parseStrokeIndexesJson(course.strokeIndexesJson);
    const builtinStrokeIndexes = resolveStrokeIndexOverrides(id, null);

    return NextResponse.json({
      courseId: course.id,
      courseName: course.name,
      holeCount: effectiveScorecard.length,
      scorecard: effectiveScorecard,
      savedStrokeIndexes: savedStrokeIndexes ? strokeIndexesToJson(savedStrokeIndexes) : null,
      hasBuiltinDefaults: builtinStrokeIndexes != null,
      hasSavedOverrides: savedStrokeIndexes != null,
    });
  } catch (err) {
    console.error("GET /api/courses/[id]/stroke-indexes failed:", err);
    return NextResponse.json({ error: "Failed to load stroke indexes" }, { status: 500 });
  }
}

/**
 * PATCH /api/courses/[id]/stroke-indexes — Save admin stroke indexes for a course
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id } = await params;

  try {
    const course = await prisma.golfCourse.findUnique({
      where: { id },
      select: { id: true, par: true, detailsJson: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const rawStrokeIndexes =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).strokeIndexes
        : null;

    let details = course.detailsJson;
    try {
      details = await fetchAndCacheCourseDetails(id);
    } catch {
      // use cached details if refresh fails
    }

    const holeCount = parseCourseScorecard(details, { holeCount: 18, totalPar: course.par }).length;
    const validated = validateStrokeIndexesPayload(rawStrokeIndexes, holeCount);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const strokeIndexesJson = strokeIndexesToJson(validated.value);

    await prisma.golfCourse.update({
      where: { id },
      data: { strokeIndexesJson },
    });

    const effectiveScorecard = await loadPlayRoundScorecard(id, holeCount, course.par);

    return NextResponse.json({
      ok: true,
      savedStrokeIndexes: strokeIndexesJson,
      scorecard: effectiveScorecard,
    });
  } catch (err) {
    console.error("PATCH /api/courses/[id]/stroke-indexes failed:", err);
    return NextResponse.json({ error: "Failed to save stroke indexes" }, { status: 500 });
  }
}
