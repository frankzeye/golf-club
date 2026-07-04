import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maxStrokesForPar, parsePlayerScores } from "@/lib/course-scorecard";
import {
  formatPlayRoundDetail,
  loadPlayRoundScorecard,
  playRoundInclude,
} from "@/lib/play-round-format";
import { canSaveScoreForPlayer, getPlayRoundAccess } from "@/lib/play-round-access";
import { findPlayRoundByIdOrSlug } from "@/lib/play-round-slug";

/**
 * PATCH /api/play-rounds/[id]/scores — Save strokes for a hole.
 * Admins can score any player; tournament members can score themselves only.
 */
export async function PATCH(
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

    const body = await request.json();
    const playerId = typeof body.playerId === "string" ? body.playerId : "";
    const hole = Number(body.hole);
    const strokesRaw = body.strokes;

    if (!playerId) {
      return NextResponse.json({ error: "Player is required" }, { status: 400 });
    }
    if (!Number.isInteger(hole) || hole < 1 || hole > round.holeCount) {
      return NextResponse.json({ error: "Invalid hole number" }, { status: 400 });
    }

    if (!canSaveScoreForPlayer(access, playerId)) {
      return NextResponse.json({ error: "You can only enter your own scores" }, { status: 403 });
    }

    const player = await prisma.playRoundPlayer.findFirst({
      where: { id: playerId, playRoundId: round.id },
    });
    if (!player) {
      return NextResponse.json({ error: "Player not found on this round" }, { status: 404 });
    }

    const scores = parsePlayerScores(player.scores);
    const holeKey = String(hole);

    if (strokesRaw === null || strokesRaw === "" || strokesRaw === undefined) {
      delete scores[holeKey];
    } else {
      const scorecard = await loadPlayRoundScorecard(round.courseId, round.holeCount, null);
      const holePar = scorecard.find((h) => h.hole === hole)?.par ?? 4;
      const maxStrokes = maxStrokesForPar(holePar);
      const strokes = Number(strokesRaw);
      if (!Number.isInteger(strokes) || strokes < 1 || strokes > maxStrokes) {
        return NextResponse.json(
          { error: `Strokes must be between 1 and ${maxStrokes}` },
          { status: 400 }
        );
      }
      scores[holeKey] = strokes;
    }

    await prisma.playRoundPlayer.update({
      where: { id: player.id },
      data: { scores },
    });

    const updated = await prisma.playRound.findUnique({
      where: { id: round.id },
      include: playRoundInclude,
    });
    if (!updated) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
    }

    return NextResponse.json(await formatPlayRoundDetail(updated, session.user.id));
  } catch (err) {
    console.error("PATCH /api/play-rounds/[id]/scores failed:", err);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
