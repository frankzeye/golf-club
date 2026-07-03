import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePlayerScores } from "@/lib/course-scorecard";
import { formatPlayRoundDetail, playRoundInclude } from "@/lib/play-round-format";
import { findPlayRoundByIdOrSlug } from "@/lib/play-round-slug";

/**
 * PATCH /api/play-rounds/[id]/scores — Save strokes for a hole (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const { id } = await params;
    const round = await findPlayRoundByIdOrSlug(id);
    if (!round) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
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
      const strokes = Number(strokesRaw);
      if (!Number.isInteger(strokes) || strokes < 1 || strokes > 20) {
        return NextResponse.json({ error: "Strokes must be between 1 and 20" }, { status: 400 });
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

    return NextResponse.json(await formatPlayRoundDetail(updated, session!.user!.id));
  } catch (err) {
    console.error("PATCH /api/play-rounds/[id]/scores failed:", err);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
