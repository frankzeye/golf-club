import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * POST /api/tournaments/[id]/register/mark-paid - User marks themselves as paid (sets status to pending)
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
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  const registration = await prisma.tournamentRegistration.findFirst({
    where: { tournamentId: tournament.id, userId: session.user.id },
    include: { tournament: true },
  });

  if (!registration) {
    return NextResponse.json(
      { error: "Not registered for this tournament" },
      { status: 404 }
    );
  }

  if (registration.paymentStatus !== "unpaid") {
    return NextResponse.json(
      { error: "Payment status is not unpaid" },
      { status: 400 }
    );
  }

  const totalBuyIn =
    (registration.tournament.greenFee ?? 0) +
    (registration.tournament.prizePool ?? 0) +
    (registration.tournament.clubDonation ?? 0);
  if (totalBuyIn <= 0) {
    return NextResponse.json(
      { error: "No payment required for this tournament" },
      { status: 400 }
    );
  }

  await prisma.tournamentRegistration.update({
    where: { id: registration.id },
    data: { paymentStatus: "pending" },
  });

  return NextResponse.json({ ok: true });
}
