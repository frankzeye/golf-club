import { memberSlug } from "@/lib/member-slug";
import {
  buildLeaderboard,
  parsePlayerScores,
  type ScorecardHole,
} from "@/lib/course-scorecard";
import { loadPlayRoundScorecard } from "@/lib/play-round-format";

export const FLIGHTS_SCORING_FORMAT = "Flights";

export interface FlightMemberInput {
  userId: string;
  handicapIndex: number | null;
}

export interface FlightDraft {
  id?: string;
  name: string;
  sortOrder: number;
  minHandicap: number | null;
  maxHandicap: number | null;
  userIds: string[];
}

export interface AutoAssignFlight {
  name: string;
  sortOrder: number;
  minHandicap: number | null;
  maxHandicap: number | null;
  userIds: string[];
}

export function autoAssignFlightsByHandicap(
  members: FlightMemberInput[],
  flightCount: number
): AutoAssignFlight[] {
  const count = Math.max(1, Math.min(flightCount, members.length || 1));
  const sorted = [...members].sort((a, b) => {
    if (a.handicapIndex == null && b.handicapIndex == null) return 0;
    if (a.handicapIndex == null) return 1;
    if (b.handicapIndex == null) return -1;
    return a.handicapIndex - b.handicapIndex;
  });

  const flights: AutoAssignFlight[] = Array.from({ length: count }, (_, i) => ({
    name: count === 1 ? "Flight 1" : `Flight ${i + 1}`,
    sortOrder: i,
    minHandicap: null,
    maxHandicap: null,
    userIds: [],
  }));

  const chunkSize = Math.ceil(sorted.length / count);
  sorted.forEach((member, index) => {
    const flightIndex = Math.min(Math.floor(index / chunkSize), count - 1);
    flights[flightIndex].userIds.push(member.userId);
  });

  for (const flight of flights) {
    const handicaps = flight.userIds
      .map((userId) => members.find((m) => m.userId === userId)?.handicapIndex)
      .filter((h): h is number => h != null);
    if (handicaps.length > 0) {
      flight.minHandicap = Math.min(...handicaps);
      flight.maxHandicap = Math.max(...handicaps);
    }
  }

  return flights;
}

export function validateFlightDrafts(
  drafts: FlightDraft[],
  registeredUserIds: Set<string>
): string | null {
  const seen = new Set<string>();
  for (const flight of drafts) {
    if (!flight.name.trim()) return "Each flight needs a name.";
    for (const userId of flight.userIds) {
      if (!registeredUserIds.has(userId)) {
        return "Flights can only include registered tournament players.";
      }
      if (seen.has(userId)) {
        return "Each player can only be assigned to one flight.";
      }
      seen.add(userId);
    }
  }
  return null;
}

const flightInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          slug: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          handicapIndex: true,
          scgaOfficial: true,
        },
      },
    },
    orderBy: { id: "asc" as const },
  },
} as const;

export { flightInclude };

export function formatFlightMember(user: {
  id: string;
  slug: string | null;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
  scgaOfficial: boolean;
}) {
  return {
    id: user.id,
    slug: user.slug ?? memberSlug(user.firstName ?? "", user.lastName ?? ""),
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: user.imageUrl,
    handicapIndex: user.handicapIndex,
    scgaOfficial: user.scgaOfficial ?? false,
  };
}

export function formatTournamentFlights(
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
  }>
) {
  return flights
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((flight) => ({
      id: flight.id,
      name: flight.name,
      sortOrder: flight.sortOrder,
      minHandicap: flight.minHandicap,
      maxHandicap: flight.maxHandicap,
      memberUserIds: flight.members.map((m) => m.user.id),
      members: flight.members.map((m) => formatFlightMember(m.user)),
    }));
}

type PlayRoundPlayerForLeaderboard = {
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
};

export async function buildFlightLeaderboards(
  flights: ReturnType<typeof formatTournamentFlights>,
  playRound: {
    courseId: string | null;
    holeCount: number;
    players: PlayRoundPlayerForLeaderboard[];
  }
) {
  const scorecard = await loadPlayRoundScorecard(
    playRound.courseId,
    playRound.holeCount,
    null
  );

  const playerByUserId = new Map(
    playRound.players.map((player) => {
      const scores = parsePlayerScores(player.scores);
      const user = formatFlightMember({
        ...player.user,
        handicapIndex: player.handicapIndex,
      });
      return [
        player.userId,
        {
          id: player.id,
          userId: player.userId,
          slug: user.slug,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
          handicapIndex: player.handicapIndex,
          scgaOfficial: user.scgaOfficial,
          scores,
          total: Object.values(scores).reduce((sum, n) => sum + n, 0),
          holesPlayed: Object.keys(scores).length,
        },
      ];
    })
  );

  return flights.map((flight) => {
    const players = flight.memberUserIds
      .map((userId) => playerByUserId.get(userId))
      .filter((p): p is NonNullable<typeof p> => p != null);

    const rows = buildLeaderboard(players, scorecard as ScorecardHole[]);
    const leader = rows.find((row) => row.rank === 1 && row.toPar != null);

    return {
      flightId: flight.id,
      flightName: flight.name,
      minHandicap: flight.minHandicap,
      maxHandicap: flight.maxHandicap,
      leader: leader
        ? {
            userId: leader.player.userId,
            fullName: leader.player.fullName,
            toPar: leader.toPar,
            total: leader.total,
          }
        : null,
      rows: rows.map((row) => ({
        rank: row.rank,
        userId: row.player.userId,
        fullName: row.player.fullName,
        imageUrl: row.player.imageUrl,
        handicapIndex: row.player.handicapIndex,
        total: row.total,
        holesPlayed: row.holesPlayed,
        toPar: row.toPar,
      })),
    };
  });
}
