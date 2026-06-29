import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/members - List all club members (requires sign in)
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      handicapIndex: true,
      homeCourse: true,
      imageUrl: true,
      scgaOfficial: true,
    },
  });

  const members = users.map((u) => ({
    id: u.id,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    fullName: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
    handicapIndex: u.handicapIndex,
    homeCourse: u.homeCourse ?? "",
    imageUrl: u.imageUrl,
    scgaOfficial: u.scgaOfficial ?? false,
  }));

  return NextResponse.json(members);
}
