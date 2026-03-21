import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/members/[id] - Get a single member's details (requires sign in)
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
      const prizes = JSON.parse(t.prizes) as Array<{ name: string; amount: number; winnerId?: string }>;
      const slug = t.slug ?? t.id;
      const dateStr = t.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      prizes.forEach((p, idx) => {
        if (p.winnerId === user.id) {
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
