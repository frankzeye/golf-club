import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberSlug } from "@/lib/member-slug";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";
import { tournamentSlug, findUniqueSlug } from "@/lib/tournament-slug";
import { parseStartTime } from "@/lib/tournament-time";
import { resolveCourseSelection } from "@/lib/golf-course";

/**
 * GET /api/tournaments/[id] - Get a single tournament's details
 * Public: anyone can view tournament details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  const userId = session?.user?.id;

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const tournamentWithReg = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: {
      registrations: {
        include: {
          user: {
            select: {
              id: true,
              slug: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
              scgaOfficial: true,
            },
          },
        },
      },
      playRound: {
        select: {
          id: true,
          slug: true,
          status: true,
        },
      },
    },
  });
  if (!tournamentWithReg) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const t = tournamentWithReg;
  const myRegistration = userId
    ? t.registrations.find((r) => r.userId === userId)
    : null;

  const registeredUsers = t.registrations.map((r) => ({
    id: r.user.id,
    slug: r.user.slug ?? memberSlug(r.user.firstName ?? "", r.user.lastName ?? ""),
    registrationId: r.id,
    firstName: r.user.firstName ?? "",
    lastName: r.user.lastName ?? "",
    fullName: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: r.user.imageUrl,
    scgaOfficial: r.user.scgaOfficial ?? false,
    paymentStatus: r.paymentStatus,
  }));

  return NextResponse.json({
    id: t.id,
    slug: t.slug ?? tournamentSlug(t.date, t.name),
    name: t.name,
    description: t.description ?? null,
    date: t.date,
    startTime: t.startTime ?? null,
    course: t.course,
    courseId: t.courseId ?? null,
    scoringFormat: t.scoringFormat,
    individualOrTeam: t.individualOrTeam,
    teamSize: t.teamSize,
    availableSpots: t.availableSpots,
    greenFee: t.greenFee,
    prizePool: t.prizePool,
    clubDonation: t.clubDonation,
    paymentMethod: t.paymentMethod,
    venmoUsername: t.venmoUsername,
    prizes: t.prizes ? JSON.parse(t.prizes) : [],
    registeredCount: t.registrations.length,
    isRegistered: !!myRegistration,
    myPaymentStatus: myRegistration?.paymentStatus ?? null,
    registeredUsers,
    playRound: t.playRound
      ? {
          id: t.playRound.id,
          slug: t.playRound.slug,
          status: t.playRound.status,
        }
      : null,
    canEnterScores:
      !!myRegistration &&
      !!t.playRound &&
      t.playRound.status === "in_progress",
  });
}

/**
 * PATCH /api/tournaments/[id] - Update a tournament (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      date,
      startTime,
      course,
      courseId,
      scoringFormat,
      individualOrTeam,
      teamSize,
      availableSpots,
      greenFee,
      prizePool,
      clubDonation,
      paymentMethod,
      venmoUsername,
      prizes,
    } = body;

    const updates: Record<string, unknown> = {};

    if (name != null && typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (description !== undefined) {
      updates.description = typeof description === "string" && description.trim() ? description.trim() : null;
    }
    if (date != null) {
      updates.date = new Date(date);
    }
    if (startTime !== undefined) {
      const startTimeVal = parseStartTime(startTime);
      if (startTime != null && startTime !== "" && startTimeVal === null) {
        return NextResponse.json(
          { error: "Start time must be in HH:mm format" },
          { status: 400 }
        );
      }
      updates.startTime = startTimeVal;
    }
    if (course != null || courseId != null) {
      const courseSelection = await resolveCourseSelection(courseId, course);
      if (courseSelection?.course) {
        updates.course = courseSelection.course;
        updates.courseId = courseSelection.courseId;
      }
    }
    if (
      scoringFormat != null &&
      typeof scoringFormat === "string" &&
      scoringFormat.trim().length > 0
    ) {
      updates.scoringFormat = scoringFormat.trim();
    }
    if (individualOrTeam === "team" || individualOrTeam === "individual") {
      updates.individualOrTeam = individualOrTeam;
      updates.teamSize =
        individualOrTeam === "team"
          ? teamSize === 4
            ? 4
            : 2
          : null;
    }
    if (availableSpots != null) {
      const spots = Number(availableSpots);
      if (Number.isInteger(spots) && spots >= 1 && spots <= 999) {
        updates.availableSpots = spots;
      }
    }
    if (greenFee != null) {
      const gf = Number(greenFee);
      if (gf >= 0 && Number.isFinite(gf)) updates.greenFee = gf;
    }
    if (prizePool != null) {
      const pp = Number(prizePool);
      if (pp >= 0 && Number.isFinite(pp)) updates.prizePool = pp;
    }
    if (clubDonation != null) {
      const cd = Number(clubDonation);
      if (cd >= 0 && Number.isFinite(cd)) updates.clubDonation = cd;
    }
    if (paymentMethod === "venmo" || paymentMethod === "cash") {
      updates.paymentMethod = paymentMethod;
      updates.venmoUsername = paymentMethod === "venmo" && venmoUsername ? venmoUsername.trim() : null;
    } else if (paymentMethod === null) {
      updates.paymentMethod = null;
      updates.venmoUsername = null;
    }
    if (prizes !== undefined) {
      updates.prizes = Array.isArray(prizes) ? JSON.stringify(prizes) : null;
    }

    if (updates.name != null || updates.date != null) {
      const name = (updates.name as string) ?? tournament.name;
      const date = updates.date ? new Date(updates.date as string) : tournament.date;
      const baseSlug = tournamentSlug(date, name);
      updates.slug = await findUniqueSlug(baseSlug, tournament.id);
    }

    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Tournament update failed:", err);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tournaments/[id] - Delete a tournament (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  await prisma.tournament.delete({
    where: { id: tournament.id },
  });

  return NextResponse.json({ ok: true });
}
