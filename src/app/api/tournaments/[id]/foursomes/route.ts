import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  foursomeInclude,
  formatTournamentFoursomes,
  parseFoursomeStartHole,
  validateFoursomeDrafts,
  type FoursomeDraft,
} from "@/lib/tournament-foursomes";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";
import { parseStartTime } from "@/lib/tournament-time";

/**
 * GET /api/tournaments/[id]/foursomes — List foursomes and members.
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

  const foursomes = await prisma.tournamentFoursome.findMany({
    where: { tournamentId: tournament.id },
    include: foursomeInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    foursomes: formatTournamentFoursomes(foursomes),
  });
}

/**
 * PUT /api/tournaments/[id]/foursomes — Replace all foursomes (admin only).
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

    const body = await request.json();
    const drafts: FoursomeDraft[] = Array.isArray(body.foursomes) ? body.foursomes : [];
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: tournament.id },
      select: { userId: true },
    });
    const registeredUserIds = new Set(registrations.map((r) => r.userId));

    const validationError = validateFoursomeDrafts(drafts, registeredUserIds);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.tournamentFoursome.deleteMany({ where: { tournamentId: tournament.id } });

      for (const [index, draft] of drafts.entries()) {
        await tx.tournamentFoursome.create({
          data: {
            tournamentId: tournament.id,
            name: draft.name.trim(),
            sortOrder: draft.sortOrder ?? index,
            startTime: parseStartTime(draft.startTime),
            startHole: parseFoursomeStartHole(draft.startHole),
            members: {
              create: draft.userIds.map((userId) => ({ userId })),
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
    console.error("PUT /api/tournaments/[id]/foursomes failed:", err);
    return NextResponse.json({ error: "Failed to save foursomes" }, { status: 500 });
  }
}
