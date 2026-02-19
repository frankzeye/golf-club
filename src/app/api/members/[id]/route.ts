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
      ghinNumber: true,
      handicapIndex: true,
      homeCourse: true,
      imageUrl: true,
      role: true,
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
    email: isAdmin ? user.email : undefined,
    upcomingTournaments: upcomingRegistrations.map((r) => ({
      id: r.tournament.id,
      name: r.tournament.name,
      date: r.tournament.date,
      course: r.tournament.course,
    })),
  };

  return NextResponse.json(member);
}
