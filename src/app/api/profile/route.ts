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
      ghinNumber: true,
      handicapIndex: true,
      homeCourse: true,
      imageUrl: true,
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

  const badges = [
    { id: "register-1st", name: "Register for 1st Tourney", earned: hasRegistered },
    { id: "play-1st", name: "Play in 1st Tourney", earned: hasPlayed },
  ];

  const { tournamentRegistrations, ...userData } = user;

  return NextResponse.json({
    ...userData,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    ghinNumber: user.ghinNumber,
    handicapIndex: user.handicapIndex,
    homeCourse: user.homeCourse,
    imageUrl: user.imageUrl,
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
    const { firstName, lastName, ghinNumber, handicapIndex, homeCourse } = body;

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
        ghinNumber: ghinNumber ?? null,
        handicapIndex: hi,
        homeCourse: homeCourse ?? null,
      },
      select: {
        firstName: true,
        lastName: true,
        ghinNumber: true,
        handicapIndex: true,
        homeCourse: true,
      },
    });

    return NextResponse.json({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
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
