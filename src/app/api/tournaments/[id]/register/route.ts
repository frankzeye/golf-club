import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * POST /api/tournaments/[id]/register - Register for a tournament
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
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
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournamentWithCount) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  const tournamentId = tournamentWithCount.id;

  if (tournamentWithCount.date < new Date()) {
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

  try {
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId,
        userId: session.user.id,
        paymentStatus,
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.date < new Date()) {
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
