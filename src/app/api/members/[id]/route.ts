import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/members/[id] - Get a single member's details (requires sign in)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      cellNumber: true,
      ghinNumber: true,
      handicapIndex: true,
      homeCourse: true,
      imageUrl: true,
      role: true,
      scgaOfficial: true,
      email: true,
      createdAt: true,
      tournamentRegistrations: {
        include: {
          tournament: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "admin";
  const now = new Date();
  const upcomingRegistrations = user.tournamentRegistrations.filter(
    (r) => r.tournament.date >= now
  );

  const hasRegistered = user.tournamentRegistrations.length >= 1;
  const hasPlayed = user.tournamentRegistrations.some(
    (r) => r.tournament.date < now
  );

  const badges: Array<{ id: string; name: string; earned: boolean; tournamentSlug?: string; tournamentName?: string }> = [
    { id: "register-1st", name: "Register for 1st Tourney", earned: hasRegistered },
    { id: "play-1st", name: "Play in 1st Tourney", earned: hasPlayed },
  ];

  const pastTournaments = await prisma.tournament.findMany({
    where: { date: { lt: now } },
    select: { id: true, name: true, slug: true, date: true, prizes: true },
  });

  for (const t of pastTournaments) {
    if (!t.prizes) continue;
    try {
      const prizes = JSON.parse(t.prizes) as Array<{
        name: string;
        amount: number;
        winnerId?: string;
        winnerIds?: string[];
      }>;
      const slug = t.slug ?? t.id;
      const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      prizes.forEach((p, idx) => {
        const won =
          p.winnerId === user.id ||
          (Array.isArray(p.winnerIds) && p.winnerIds.includes(user.id));
        if (won) {
          badges.push({
            id: `prize-${t.id}-${idx}`,
            name: `${p.name} — ${t.name}`,
            earned: true,
            tournamentSlug: slug,
            tournamentName: `${t.name} (${dateStr})`,
          });
        }
      });
    } catch {
      // skip invalid JSON
    }
  }

  const member = {
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    ghinNumber: user.ghinNumber,
    handicapIndex: user.handicapIndex,
    homeCourse: user.homeCourse ?? "",
    imageUrl: user.imageUrl,
    role: user.role,
    scgaOfficial: user.scgaOfficial ?? false,
    email: isAdmin ? user.email : undefined,
    cellNumber: isAdmin ? user.cellNumber : undefined,
    createdAt: user.createdAt,
    upcomingTournaments: upcomingRegistrations.map((r) => ({
      id: r.tournament.id,
      name: r.tournament.name,
      date: r.tournament.date,
      course: r.tournament.course,
    })),
    badges,
  };

  return NextResponse.json(member);
}

/**
 * PATCH /api/members/[id] - Update a member's profile (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { firstName, lastName, cellNumber, ghinNumber, handicapIndex, homeCourse } = body;

    const data: Record<string, unknown> = {};
    if (firstName != null) data.firstName = String(firstName);
    if (lastName != null) data.lastName = String(lastName);
    if (cellNumber != null) data.cellNumber = cellNumber === "" ? null : String(cellNumber);
    if (ghinNumber != null) data.ghinNumber = ghinNumber === "" ? null : String(ghinNumber);
    if (homeCourse != null) data.homeCourse = String(homeCourse);
    if (handicapIndex != null) {
      if (handicapIndex === "") {
        data.handicapIndex = null;
      } else {
        const n = Number(handicapIndex);
        if (!Number.isNaN(n) && n >= 0 && n <= 54) data.handicapIndex = n;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cellNumber: true,
        ghinNumber: true,
        handicapIndex: true,
        homeCourse: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      cellNumber: user.cellNumber,
      ghinNumber: user.ghinNumber,
      handicapIndex: user.handicapIndex,
      homeCourse: user.homeCourse ?? "",
    });
  } catch (error) {
    console.error("Member update failed:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}
