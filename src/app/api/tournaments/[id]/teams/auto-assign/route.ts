import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  autoAssignTeams,
  formatTournamentTeams,
  teamInclude,
} from "@/lib/tournament-teams";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * POST /api/tournaments/[id]/teams/auto-assign — Group registered players into teams (admin only).
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
    const tournament = await prisma.tournament.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: {
        id: true,
        individualOrTeam: true,
        teamSize: true,
      },
    });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournament.individualOrTeam !== "team") {
      return NextResponse.json(
        { error: "Teams can only be assigned for team-format tournaments." },
        { status: 400 }
      );
    }

    const teamSize = tournament.teamSize ?? 2;
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Register players before assigning teams." },
        { status: 400 }
      );
    }

    const assigned = autoAssignTeams(
      registrations.map((r) => r.userId),
      teamSize
    );

    await prisma.$transaction(async (tx) => {
      await tx.tournamentTeam.deleteMany({ where: { tournamentId: tournament.id } });

      for (const team of assigned) {
        await tx.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            name: team.name,
            sortOrder: team.sortOrder,
            members: {
              create: team.userIds.map((userId) => ({ userId })),
            },
          },
        });
      }
    });

    const teams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: tournament.id },
      include: teamInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ teams: formatTournamentTeams(teams) });
  } catch (err) {
    console.error("POST /api/tournaments/[id]/teams/auto-assign failed:", err);
    return NextResponse.json({ error: "Failed to auto-assign teams" }, { status: 500 });
  }
}
