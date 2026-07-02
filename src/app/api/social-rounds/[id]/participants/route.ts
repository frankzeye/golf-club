import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findOutingByIdOrSlug } from "@/lib/outing-resolve";
import {
  countConfirmedOutingParticipants,
  syncOutingCapacityStatus,
} from "@/lib/outing-participant-manage";

/**
 * POST /api/social-rounds/[id]/participants — Add members as confirmed (organizer only).
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

    if (outing.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Only the organizer can add confirmed players" },
        { status: 403 }
      );
    }

    if (outing.status === "cancelled") {
      return NextResponse.json({ error: "This outing has been cancelled" }, { status: 400 });
    }

    const body = await request.json();
    const userIds: string[] = Array.isArray(body.userIds)
      ? body.userIds.filter((userId: unknown): userId is string => typeof userId === "string")
      : [];

    const uniqueUserIds = [...new Set(userIds)].filter((userId) => userId !== session.user.id);
    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ error: "Select at least one member to add" }, { status: 400 });
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true },
    });
    if (existingUsers.length !== uniqueUserIds.length) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 400 });
    }

    const existingParticipants = await prisma.outingParticipant.findMany({
      where: { outingId: outing.id },
      select: { userId: true, status: true },
    });
    const participantByUserId = new Map(
      existingParticipants.map((p) => [p.userId, p.status])
    );

    const toConfirm = uniqueUserIds.filter(
      (userId) => participantByUserId.get(userId) !== "confirmed"
    );

    if (toConfirm.length === 0) {
      return NextResponse.json(
        { error: "Everyone selected is already confirmed on this outing" },
        { status: 400 }
      );
    }

    const confirmedCount = await countConfirmedOutingParticipants(outing.id);
    const slotsLeft = outing.playerCount - confirmedCount;
    if (toConfirm.length > slotsLeft) {
      return NextResponse.json(
        {
          error:
            slotsLeft <= 0
              ? "This outing is full"
              : `Only ${slotsLeft} spot${slotsLeft === 1 ? "" : "s"} left`,
        },
        { status: 400 }
      );
    }

    let added = 0;
    let skipped = 0;

    for (const userId of uniqueUserIds) {
      const status = participantByUserId.get(userId);
      if (status === "confirmed") {
        skipped++;
        continue;
      }

      if (status === "invited" || status === "declined") {
        await prisma.outingParticipant.update({
          where: {
            outingId_userId: { outingId: outing.id, userId },
          },
          data: { status: "confirmed" },
        });
        added++;
        continue;
      }

      await prisma.outingParticipant.create({
        data: {
          outingId: outing.id,
          userId,
          role: "player",
          status: "confirmed",
        },
      });
      added++;
    }

    await syncOutingCapacityStatus(outing.id, outing.playerCount);

    return NextResponse.json({
      added,
      skipped,
      message:
        skipped > 0
          ? `Added ${added} confirmed player${added === 1 ? "" : "s"} (${skipped} already confirmed)`
          : `Added ${added} confirmed player${added === 1 ? "" : "s"}`,
    });
  } catch (error) {
    console.error("POST /api/social-rounds/[id]/participants failed:", error);
    return NextResponse.json({ error: "Failed to add players" }, { status: 500 });
  }
}

/**
 * DELETE /api/social-rounds/[id]/participants — Remove a confirmed player (organizer only).
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

    if (outing.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Only the organizer can remove players" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId) {
      return NextResponse.json({ error: "Member id required" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself as the organizer" },
        { status: 400 }
      );
    }

    const participant = await prisma.outingParticipant.findUnique({
      where: {
        outingId_userId: { outingId: outing.id, userId },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Player is not on this outing" }, { status: 404 });
    }

    if (participant.role === "organizer") {
      return NextResponse.json({ error: "Cannot remove the organizer" }, { status: 400 });
    }

    const wasConfirmed = participant.status === "confirmed";

    await prisma.outingParticipant.delete({
      where: { id: participant.id },
    });

    if (wasConfirmed) {
      await syncOutingCapacityStatus(outing.id, outing.playerCount);
    }

    return NextResponse.json({
      message: participant.status === "invited" ? "Invite cancelled" : "Player removed",
    });
  } catch (error) {
    console.error("DELETE /api/social-rounds/[id]/participants failed:", error);
    return NextResponse.json({ error: "Failed to remove player" }, { status: 500 });
  }
}
