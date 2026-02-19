import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/tournaments/[id] - Get a single tournament's details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const myRegistration = tournament.registrations.find(
    (r) => r.userId === session.user.id
  );

  const registeredUsers = tournament.registrations.map((r) => ({
    id: r.user.id,
    registrationId: r.id,
    firstName: r.user.firstName ?? "",
    lastName: r.user.lastName ?? "",
    fullName: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: r.user.imageUrl,
    paymentStatus: r.paymentStatus,
  }));

  const t = tournament;
  return NextResponse.json({
    id: t.id,
    name: t.name,
    date: t.date,
    course: t.course,
    scoringFormat: t.scoringFormat,
    individualOrTeam: t.individualOrTeam,
    teamSize: t.teamSize,
    availableSpots: t.availableSpots,
    greenFee: t.greenFee,
    prizePool: t.prizePool,
    clubDonation: t.clubDonation,
    registeredCount: t.registrations.length,
    isRegistered: !!myRegistration,
    myPaymentStatus: myRegistration?.paymentStatus ?? null,
    registeredUsers,
  });
}

/**
 * PATCH /api/tournaments/[id] - Update a tournament (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      name,
      date,
      course,
      scoringFormat,
      individualOrTeam,
      teamSize,
      availableSpots,
      greenFee,
      prizePool,
      clubDonation,
    } = body;

    const updates: Record<string, unknown> = {};

    if (name != null && typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (date != null) {
      updates.date = new Date(date);
    }
    if (course != null && typeof course === "string" && course.trim().length > 0) {
      updates.course = course.trim();
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

    const updated = await prisma.tournament.update({
      where: { id },
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  await prisma.tournament.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
