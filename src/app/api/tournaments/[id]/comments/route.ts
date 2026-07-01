import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTournamentByIdOrSlug } from "@/lib/tournament-resolve";
import { memberSlug } from "@/lib/member-slug";

/**
 * GET /api/tournaments/[id]/comments - List comments for a tournament (threaded)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idOrSlug } = await params;

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { tournamentId: tournament.id },
    include: {
      user: {
        select: {
          id: true,
          slug: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          scgaOfficial: true,
        },
      },
      replies: {
        include: {
          user: {
            select: {
              id: true,
              slug: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
              scgaOfficial: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const topLevel = comments.filter((c) => !c.parentId);
  const withReplies = topLevel.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    user: {
      id: c.user.id,
      slug: c.user.slug ?? memberSlug(c.user.firstName ?? "", c.user.lastName ?? ""),
      firstName: c.user.firstName ?? "",
      lastName: c.user.lastName ?? "",
      fullName: [c.user.firstName, c.user.lastName].filter(Boolean).join(" ") || "—",
      imageUrl: c.user.imageUrl,
      scgaOfficial: c.user.scgaOfficial ?? false,
    },
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        slug: r.user.slug ?? memberSlug(r.user.firstName ?? "", r.user.lastName ?? ""),
        firstName: r.user.firstName ?? "",
        lastName: r.user.lastName ?? "",
        fullName: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || "—",
        imageUrl: r.user.imageUrl,
        scgaOfficial: r.user.scgaOfficial ?? false,
      },
    })),
  }));

  return NextResponse.json(withReplies);
}

/**
 * POST /api/tournaments/[id]/comments - Create a comment (top-level or reply)
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

  const tournament = await findTournamentByIdOrSlug(idOrSlug);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  const tournamentId = tournament.id;

  try {
    const body = await request.json();
    const { content, parentId } = body;

    const contentStr = typeof content === "string" ? content.trim() : "";
    if (!contentStr || contentStr.length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (contentStr.length > 2000) {
      return NextResponse.json(
        { error: "Comment must be 2000 characters or less" },
        { status: 400 }
      );
    }

    let parentIdVal: string | null = null;
    if (parentId != null && typeof parentId === "string" && parentId.trim()) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, tournamentId },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 400 }
        );
      }
      parentIdVal = parent.id;
    }

    const comment = await prisma.comment.create({
      data: {
        tournamentId,
        userId: session.user.id,
        parentId: parentIdVal,
        content: contentStr,
      },
      include: {
        user: {
          select: {
            id: true,
            slug: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        slug: comment.user.slug ?? memberSlug(comment.user.firstName ?? "", comment.user.lastName ?? ""),
        firstName: comment.user.firstName ?? "",
        lastName: comment.user.lastName ?? "",
        fullName: [comment.user.firstName, comment.user.lastName].filter(Boolean).join(" ") || "—",
        imageUrl: comment.user.imageUrl,
      },
    });
  } catch (err) {
    console.error("Comment create failed:", err);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
