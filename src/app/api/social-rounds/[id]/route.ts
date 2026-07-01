import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberSlug } from "@/lib/member-slug";
import { findOutingByIdOrSlug } from "@/lib/outing-resolve";
import { outingSlug } from "@/lib/outing-slug";
import { countConfirmedParticipants } from "@/lib/outing-participants";

function formatOutingDetail(
  outing: NonNullable<Awaited<ReturnType<typeof findOutingByIdOrSlug>>> & {
    participants: Array<{
      userId: string;
      role: string;
      status: string;
      user: {
        id: string;
        slug: string | null;
        firstName: string;
        lastName: string;
        imageUrl: string | null;
        scgaOfficial: boolean;
      };
    }>;
    createdBy: {
      id: string;
      slug: string | null;
      firstName: string;
      lastName: string;
      imageUrl: string | null;
      scgaOfficial: boolean;
    };
  },
  userId?: string
) {
  const { participants, createdBy, ...rest } = outing;
  const slug = outing.slug ?? outingSlug(outing.course, outing.createdAt);
  return {
    ...rest,
    slug,
    participantCount: countConfirmedParticipants(participants),
    isParticipant: userId
      ? participants.some((p) => p.userId === userId && p.status === "confirmed")
      : false,
    isInvited: userId
      ? participants.some((p) => p.userId === userId && p.status === "invited")
      : false,
    isCreator: userId === outing.createdById,
    participants: participants.map((p) => ({
      id: p.user.id,
      slug: p.user.slug ?? memberSlug(p.user.firstName ?? "", p.user.lastName ?? ""),
      firstName: p.user.firstName ?? "",
      lastName: p.user.lastName ?? "",
      fullName: [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || "—",
      imageUrl: p.user.imageUrl,
      scgaOfficial: p.user.scgaOfficial ?? false,
      role: p.role,
      status: p.status,
    })),
    creator: {
      id: createdBy.id,
      slug: createdBy.slug ?? memberSlug(createdBy.firstName ?? "", createdBy.lastName ?? ""),
      firstName: createdBy.firstName ?? "",
      lastName: createdBy.lastName ?? "",
      fullName: [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") || "—",
      imageUrl: createdBy.imageUrl,
      scgaOfficial: createdBy.scgaOfficial ?? false,
    },
  };
}

/**
 * GET /api/social-rounds/[id] - Get a single outing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const outing = await findOutingByIdOrSlug(id);
    if (!outing) {
      return NextResponse.json({ error: "Outing not found" }, { status: 404 });
    }

    const full = await prisma.outing.findUnique({
      where: { id: outing.id },
      include: {
        participants: {
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
        },
        createdBy: {
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
    });

    if (!full) {
      return NextResponse.json({ error: "Outing not found" }, { status: 404 });
    }

    return NextResponse.json(formatOutingDetail(full, session.user.id));
  } catch (error) {
    console.error("GET /api/social-rounds/[id] failed:", error);
    return NextResponse.json({ error: "Failed to load outing" }, { status: 500 });
  }
}

/**
 * POST /api/social-rounds/[id] - Join an outing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const outing = await findOutingByIdOrSlug(id);
    if (!outing) {
      return NextResponse.json({ error: "Outing not found" }, { status: 404 });
    }

    if (outing.status === "cancelled") {
      return NextResponse.json({ error: "This outing has been cancelled" }, { status: 400 });
    }

    const existing = await prisma.outingParticipant.findUnique({
      where: {
        outingId_userId: { outingId: outing.id, userId: session.user.id },
      },
    });

    if (existing) {
      if (existing.status === "invited" || existing.status === "declined") {
        const confirmedCount = await prisma.outingParticipant.count({
          where: { outingId: outing.id, status: "confirmed" },
        });
        if (confirmedCount >= outing.playerCount) {
          return NextResponse.json({ error: "This outing is full" }, { status: 400 });
        }
        await prisma.outingParticipant.update({
          where: { id: existing.id },
          data: { status: "confirmed" },
        });
        const updatedCount = confirmedCount + 1;
        if (updatedCount >= outing.playerCount) {
          await prisma.outing.update({
            where: { id: outing.id },
            data: { status: "full" },
          });
        }
        return NextResponse.json({ message: "Joined outing" });
      }
      return NextResponse.json({ message: "Already joined" });
    }

    const count = await prisma.outingParticipant.count({
      where: { outingId: outing.id, status: "confirmed" },
    });

    if (count >= outing.playerCount) {
      return NextResponse.json({ error: "This outing is full" }, { status: 400 });
    }

    await prisma.outingParticipant.create({
      data: {
        outingId: outing.id,
        userId: session.user.id,
        role: "player",
        status: "confirmed",
      },
    });

    const updatedCount = count + 1;
    if (updatedCount >= outing.playerCount) {
      await prisma.outing.update({
        where: { id: outing.id },
        data: { status: "full" },
      });
    }

    return NextResponse.json({ message: "Joined outing" });
  } catch (error) {
    console.error("POST /api/social-rounds/[id] failed:", error);
    return NextResponse.json({ error: "Failed to join outing" }, { status: 500 });
  }
}

/**
 * DELETE /api/social-rounds/[id] - Leave an outing or decline an invite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const outing = await findOutingByIdOrSlug(id);
    if (!outing) {
      return NextResponse.json({ error: "Outing not found" }, { status: 404 });
    }

    const participant = await prisma.outingParticipant.findUnique({
      where: {
        outingId_userId: { outingId: outing.id, userId: session.user.id },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "You are not on this outing" }, { status: 404 });
    }

    const wasConfirmed = participant.status === "confirmed";

    await prisma.outingParticipant.delete({
      where: { id: participant.id },
    });

    if (wasConfirmed && outing.status === "full") {
      await prisma.outing.update({
        where: { id: outing.id },
        data: { status: "open" },
      });
    }

    return NextResponse.json({ message: "Left outing" });
  } catch (error) {
    console.error("DELETE /api/social-rounds/[id] failed:", error);
    return NextResponse.json({ error: "Failed to leave outing" }, { status: 500 });
  }
}
