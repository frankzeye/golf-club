import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { memberSlug } from "@/lib/member-slug";
import { outingSlug, findUniqueOutingSlug } from "@/lib/outing-slug";
import { parseStartTime } from "@/lib/tournament-time";
import { countConfirmedParticipants } from "@/lib/outing-participants";
import { resolveCourseSelection } from "@/lib/golf-course";
import { notifyOutingInvites } from "@/lib/outing-invite-notify";

const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 99;
const VALID_TIME_OF_DAY = ["morning", "midday", "afternoon"] as const;

function formatOuting(
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

/**
 * GET /api/social-rounds - List all outings
 */
export async function GET(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const outings = await prisma.outing.findMany({
      where: { kind: "social", status: { not: "cancelled" } },
      orderBy: [{ date: "asc" }, { createdAt: "desc" }],
      include: outingInclude,
    });

    const userId = session.user.id;
    const formatted = outings.map((o) => formatOuting(o, userId));

    const open = formatted.filter((o) => o.participantCount < o.playerCount);
    const full = formatted.filter((o) => o.participantCount >= o.playerCount);

    return NextResponse.json({ open, full, all: formatted });
  } catch (error) {
    console.error("GET /api/social-rounds failed:", error);
    return NextResponse.json({ error: "Failed to load outings" }, { status: 500 });
  }
}

/**
 * POST /api/social-rounds - Create a new outing
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      playerCount,
      course,
      courseId,
      hasBookedTime,
      date,
      startTime,
      timeOfDay,
      hasWager,
      wagerDetails,
      inviteUserIds,
    } = body;

    const count = Number(playerCount);
    if (!Number.isInteger(count) || count < MIN_PLAYER_COUNT || count > MAX_PLAYER_COUNT) {
      return NextResponse.json(
        { error: `Player count must be between ${MIN_PLAYER_COUNT} and ${MAX_PLAYER_COUNT}` },
        { status: 400 }
      );
    }

    if (!course || typeof course !== "string" || course.trim().length === 0) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    const courseSelection = await resolveCourseSelection(courseId, course);
    if (!courseSelection) {
      return NextResponse.json({ error: "Course is required" }, { status: 400 });
    }

    const booked = hasBookedTime === true;
    let dateObj: Date | null = null;
    let startTimeVal: string | null = null;
    let timeOfDayVal: string | null = null;

    if (booked) {
      if (!date) {
        return NextResponse.json({ error: "Date is required when tee time is booked" }, { status: 400 });
      }
      startTimeVal = parseStartTime(startTime);
      if (!startTimeVal) {
        return NextResponse.json({ error: "Start time must be in HH:mm format" }, { status: 400 });
      }
      dateObj = new Date(date);
    } else {
      if (!date) {
        return NextResponse.json({ error: "Date is required" }, { status: 400 });
      }
      if (!timeOfDay || !VALID_TIME_OF_DAY.includes(timeOfDay)) {
        return NextResponse.json(
          { error: "Time of day must be morning, midday, or afternoon" },
          { status: 400 }
        );
      }
      timeOfDayVal = timeOfDay;
      dateObj = new Date(date);
    }

    const wager = hasWager === true;
    const wagerText =
      wager && typeof wagerDetails === "string" && wagerDetails.trim()
        ? wagerDetails.trim()
        : null;

    const inviteIds: string[] = Array.isArray(inviteUserIds)
      ? inviteUserIds.filter((id): id is string => typeof id === "string")
      : [];

    const uniqueInviteIds = [...new Set(inviteIds)].filter((id) => id !== session.user!.id);
    if (uniqueInviteIds.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: uniqueInviteIds } },
        select: { id: true },
      });
      if (existingUsers.length !== uniqueInviteIds.length) {
        return NextResponse.json({ error: "One or more invited members not found" }, { status: 400 });
      }
    }

    const now = new Date();
    const baseSlug = outingSlug(courseSelection.course, now);
    const slug = await findUniqueOutingSlug(baseSlug);

    const outing = await prisma.outing.create({
      data: {
        slug,
        playerCount: count,
        course: courseSelection.course,
        courseId: courseSelection.courseId,
        hasBookedTime: booked,
        date: dateObj,
        startTime: startTimeVal,
        timeOfDay: timeOfDayVal,
        hasWager: wager,
        wagerDetails: wagerText,
        createdById: session.user.id,
        participants: {
          create: [
            {
              userId: session.user.id,
              role: "organizer",
              status: "confirmed",
            },
            ...uniqueInviteIds.map((userId) => ({
              userId,
              role: "player" as const,
              status: "invited" as const,
            })),
          ],
        },
      },
      include: outingInclude,
    });

    if (uniqueInviteIds.length > 0) {
      await notifyOutingInvites(
        uniqueInviteIds,
        {
          id: outing.id,
          slug: outing.slug,
          course: outing.course,
          date: outing.date,
          createdAt: outing.createdAt,
        },
        session.user.name ?? ""
      ).catch((err) => console.error("Outing invite notifications failed:", err));
    }

    return NextResponse.json(formatOuting(outing, session.user.id));
  } catch (error) {
    console.error("POST /api/social-rounds failed:", error);
    return NextResponse.json({ error: "Failed to create outing" }, { status: 500 });
  }
}
