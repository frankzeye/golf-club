import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * PATCH /api/tournaments/[id]/registrations/[registrationId] - Admin confirms payment
 * DELETE /api/tournaments/[id]/registrations/[registrationId] - Admin removes a registration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  const { session, error } = await requireAdmin(request);
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

  if (paymentStatus !== "confirmed") {
    return NextResponse.json(
      { error: "Invalid status. Use paymentStatus: confirmed" },
      { status: 400 }
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

  await prisma.tournamentRegistration.update({
    where: { id: registrationId },
    data: { paymentStatus: "confirmed" },
  });

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
