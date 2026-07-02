import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findOutingByIdOrSlug } from "@/lib/outing-resolve";
import { notifyOutingInvites } from "@/lib/outing-invite-notify";

/**
 * POST /api/social-rounds/[id]/invites - Send invites to more members (organizer only)
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
      return NextResponse.json({ error: "Only the organizer can send invites" }, { status: 403 });
    }

    if (outing.status === "cancelled") {
      return NextResponse.json({ error: "This outing has been cancelled" }, { status: 400 });
    }

    const body = await request.json();
    const inviteIds: string[] = Array.isArray(body.inviteUserIds)
      ? body.inviteUserIds.filter((userId: unknown): userId is string => typeof userId === "string")
      : [];

    const uniqueInviteIds = [...new Set(inviteIds)].filter((userId) => userId !== session.user.id);
    if (uniqueInviteIds.length === 0) {
      return NextResponse.json({ error: "Select at least one member to invite" }, { status: 400 });
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { in: uniqueInviteIds } },
      select: { id: true },
    });
    if (existingUsers.length !== uniqueInviteIds.length) {
      return NextResponse.json({ error: "One or more invited members not found" }, { status: 400 });
    }

    const existingParticipants = await prisma.outingParticipant.findMany({
      where: { outingId: outing.id },
      select: { userId: true, status: true },
    });
    const participantByUserId = new Map(
      existingParticipants.map((p) => [p.userId, p.status])
    );

    let invited = 0;
    let skipped = 0;
    const invitedUserIds: string[] = [];

    for (const userId of uniqueInviteIds) {
      const status = participantByUserId.get(userId);
      if (status === "confirmed" || status === "invited") {
        skipped++;
        continue;
      }

      if (status === "declined") {
        await prisma.outingParticipant.update({
          where: {
            outingId_userId: { outingId: outing.id, userId },
          },
          data: { status: "invited" },
        });
        invited++;
        invitedUserIds.push(userId);
        continue;
      }

      await prisma.outingParticipant.create({
        data: {
          outingId: outing.id,
          userId,
          role: "player",
          status: "invited",
        },
      });
      invited++;
      invitedUserIds.push(userId);
    }

    if (invited === 0) {
      return NextResponse.json(
        { error: "Everyone selected is already on this outing" },
        { status: 400 }
      );
    }

    void notifyOutingInvites(
      invitedUserIds,
      {
        id: outing.id,
        slug: outing.slug,
        course: outing.course,
        date: outing.date,
        createdAt: outing.createdAt,
      },
      session.user.name ?? ""
    ).catch((err) => console.error("Outing invite push failed:", err));

    return NextResponse.json({
      invited,
      skipped,
      message:
        skipped > 0
          ? `Sent ${invited} invite${invited === 1 ? "" : "s"} (${skipped} already on the outing)`
          : `Sent ${invited} invite${invited === 1 ? "" : "s"}`,
    });
  } catch (error) {
    console.error("POST /api/social-rounds/[id]/invites failed:", error);
    return NextResponse.json({ error: "Failed to send invites" }, { status: 500 });
  }
}
