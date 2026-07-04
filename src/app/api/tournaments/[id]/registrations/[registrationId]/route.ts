import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePlayRoundHandicapIndex } from "@/lib/play-round-format";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * PATCH /api/tournaments/[id]/registrations/[registrationId] - Admin updates registration
 * DELETE /api/tournaments/[id]/registrations/[registrationId] - Admin removes a registration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug, registrationId } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { paymentStatus } = body;

  const updates: {
    paymentStatus?: string;
    handicapIndex?: number | null;
  } = {};

  if (paymentStatus === "confirmed") {
    updates.paymentStatus = "confirmed";
  } else if (paymentStatus != null) {
    return NextResponse.json(
      { error: "Invalid status. Use paymentStatus: confirmed" },
      { status: 400 }
    );
  }

  if ("handicapIndex" in body) {
    const parsed = parsePlayRoundHandicapIndex(body.handicapIndex);
    if (parsed === undefined) {
      return NextResponse.json(
        { error: "Handicap index must be between 0 and 54" },
        { status: 400 }
      );
    }
    updates.handicapIndex = parsed;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const registration = await prisma.tournamentRegistration.findFirst({
    where: { id: registrationId, tournamentId: tournament.id },
  });

  if (!registration) {
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 }
    );
  }

  await prisma.tournamentRegistration.update({
    where: { id: registrationId },
    data: updates,
  });

  if ("handicapIndex" in updates) {
    const playRound = await prisma.playRound.findUnique({
      where: { tournamentId: tournament.id },
      select: { id: true },
    });
    if (playRound) {
      await prisma.playRoundPlayer.updateMany({
        where: {
          playRoundId: playRound.id,
          userId: registration.userId,
        },
        data: { handicapIndex: updates.handicapIndex ?? null },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug, registrationId } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  const registration = await prisma.tournamentRegistration.findFirst({
    where: { id: registrationId, tournamentId: tournament.id },
  });

  if (!registration) {
    return NextResponse.json(
      { error: "Registration not found" },
      { status: 404 }
    );
  }

  await prisma.tournamentRegistration.delete({
    where: { id: registrationId },
  });

  return NextResponse.json({ ok: true });
}
