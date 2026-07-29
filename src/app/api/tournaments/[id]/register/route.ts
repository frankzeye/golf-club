import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";
import { isTournamentPast } from "@/lib/tournament-status";

/**
 * POST /api/tournaments/[id]/register - Register for a tournament
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const tournamentWithCount = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: {
      _count: { select: { registrations: true } },
      playRound: { select: { status: true } },
    },
  });
  if (!tournamentWithCount) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournamentWithCount.adminOnly && session.user.role !== "admin") {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  const tournamentId = tournamentWithCount.id;

  if (isTournamentPast(tournamentWithCount, tournamentWithCount.playRound)) {
    return NextResponse.json(
      { error: "Cannot register for past tournaments" },
      { status: 400 }
    );
  }

  if (tournamentWithCount._count.registrations >= tournamentWithCount.availableSpots) {
    return NextResponse.json(
      { error: "Tournament is full" },
      { status: 400 }
    );
  }

  const totalBuyIn =
    (tournamentWithCount.greenFee ?? 0) +
    (tournamentWithCount.prizePool ?? 0) +
    (tournamentWithCount.clubDonation ?? 0);
  const paymentStatus = totalBuyIn > 0 ? "unpaid" : "confirmed";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { handicapIndex: true },
  });

  try {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        userId: session.user.id,
        paymentStatus,
        handicapIndex: user?.handicapIndex ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Unique constraint violation = already registered
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: "Already registered for this tournament" },
        { status: 400 }
      );
    }
    console.error("Registration failed:", e);
    return NextResponse.json(
      { error: "Failed to register" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tournaments/[id]/register - Unregister from a tournament
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const tournamentWithRound = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: { playRound: { select: { status: true } } },
  });
  if (!tournamentWithRound) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (isTournamentPast(tournamentWithRound, tournamentWithRound.playRound)) {
    return NextResponse.json(
      { error: "Cannot unregister from past tournaments" },
      { status: 400 }
    );
  }

  await prisma.tournamentRegistration.deleteMany({
    where: { tournamentId: tournament.id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
