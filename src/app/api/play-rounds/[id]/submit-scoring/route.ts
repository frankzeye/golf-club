import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { holesPlayed, parsePlayerScores } from "@/lib/course-scorecard";
import { prisma } from "@/lib/db";
import {
  formatPlayRoundResponse,
  playRoundInclude,
} from "@/lib/play-round-format";
import { getPlayRoundAccess } from "@/lib/play-round-access";
import { findPlayRoundByIdOrSlug } from "@/lib/play-round-slug";

/**
 * POST /api/play-rounds/[id]/submit-scoring — Lock in foursome scores for the viewer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const round = await findPlayRoundByIdOrSlug(id);
    if (!round) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
    }

    if (round.status === "completed") {
      return NextResponse.json({ error: "This round is completed" }, { status: 400 });
    }

    const access = await getPlayRoundAccess(
      round.id,
      session.user.id,
      session.user.role ?? "member"
    );
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!access.viewerPlayerId) {
      return NextResponse.json({ error: "You are not a player on this round" }, { status: 403 });
    }

    const viewerPlayer = await prisma.playRoundPlayer.findUnique({
      where: { id: access.viewerPlayerId },
      select: { scoringSubmittedAt: true },
    });
    if (viewerPlayer?.scoringSubmittedAt) {
      return NextResponse.json({ error: "You have already submitted your scores" }, { status: 400 });
    }

    const scorablePlayers = await prisma.playRoundPlayer.findMany({
      where: {
        playRoundId: round.id,
        id: { in: access.scorablePlayerIds },
      },
      select: { scores: true },
    });

    if (scorablePlayers.length === 0) {
      return NextResponse.json({ error: "No scorable players found" }, { status: 400 });
    }

    const allScored = scorablePlayers.every((player) => {
      const scores = parsePlayerScores(player.scores);
      return holesPlayed(scores) >= round.holeCount;
    });

    if (!allScored) {
      return NextResponse.json(
        { error: "Everyone in your foursome needs a score for every hole before completing." },
        { status: 400 }
      );
    }

    await prisma.playRoundPlayer.update({
      where: { id: access.viewerPlayerId },
      data: { scoringSubmittedAt: new Date() },
    });

    const updated = await prisma.playRound.findUnique({
      where: { id: round.id },
      include: playRoundInclude,
    });
    if (!updated) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
    }

    return NextResponse.json(
      await formatPlayRoundResponse(updated, session.user.id, session.user.role ?? "member")
    );
  } catch (err) {
    console.error("POST /api/play-rounds/[id]/submit-scoring failed:", err);
    return NextResponse.json({ error: "Failed to submit scores" }, { status: 500 });
  }
}
