import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { _count: { select: { registrations: true } } },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.date < new Date()) {
    return NextResponse.json(
      { error: "Cannot register for past tournaments" },
      { status: 400 }
    );
  }

  if (tournament._count.registrations >= tournament.availableSpots) {
    return NextResponse.json(
      { error: "Tournament is full" },
      { status: 400 }
    );
  }

  const totalBuyIn =
    (tournament.greenFee ?? 0) +
    (tournament.prizePool ?? 0) +
    (tournament.clubDonation ?? 0);
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

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

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
    where: { tournamentId, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
