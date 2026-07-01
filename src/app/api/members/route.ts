import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberSlug } from "@/lib/member-slug";

/**
 * GET /api/members - List all club members (requires sign in)
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [users, favorites] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
        handicapIndex: true,
        homeCourse: true,
        imageUrl: true,
        scgaOfficial: true,
      },
    }),
    prisma.memberFavorite.findMany({
      where: { userId },
      select: { favoriteId: true },
    }),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.favoriteId));

  const members = users.map((u) => ({
    id: u.id,
    slug: u.slug ?? memberSlug(u.firstName ?? "", u.lastName ?? ""),
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    fullName: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
    handicapIndex: u.handicapIndex,
    homeCourse: u.homeCourse ?? "",
    imageUrl: u.imageUrl,
    scgaOfficial: u.scgaOfficial ?? false,
    isFavorite: u.id !== userId && favoriteIds.has(u.id),
  }));

  return NextResponse.json(members);
}
