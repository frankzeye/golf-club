import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/tournaments - List all tournaments (past and upcoming)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: "asc" },
    include: {
      registrations: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, imageUrl: true },
          },
        },
      },
    },
  });

  const now = new Date();
  const past = tournaments.filter((t) => t.date < now);
  const upcoming = tournaments.filter((t) => t.date >= now);

  const format = (t: (typeof tournaments)[0]) => {
    const { registrations, ...rest } = t;
    const registeredUsers = registrations.map((r) => ({
      id: r.user.id,
      firstName: r.user.firstName ?? "",
      lastName: r.user.lastName ?? "",
      fullName: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
      imageUrl: r.user.imageUrl,
    }));
    return {
      ...rest,
      registeredCount: registrations.length,
      isRegistered: registrations.some((r) => r.userId === session.user.id),
      registeredUsers,
    };
  };

  return NextResponse.json({
    past: past.map(format),
    upcoming: upcoming.map(format),
  });
}

/**
 * POST /api/tournaments - Create a new tournament (admin only)
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const body = await request.json();
    const { name, date, course, scoringFormat, individualOrTeam, teamSize, availableSpots, greenFee, prizePool, clubDonation } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!course || typeof course !== "string" || course.trim().length === 0) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }
    if (
      !scoringFormat ||
      typeof scoringFormat !== "string" ||
      scoringFormat.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Scoring format is required" },
        { status: 400 }
      );
    }
    const type = individualOrTeam === "team" ? "team" : "individual";
    let teamSizeVal: number | null = null;
    if (type === "team") {
      const ts = Number(teamSize);
      if (ts !== 2 && ts !== 4) {
        return NextResponse.json(
          { error: "Team size must be 2 or 4" },
          { status: 400 }
        );
      }
      teamSizeVal = ts;
    }

    const spots = Number(availableSpots);
    if (!Number.isInteger(spots) || spots < 1 || spots > 999) {
      return NextResponse.json(
        { error: "Available spots must be a number between 1 and 999" },
        { status: 400 }
      );
    }

    const gf = Number(greenFee);
    const pp = Number(prizePool);
    const cd = Number(clubDonation);
    if (gf < 0 || pp < 0 || cd < 0 || !Number.isFinite(gf) || !Number.isFinite(pp) || !Number.isFinite(cd)) {
      return NextResponse.json(
        { error: "Green Fee, Prize Pool, and Club Donation must be non-negative numbers" },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: name.trim(),
        date: new Date(date),
        course: course.trim(),
        scoringFormat: scoringFormat.trim(),
        individualOrTeam: type,
        teamSize: teamSizeVal,
        availableSpots: spots,
        greenFee: gf,
        prizePool: pp,
        clubDonation: cd,
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Tournament create failed:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }
}
