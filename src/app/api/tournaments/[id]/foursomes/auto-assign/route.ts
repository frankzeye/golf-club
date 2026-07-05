import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  autoAssignFoursomes,
  DEFAULT_FOURSOME_START_HOLE,
  foursomeInclude,
  formatTournamentFoursomes,
} from "@/lib/tournament-foursomes";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";

/**
 * POST /api/tournaments/[id]/foursomes/auto-assign — Group registered players into foursomes (admin only).
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

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: "Register players before assigning foursomes." },
        { status: 400 }
      );
    }

    const assigned = autoAssignFoursomes(registrations.map((r) => r.userId));

    await prisma.$transaction(async (tx) => {
      await tx.tournamentFoursome.deleteMany({ where: { tournamentId: tournament.id } });

      for (const foursome of assigned) {
        await tx.tournamentFoursome.create({
          data: {
            tournamentId: tournament.id,
            name: foursome.name,
            sortOrder: foursome.sortOrder,
            startHole: DEFAULT_FOURSOME_START_HOLE,
            members: {
              create: foursome.userIds.map((userId) => ({ userId })),
            },
          },
        });
      }
    });

    const foursomes = await prisma.tournamentFoursome.findMany({
      where: { tournamentId: tournament.id },
      include: foursomeInclude,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ foursomes: formatTournamentFoursomes(foursomes) });
  } catch (err) {
    console.error("POST /api/tournaments/[id]/foursomes/auto-assign failed:", err);
    return NextResponse.json({ error: "Failed to auto-assign foursomes" }, { status: 500 });
  }
}
