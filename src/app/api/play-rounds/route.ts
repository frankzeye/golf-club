import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberSlug } from "@/lib/member-slug";
import { outingSlug, findUniqueOutingSlug } from "@/lib/outing-slug";
import { countConfirmedParticipants } from "@/lib/outing-participants";
import { syncOutingCapacityStatus } from "@/lib/outing-participant-manage";
import { resolveCourseSelection } from "@/lib/golf-course";

const MAX_PLAY_PARTNERS = 3;

const outingInclude = {
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
} as const;

function formatPlayRound(
  outing: Awaited<ReturnType<typeof prisma.outing.findMany>>[0] & {
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
  const participantUsers = participants.map((p) => ({
    id: p.user.id,
    slug: p.user.slug ?? memberSlug(p.user.firstName ?? "", p.user.lastName ?? ""),
    firstName: p.user.firstName ?? "",
    lastName: p.user.lastName ?? "",
    fullName: [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: p.user.imageUrl,
    scgaOfficial: p.user.scgaOfficial ?? false,
    role: p.role,
    status: p.status,
  }));
  const creator = {
    id: createdBy.id,
    slug: createdBy.slug ?? memberSlug(createdBy.firstName ?? "", createdBy.lastName ?? ""),
    firstName: createdBy.firstName ?? "",
    lastName: createdBy.lastName ?? "",
    fullName: [createdBy.firstName, createdBy.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: createdBy.imageUrl,
    scgaOfficial: createdBy.scgaOfficial ?? false,
  };

  return {
    ...rest,
    slug,
    participantCount: countConfirmedParticipants(participants),
    isParticipant: userId
      ? participants.some((p) => p.userId === userId && p.status === "confirmed")
      : false,
    isCreator: userId === outing.createdById,
    participants: participantUsers,
    creator,
  };
}

/**
 * GET /api/play-rounds — List play rounds (admin only).
 */
export async function GET(request: NextRequest) {
  const { error, session } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const outings = await prisma.outing.findMany({
      where: { kind: "play", status: { not: "cancelled" } },
      orderBy: [{ createdAt: "desc" }],
      include: outingInclude,
    });

    const formatted = outings.map((o) => formatPlayRound(o, session!.user!.id));
    return NextResponse.json(formatted);
  } catch (err) {
    console.error("GET /api/play-rounds failed:", err);
    return NextResponse.json({ error: "Failed to load play rounds" }, { status: 500 });
  }
}

/**
 * POST /api/play-rounds — Create a play round (admin only).
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const body = await request.json();
    const { course, courseId, partnerUserIds } = body;

    if (!course || typeof course !== "string" || course.trim().length === 0) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    const courseSelection = await resolveCourseSelection(courseId, course);
    if (!courseSelection) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    const partnerIds: string[] = Array.isArray(partnerUserIds)
      ? partnerUserIds.filter((id): id is string => typeof id === "string")
      : [];
    const uniquePartnerIds = [...new Set(partnerIds)].filter((id) => id !== session!.user!.id);

    if (uniquePartnerIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one member to play with" },
        { status: 400 }
      );
    }

    if (uniquePartnerIds.length > MAX_PLAY_PARTNERS) {
      return NextResponse.json(
        { error: `You can add up to ${MAX_PLAY_PARTNERS} playing partners` },
        { status: 400 }
      );
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { in: uniquePartnerIds } },
      select: { id: true },
    });
    if (existingUsers.length !== uniquePartnerIds.length) {
      return NextResponse.json({ error: "One or more members not found" }, { status: 400 });
    }

    const playerCount = 1 + uniquePartnerIds.length;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const baseSlug = outingSlug(courseSelection.course, now);
    const slug = await findUniqueOutingSlug(baseSlug);

    const outing = await prisma.outing.create({
      data: {
        slug,
        kind: "play",
        playerCount,
        course: courseSelection.course,
        courseId: courseSelection.courseId,
        hasBookedTime: false,
        date: today,
        startTime: null,
        timeOfDay: null,
        hasWager: false,
        wagerDetails: null,
        createdById: session!.user!.id,
        participants: {
          create: [
            {
              userId: session!.user!.id,
              role: "organizer",
              status: "confirmed",
            },
            ...uniquePartnerIds.map((userId) => ({
              userId,
              role: "player" as const,
              status: "confirmed" as const,
            })),
          ],
        },
      },
      include: outingInclude,
    });

    await syncOutingCapacityStatus(outing.id, playerCount);

    return NextResponse.json(formatPlayRound(outing, session!.user!.id));
  } catch (err) {
    console.error("POST /api/play-rounds failed:", err);
    return NextResponse.json({ error: "Failed to create play round" }, { status: 500 });
  }
}
