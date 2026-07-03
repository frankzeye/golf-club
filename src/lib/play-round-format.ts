import { memberSlug } from "@/lib/member-slug";
import {
  holesPlayed,
  parseCourseScorecard,
  parsePlayerScores,
  totalStrokes,
  type ScorecardHole,
} from "@/lib/course-scorecard";
import { fetchAndCacheCourseDetails } from "@/lib/golf-course";
import { prisma } from "@/lib/db";

const playerUserSelect = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
  scgaOfficial: true,
} as const;

export const playRoundInclude = {
  players: {
    include: {
      user: { select: playerUserSelect },
    },
    orderBy: { id: "asc" as const },
  },
  createdBy: { select: playerUserSelect },
} as const;

type PlayRoundWithRelations = Awaited<
  ReturnType<typeof prisma.playRound.findMany>
>[0] & {
  players: Array<{
    id: string;
    userId: string;
    scores: unknown;
    handicapIndex: number | null;
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
};

function formatUser(user: PlayRoundWithRelations["createdBy"]) {
  return {
    id: user.id,
    slug: user.slug ?? memberSlug(user.firstName ?? "", user.lastName ?? ""),
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: user.imageUrl,
    scgaOfficial: user.scgaOfficial ?? false,
  };
}

/** Parse handicap for play round setup; undefined = omit from map (use profile). */
export function parsePlayRoundHandicapIndex(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 54) return undefined;
  return n;
}

export async function loadPlayRoundScorecard(
  courseId: string | null,
  holeCount: number,
  coursePar?: number | null
): Promise<ScorecardHole[]> {
  if (!courseId) {
    return parseCourseScorecard(null, { holeCount, totalPar: coursePar });
  }

  try {
    const details = await fetchAndCacheCourseDetails(courseId);
    return parseCourseScorecard(details, { holeCount, totalPar: coursePar });
  } catch {
    const course = await prisma.golfCourse.findUnique({
      where: { id: courseId },
      select: { par: true, detailsJson: true },
    });
    return parseCourseScorecard(course?.detailsJson ?? null, {
      holeCount,
      totalPar: course?.par ?? coursePar,
    });
  }
}

export async function formatPlayRoundDetail(
  round: PlayRoundWithRelations,
  viewerId?: string
) {
  const scorecard = await loadPlayRoundScorecard(
    round.courseId,
    round.holeCount,
    null
  );

  const players = round.players.map((player) => {
    const scores = parsePlayerScores(player.scores);
    const user = formatUser(player.user);
    return {
      id: player.id,
      userId: player.userId,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      scgaOfficial: user.scgaOfficial,
      handicapIndex: player.handicapIndex,
      scores,
      total: totalStrokes(scores),
      holesPlayed: holesPlayed(scores),
    };
  });

  return {
    id: round.id,
    slug: round.slug,
    course: round.course,
    courseId: round.courseId,
    holeCount: round.holeCount,
    status: round.status,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
    isCreator: viewerId === round.createdById,
    creator: formatUser(round.createdBy),
    players,
    scorecard,
  };
}

export function formatPlayRoundSummary(round: PlayRoundWithRelations) {
  const players = round.players.map((player) => {
    const scores = parsePlayerScores(player.scores);
    const user = formatUser(player.user);
    return {
      id: player.id,
      userId: player.userId,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
      scgaOfficial: user.scgaOfficial,
      handicapIndex: player.handicapIndex,
      total: totalStrokes(scores),
      holesPlayed: holesPlayed(scores),
    };
  });

  return {
    id: round.id,
    slug: round.slug,
    course: round.course,
    courseId: round.courseId,
    holeCount: round.holeCount,
    status: round.status,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
    players,
  };
}
