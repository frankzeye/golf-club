import { memberSlug } from "@/lib/member-slug";
import {
  holesPlayed,
  parsePlayerScores,
  totalStrokes,
} from "@/lib/course-scorecard";
import { prisma } from "@/lib/db";
import { loadPlayRoundScorecard } from "@/lib/load-play-round-scorecard";
import { getPlayRoundAccess, getFoursomeMemberUserIds } from "@/lib/play-round-access";
import {
  buildFlightLeaderboards,
  flightInclude,
  FLIGHTS_SCORING_FORMAT,
  formatTournamentFlights,
} from "@/lib/tournament-flights";

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
  tournament: {
    select: {
      id: true,
      slug: true,
      name: true,
      scoringFormat: true,
      flights: {
        include: flightInclude,
      },
    },
  },
} as const;

type PlayRoundWithRelations = Awaited<
  ReturnType<typeof prisma.playRound.findMany>
>[0] & {
  tournamentId?: string | null;
  players: Array<{
    id: string;
    userId: string;
    scores: unknown;
    handicapIndex: number | null;
    scoringSubmittedAt: Date | null;
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
  tournament?: {
    id: string;
    slug: string | null;
    name: string;
    scoringFormat: string;
    flights: Array<{
      id: string;
      name: string;
      sortOrder: number;
      minHandicap: number | null;
      maxHandicap: number | null;
      members: Array<{
        user: {
          id: string;
          slug: string | null;
          firstName: string;
          lastName: string;
          imageUrl: string | null;
          handicapIndex: number | null;
          scgaOfficial: boolean;
        };
      }>;
    }>;
  } | null;
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

export { loadPlayRoundScorecard } from "@/lib/load-play-round-scorecard";

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

  const viewerPlayer = viewerId
    ? round.players.find((p) => p.userId === viewerId)
    : undefined;

  let flightLeaderboards: Awaited<ReturnType<typeof buildFlightLeaderboards>> = [];
  if (
    round.tournament?.scoringFormat === FLIGHTS_SCORING_FORMAT &&
    round.tournament.flights.length > 0
  ) {
    flightLeaderboards = await buildFlightLeaderboards(
      formatTournamentFlights(round.tournament.flights),
      {
        courseId: round.courseId,
        holeCount: round.holeCount,
        players: round.players,
      }
    );
  }

  return {
    id: round.id,
    slug: round.slug,
    course: round.course,
    courseId: round.courseId,
    tournamentId: round.tournamentId ?? null,
    tournamentName: round.tournament?.name ?? null,
    tournamentScoringFormat: round.tournament?.scoringFormat ?? null,
    holeCount: round.holeCount,
    status: round.status,
    createdAt: round.createdAt.toISOString(),
    updatedAt: round.updatedAt.toISOString(),
    isCreator: viewerId === round.createdById,
    isTournamentRound: round.tournamentId != null,
    viewerPlayerId: viewerPlayer?.id ?? null,
    creator: formatUser(round.createdBy),
    players,
    scorecard,
    flightLeaderboards,
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

export async function formatPlayRoundResponse(
  round: PlayRoundWithRelations,
  viewerId: string,
  userRole: string
) {
  const access = await getPlayRoundAccess(round.id, viewerId, userRole);
  const detail = await formatPlayRoundDetail(round, viewerId);

  let foursomeMemberUserIds: string[] | null = null;
  if (round.tournamentId) {
    foursomeMemberUserIds = await getFoursomeMemberUserIds(round.tournamentId, viewerId);
    if (!foursomeMemberUserIds) {
      foursomeMemberUserIds = [viewerId];
    }
  }

  const viewerPlayer = round.players.find((player) => player.userId === viewerId);

  return {
    ...detail,
    scorablePlayerIds: access.scorablePlayerIds,
    foursomeMemberUserIds,
    viewerScoringSubmitted: viewerPlayer?.scoringSubmittedAt != null,
  };
}
