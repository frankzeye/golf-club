import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  autoAssignFlightsByHandicap,
  flightInclude,
  FLIGHTS_SCORING_FORMAT,
  formatTournamentFlights,
} from "@/lib/tournament-flights";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";
import { resolveRegistrationHandicapIndex } from "@/lib/tournament-registration";

/**
 * POST /api/tournaments/[id]/flights/auto-assign — Split registered players by handicap (admin only).
 */
export async function POST(
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
    const flightCount = Number(body.flightCount);
    if (!Number.isInteger(flightCount) || flightCount < 1 || flightCount > 20) {
      return NextResponse.json({ error: "Flight count must be between 1 and 20." }, { status: 400 });
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      include: {
        user: { select: { id: true, handicapIndex: true } },
      },
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Register players before assigning flights." },
        { status: 400 }
      );
    }

    const assigned = autoAssignFlightsByHandicap(
      registrations.map((r) => ({
        userId: r.userId,
        handicapIndex: resolveRegistrationHandicapIndex(
          r.handicapIndex,
          r.user.handicapIndex
        ),
      })),
      flightCount
    );

    await prisma.$transaction(async (tx) => {
      await tx.tournamentFlight.deleteMany({ where: { tournamentId: tournament.id } });

      for (const flight of assigned) {
        await tx.tournamentFlight.create({
          data: {
            tournamentId: tournament.id,
            name: flight.name,
            sortOrder: flight.sortOrder,
            minHandicap: flight.minHandicap,
            maxHandicap: flight.maxHandicap,
            members: {
              create: flight.userIds.map((userId) => ({ userId })),
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
    console.error("POST /api/tournaments/[id]/flights/auto-assign failed:", err);
    return NextResponse.json({ error: "Failed to auto-assign flights" }, { status: 500 });
  }
}
