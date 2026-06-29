import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * POST /api/tournaments/[id]/registrations - Admin adds a member to a tournament
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  let body: { userId?: string; markAsPaid?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const tournamentWithCount = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournamentWithCount) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournamentWithCount._count.registrations >= tournamentWithCount.availableSpots) {
    return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
  }

  const totalBuyIn =
    (tournamentWithCount.greenFee ?? 0) +
    (tournamentWithCount.prizePool ?? 0) +
    (tournamentWithCount.clubDonation ?? 0);

  const paymentStatus =
    body.markAsPaid === true || totalBuyIn === 0 ? "confirmed" : "unpaid";

  try {
    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournamentWithCount.id,
        userId,
        paymentStatus,
      },
    });
    return NextResponse.json({ ok: true, registrationId: registration.id });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json(
        { error: "Already registered for this tournament" },
        { status: 400 }
      );
    }
    console.error("Admin registration failed:", e);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}
