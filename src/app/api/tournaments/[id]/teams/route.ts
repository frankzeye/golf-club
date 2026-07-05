import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatTournamentTeams,
  teamInclude,
  validateTeamDrafts,
  type TeamDraft,
} from "@/lib/tournament-teams";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * GET /api/tournaments/[id]/teams — List teams and members.
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

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId: tournament.id },
    include: teamInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    teams: formatTournamentTeams(teams),
  });
}

/**
 * PUT /api/tournaments/[id]/teams — Replace all teams (admin only).
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

    const teamSize = tournament.teamSize === 4 ? 4 : 2;
    const body = await request.json();
    const drafts: TeamDraft[] = Array.isArray(body.teams) ? body.teams : [];
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      select: { userId: true },
    });
    const registeredUserIds = new Set(registrations.map((r) => r.userId));

    const validationError = validateTeamDrafts(drafts, registeredUserIds, teamSize);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.tournamentTeam.deleteMany({ where: { tournamentId: tournament.id } });

      for (const [index, draft] of drafts.entries()) {
        await tx.tournamentTeam.create({
          data: {
            tournamentId: tournament.id,
            name: draft.name.trim(),
            sortOrder: draft.sortOrder ?? index,
            members: {
              create: draft.userIds.map((userId) => ({ userId })),
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
    console.error("PUT /api/tournaments/[id]/teams failed:", err);
    return NextResponse.json({ error: "Failed to save teams" }, { status: 500 });
  }
}
