import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  flightInclude,
  FLIGHTS_SCORING_FORMAT,
  formatTournamentFlights,
  validateFlightDrafts,
  type FlightDraft,
} from "@/lib/tournament-flights";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * GET /api/tournaments/[id]/flights — List flights and members.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idOrSlug } = await params;
  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const flights = await prisma.tournamentFlight.findMany({
    where: { tournamentId: tournament.id },
    include: flightInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    flights: formatTournamentFlights(flights),
  });
}

/**
 * PUT /api/tournaments/[id]/flights — Replace all flights (admin only).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const { id: idOrSlug } = await params;
    const tournament = await findTournamentByIdOrSlug(idOrSlug);
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.scoringFormat !== FLIGHTS_SCORING_FORMAT) {
      return NextResponse.json(
        { error: "Flights can only be configured when the scoring format is Flights." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const drafts: FlightDraft[] = Array.isArray(body.flights) ? body.flights : [];
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      select: { userId: true },
    });
    const registeredUserIds = new Set(registrations.map((r) => r.userId));

    const validationError = validateFlightDrafts(drafts, registeredUserIds);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.tournamentFlight.deleteMany({ where: { tournamentId: tournament.id } });

      for (const [index, draft] of drafts.entries()) {
        await tx.tournamentFlight.create({
          data: {
            tournamentId: tournament.id,
            name: draft.name.trim(),
            sortOrder: draft.sortOrder ?? index,
            minHandicap: draft.minHandicap,
            maxHandicap: draft.maxHandicap,
            members: {
              create: draft.userIds.map((userId) => ({ userId })),
            },
          },
        });
      }
    });

    const flights = await prisma.tournamentFlight.findMany({
      where: { tournamentId: tournament.id },
      include: flightInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ flights: formatTournamentFlights(flights) });
  } catch (err) {
    console.error("PUT /api/tournaments/[id]/flights failed:", err);
    return NextResponse.json({ error: "Failed to save flights" }, { status: 500 });
  }
}
