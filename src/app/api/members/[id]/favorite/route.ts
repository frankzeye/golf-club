import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findMemberByIdOrSlug } from "@/lib/member-resolve";

/**
 * POST /api/members/[id]/favorite - Toggle favorite status for a member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idOrSlug } = await params;
  const resolved = await findMemberByIdOrSlug(idOrSlug);
  if (!resolved) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (resolved.id === session.user.id) {
    return NextResponse.json({ error: "You cannot favorite yourself" }, { status: 400 });
  }

  try {
    const existing = await prisma.memberFavorite.findUnique({
      where: {
        userId_favoriteId: {
          userId: session.user.id,
          favoriteId: resolved.id,
        },
      },
    });

    if (existing) {
      await prisma.memberFavorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorite: false });
    }

    await prisma.memberFavorite.create({
      data: {
        userId: session.user.id,
        favoriteId: resolved.id,
      },
    });

    return NextResponse.json({ favorite: true });
  } catch (error) {
    console.error("POST /api/members/[id]/favorite failed:", error);
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
  }
}
