import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatPlayRoundResponse,
  loadPlayRoundScorecard,
  playRoundInclude,
} from "@/lib/play-round-format";
import { findUniquePlayRoundSlug } from "@/lib/play-round-slug";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";
import { resolveRegistrationHandicapIndex } from "@/lib/tournament-registration";

/**
 * POST /api/tournaments/[id]/start — Start tournament scoring (admin only).
 * Creates a linked play round with all registered members as players.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const { id: idOrSlug } = await params;
    const tournament = await findTournamentByIdOrSlug(idOrSlug);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const existingRound = await prisma.playRound.findUnique({
      where: { tournamentId: tournament.id },
      select: { id: true, slug: true, status: true },
    });
    if (existingRound) {
      const full = await prisma.playRound.findUnique({
        where: { id: existingRound.id },
        include: playRoundInclude,
      });
      if (!full) {
        return NextResponse.json({ error: "Play round not found" }, { status: 404 });
      }
      return NextResponse.json(
        await formatPlayRoundResponse(full, session!.user!.id, session!.user!.role ?? "admin")
      );
    }

    const tournamentWithRegs = await prisma.tournament.findUnique({
      where: { id: tournament.id },
      include: {
        registrations: {
          include: {
            user: { select: { id: true, handicapIndex: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!tournamentWithRegs) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (!tournamentWithRegs.courseId) {
      return NextResponse.json(
        {
          error:
            "This tournament needs a course selected from search before scoring can start. Edit the tournament on the web app.",
        },
        { status: 400 }
      );
    }

    if (tournamentWithRegs.registrations.length === 0) {
      return NextResponse.json(
        { error: "At least one registered member is required to start scoring." },
        { status: 400 }
      );
    }

    const golfCourse = await prisma.golfCourse.findUnique({
      where: { id: tournamentWithRegs.courseId },
      select: { par: true },
    });
    const scorecard = await loadPlayRoundScorecard(
      tournamentWithRegs.courseId,
      18,
      golfCourse?.par
    );

    const baseSlug = `${tournament.slug ?? tournament.id}-scoring`;
    const slug = await findUniquePlayRoundSlug(baseSlug);

    const round = await prisma.playRound.create({
      data: {
        slug,
        course: tournamentWithRegs.course,
        courseId: tournamentWithRegs.courseId,
        tournamentId: tournament.id,
        holeCount: scorecard.length,
        createdById: session!.user!.id,
        players: {
          create: tournamentWithRegs.registrations.map((reg) => ({
            userId: reg.userId,
            scores: {},
            handicapIndex: resolveRegistrationHandicapIndex(
              reg.handicapIndex,
              reg.user.handicapIndex
            ),
          })),
        },
      },
      include: playRoundInclude,
    });

    return NextResponse.json(
      await formatPlayRoundResponse(round, session!.user!.id, session!.user!.role ?? "admin")
    );
  } catch (err) {
    console.error("POST /api/tournaments/[id]/start failed:", err);
    return NextResponse.json({ error: "Failed to start tournament scoring" }, { status: 500 });
  }
}
