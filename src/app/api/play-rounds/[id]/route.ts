import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPlayRoundDetail, playRoundInclude } from "@/lib/play-round-format";
import { getPlayRoundAccess } from "@/lib/play-round-access";
import { findPlayRoundByIdOrSlug } from "@/lib/play-round-slug";

/**
 * GET /api/play-rounds/[id] — Play round with scorecard and scores.
 * Admins always; tournament rounds also open to registered players.
 */
export async function GET(
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

    const access = await getPlayRoundAccess(
      round.id,
      session.user.id,
      session.user.role ?? "member"
    );
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const full = await prisma.playRound.findUnique({
      where: { id: round.id },
      include: playRoundInclude,
    });
    if (!full) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
    }

    return NextResponse.json(await formatPlayRoundDetail(full, session.user.id));
  } catch (err) {
    console.error("GET /api/play-rounds/[id] failed:", err);
    return NextResponse.json({ error: "Failed to load play round" }, { status: 500 });
  }
}

/**
 * PATCH /api/play-rounds/[id] — Update round status (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const round = await findPlayRoundByIdOrSlug(id);
    if (!round) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
    }

    const body = await request.json();
    const status = typeof body.status === "string" ? body.status : "";
    if (status !== "in_progress" && status !== "completed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.playRound.update({
      where: { id: round.id },
      data: { status },
      include: playRoundInclude,
    });

    return NextResponse.json(await formatPlayRoundDetail(updated, session.user.id));
  } catch (err) {
    console.error("PATCH /api/play-rounds/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update play round" }, { status: 500 });
  }
}

/**
 * DELETE /api/play-rounds/[id] — Delete a play round and all scores (admin only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const round = await findPlayRoundByIdOrSlug(id);
    if (!round) {
      return NextResponse.json({ error: "Play round not found" }, { status: 404 });
    }

    await prisma.playRound.delete({
      where: { id: round.id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/play-rounds/[id] failed:", err);
    return NextResponse.json({ error: "Failed to delete play round" }, { status: 500 });
  }
}
