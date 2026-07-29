import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tournamentSlug, findUniqueSlug } from "@/lib/tournament-slug";
import { memberSlug } from "@/lib/member-slug";
import { parseStartTime } from "@/lib/tournament-time";
import { resolveCourseSelection } from "@/lib/golf-course";
import { isTournamentPast } from "@/lib/tournament-status";

/**
 * GET /api/tournaments - List all tournaments (past and upcoming)
 * Public: anyone can view tournaments
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === "admin";

    const tournaments = await prisma.tournament.findMany({
      where: isAdmin ? undefined : { adminOnly: false },
      orderBy: { date: "asc" },
      include: {
        playRound: { select: { status: true } },
        registrations: {
          include: {
            user: {
              select: { id: true, slug: true, firstName: true, lastName: true, imageUrl: true, scgaOfficial: true },
            },
          },
        },
      },
    });

    const now = new Date();
    const past = tournaments
      .filter((t) => isTournamentPast(t, t.playRound, now))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const upcoming = tournaments.filter((t) => !isTournamentPast(t, t.playRound, now));

    const format = (t: (typeof tournaments)[0]) => {
      const { registrations, ...rest } = t;
      const slug = t.slug ?? tournamentSlug(t.date, t.name);
      const registeredUsers = registrations.map((r) => ({
        id: r.user.id,
        slug: r.user.slug ?? memberSlug(r.user.firstName ?? "", r.user.lastName ?? ""),
        firstName: r.user.firstName ?? "",
        lastName: r.user.lastName ?? "",
        fullName: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
        imageUrl: r.user.imageUrl,
        scgaOfficial: r.user.scgaOfficial ?? false,
      }));
      const userById = Object.fromEntries(registeredUsers.map((u) => [u.id, u]));
      let prizes: Array<{
        name: string;
        amount: number;
        winnerId?: string;
        winnerIds?: string[];
        winnerName?: string;
        result?: string;
      }> = [];
      if (t.prizes) {
        try {
          prizes = JSON.parse(t.prizes).map(
            (p: {
              name: string;
              amount: number;
              winnerId?: string;
              winnerIds?: string[];
              result?: string;
            }) => {
              let winnerName: string | undefined;
              if (Array.isArray(p.winnerIds) && p.winnerIds.length > 0) {
                const names = p.winnerIds
                  .map((id) => userById[id]?.fullName)
                  .filter(Boolean) as string[];
                winnerName = names.length ? names.join(" / ") : undefined;
              } else if (p.winnerId) {
                winnerName = userById[p.winnerId]?.fullName;
              }
              return { ...p, winnerName };
            }
          );
        } catch {
          prizes = [];
        }
      }
      return {
        ...rest,
        slug,
        prizes,
        registeredCount: registrations.length,
        isRegistered: userId ? registrations.some((r) => r.userId === userId) : false,
        registeredUsers,
        playRoundStatus: t.playRound?.status ?? null,
        scoringCompleted: t.playRound?.status === "completed",
      };
    };

    return NextResponse.json({
      past: past.map(format),
      upcoming: upcoming.map(format),
    });
  } catch (error) {
    console.error("GET /api/tournaments failed:", error);
    return NextResponse.json(
      { error: "Failed to load tournaments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments - Create a new tournament (admin only)
 */
export async function POST(request: NextRequest) {
  const { session, error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const body = await request.json();
    const { name, description, date, startTime, course, courseId, scoringFormat, individualOrTeam, teamSize, availableSpots, greenFee, prizePool, clubDonation, paymentMethod, venmoUsername, prizes, adminOnly } = body;

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

    const courseSelection = await resolveCourseSelection(courseId, course);
    if (!courseSelection) {
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

    const startTimeVal = parseStartTime(startTime);
    if (startTime != null && startTime !== "" && startTimeVal === null) {
      return NextResponse.json(
        { error: "Start time must be in HH:mm format" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);
    const baseSlug = tournamentSlug(dateObj, name.trim());
    const slug = await findUniqueSlug(baseSlug);

    const tournament = await prisma.tournament.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" && description.trim() ? description.trim() : null,
        slug,
        date: dateObj,
        startTime: startTimeVal,
        course: courseSelection.course,
        courseId: courseSelection.courseId,
        scoringFormat: scoringFormat.trim(),
        individualOrTeam: type,
        teamSize: teamSizeVal,
        availableSpots: spots,
        greenFee: gf,
        prizePool: pp,
        clubDonation: cd,
        paymentMethod: paymentMethod === "venmo" || paymentMethod === "cash" ? paymentMethod : null,
        venmoUsername: paymentMethod === "venmo" && venmoUsername ? venmoUsername.trim() : null,
        prizes: Array.isArray(prizes) ? JSON.stringify(prizes) : null,
        adminOnly: adminOnly === true,
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
