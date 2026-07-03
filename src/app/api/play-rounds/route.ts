import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveCourseSelection } from "@/lib/golf-course";
import {
  formatPlayRoundDetail,
  formatPlayRoundSummary,
  loadPlayRoundScorecard,
  playRoundInclude,
} from "@/lib/play-round-format";
import { findUniquePlayRoundSlug, playRoundSlug } from "@/lib/play-round-slug";

const MAX_PLAY_PARTNERS = 3;

/**
 * GET /api/play-rounds — List play rounds (admin only).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const rounds = await prisma.playRound.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: playRoundInclude,
    });

    return NextResponse.json(rounds.map(formatPlayRoundSummary));
  } catch (err) {
    console.error("GET /api/play-rounds failed:", err);
    return NextResponse.json({ error: "Failed to load play rounds" }, { status: 500 });
  }
}

/**
 * POST /api/play-rounds — Create a play round with scorecard (admin only).
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const body = await request.json();
    const { course, courseId, partnerUserIds } = body;

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json(
        { error: "Select a course from search results so we can load the scorecard." },
        { status: 400 }
      );
    }

    const courseSelection = await resolveCourseSelection(courseId, course);
    if (!courseSelection?.courseId) {
      return NextResponse.json({ error: "Course not found" }, { status: 400 });
    }

    const partnerIds: string[] = Array.isArray(partnerUserIds)
      ? partnerUserIds.filter((id): id is string => typeof id === "string")
      : [];
    const uniquePartnerIds = [...new Set(partnerIds)].filter(
      (id) => id !== session!.user!.id
    );

    if (uniquePartnerIds.length > MAX_PLAY_PARTNERS) {
      return NextResponse.json(
        { error: `You can add up to ${MAX_PLAY_PARTNERS} playing partners` },
        { status: 400 }
      );
    }

    const playerIds = [session!.user!.id, ...uniquePartnerIds];
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: playerIds } },
      select: { id: true },
    });
    if (existingUsers.length !== playerIds.length) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 400 });
    }

    const golfCourse = await prisma.golfCourse.findUnique({
      where: { id: courseSelection.courseId },
      select: { par: true },
    });
    const scorecard = await loadPlayRoundScorecard(
      courseSelection.courseId,
      18,
      golfCourse?.par
    );

    const now = new Date();
    const baseSlug = playRoundSlug(courseSelection.course, now);
    const slug = await findUniquePlayRoundSlug(baseSlug);

    const round = await prisma.playRound.create({
      data: {
        slug,
        course: courseSelection.course,
        courseId: courseSelection.courseId,
        holeCount: scorecard.length,
        createdById: session!.user!.id,
        players: {
          create: playerIds.map((userId) => ({
            userId,
            scores: {},
          })),
        },
      },
      include: playRoundInclude,
    });

    const detail = await formatPlayRoundDetail(round, session!.user!.id);
    return NextResponse.json(detail);
  } catch (err) {
    console.error("POST /api/play-rounds failed:", err);
    return NextResponse.json({ error: "Failed to create play round" }, { status: 500 });
  }
}
