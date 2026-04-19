import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/profile - Fetch the authenticated user's profile
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      cellNumber: true,
      ghinNumber: true,
      handicapIndex: true,
      homeCourse: true,
      imageUrl: true,
      scgaOfficial: true,
      tournamentRegistrations: {
        include: {
          tournament: { select: { date: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = new Date();
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
          p.winnerId === session.user!.id ||
          (Array.isArray(p.winnerIds) && p.winnerIds.includes(session.user!.id));
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

  const { tournamentRegistrations, ...userData } = user;

  return NextResponse.json({
    ...userData,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    cellNumber: user.cellNumber,
    ghinNumber: user.ghinNumber,
    handicapIndex: user.handicapIndex,
    homeCourse: user.homeCourse,
    imageUrl: user.imageUrl,
    scgaOfficial: user.scgaOfficial,
    badges,
  });
}

/**
 * PATCH /api/profile - Update the authenticated user's profile
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, cellNumber, ghinNumber, handicapIndex, homeCourse } = body;

    let hi: number | null = null;
    if (handicapIndex != null && handicapIndex !== "") {
      const n = Number(handicapIndex);
      if (!Number.isNaN(n) && n >= 0 && n <= 54) hi = n;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: firstName ?? "",
        lastName: lastName ?? "",
        cellNumber: cellNumber ?? null,
        ghinNumber: ghinNumber ?? null,
        handicapIndex: hi,
        homeCourse: homeCourse ?? null,
      },
      select: {
        firstName: true,
        lastName: true,
        cellNumber: true,
        ghinNumber: true,
        handicapIndex: true,
        homeCourse: true,
      },
    });

    return NextResponse.json({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      cellNumber: user.cellNumber,
      ghinNumber: user.ghinNumber,
      handicapIndex: user.handicapIndex,
      homeCourse: user.homeCourse,
    });
  } catch (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
