import {
  playerCumulativeToPar,
  type ScorecardHole,
} from "@/lib/course-scorecard";
import { loadPlayRoundScorecard } from "@/lib/load-play-round-scorecard";
import { formatTournamentTeams } from "@/lib/tournament-teams";
import {
  mapPlayRoundPlayersForLeaderboard,
  type PlayRoundPlayerForLeaderboard,
} from "@/lib/tournament-flights";

function playerStablefordPoints(
  scores: Record<string, number>,
  scorecard: ScorecardHole[]
): number {
  let points = 0;
  for (const hole of scorecard) {
    const strokes = scores[String(hole.hole)];
    if (strokes != null) {
      points += Math.max(0, 2 + hole.par - strokes);
    }
  }
  return points;
}

export type TournamentTeamLeaderboardRow = {
  rank: number;
  teamId: string;
  teamName: string;
  memberNames: string;
  memberCount: number;
  total: number;
  holesPlayed: number;
  toPar: number | null;
  isStableford: boolean;
};

function assignTeamRanks<
  T extends { total: number; holesPlayed: number; toPar: number | null; isStableford: boolean },
>(sorted: T[]): Array<T & { rank: number }> {
  return sorted.map((row, index) => {
    let rank = index + 1;
    if (index > 0) {
      const prev = sorted[index - 1];
      const tied = row.isStableford
        ? prev.total === row.total && prev.holesPlayed === row.holesPlayed
        : prev.toPar === row.toPar &&
          prev.total === row.total &&
          prev.holesPlayed === row.holesPlayed;
      if (tied) {
        let r = index;
        while (r > 0) {
          const p = sorted[r - 1];
          const pTied = row.isStableford
            ? p.total === row.total && p.holesPlayed === row.holesPlayed
            : p.toPar === row.toPar &&
              p.total === row.total &&
              p.holesPlayed === row.holesPlayed;
          if (pTied) r--;
          else break;
        }
        rank = r + 1;
      }
    }
    return { ...row, rank };
  });
}

export async function buildOverallTeamLeaderboard(
  teams: ReturnType<typeof formatTournamentTeams>,
  playRound: {
    courseId: string | null;
    holeCount: number;
    players: PlayRoundPlayerForLeaderboard[];
  },
  scoringFormat: string
): Promise<TournamentTeamLeaderboardRow[]> {
  if (teams.length === 0) return [];

  const scorecard = await loadPlayRoundScorecard(
    playRound.courseId,
    playRound.holeCount,
    null
  );

  const isStableford = scoringFormat === "Stableford";
  const playerByUserId = new Map(
    mapPlayRoundPlayersForLeaderboard(playRound.players).map((player) => [
      player.userId,
      player,
    ])
  );

  const rows = teams.map((team) => {
    const members = team.memberUserIds
      .map((userId) => playerByUserId.get(userId))
      .filter((player): player is NonNullable<typeof player> => player != null);

    const memberNames = team.members.map((member) => member.fullName).join(", ");

    if (isStableford) {
      const total = members.reduce(
        (sum, player) => sum + playerStablefordPoints(player.scores, scorecard),
        0
      );
      const holesPlayed =
        members.length > 0 ? Math.max(...members.map((player) => player.holesPlayed)) : 0;

      return {
        teamId: team.id,
        teamName: team.name,
        memberNames,
        memberCount: team.members.length,
        total,
        holesPlayed,
        toPar: null,
        isStableford: true,
      };
    }

    const total = members.reduce((sum, player) => sum + player.total, 0);

    let toParSum = 0;
    let hasScore = false;
    for (const player of members) {
      const toPar = playerCumulativeToPar(player.scores, scorecard);
      if (toPar != null) {
        toParSum += toPar;
        hasScore = true;
      }
    }

    const holesPlayed =
      members.length > 0 ? Math.min(...members.map((player) => player.holesPlayed)) : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      memberNames,
      memberCount: team.members.length,
      total,
      holesPlayed,
      toPar: hasScore ? toParSum : null,
      isStableford: false,
    };
  });

  const sorted = [...rows].sort((a, b) => {
    if (isStableford) {
      if (a.total !== b.total) return b.total - a.total;
      return b.holesPlayed - a.holesPlayed;
    }
    if (a.toPar == null && b.toPar == null) return 0;
    if (a.toPar == null) return 1;
    if (b.toPar == null) return -1;
    if (a.toPar !== b.toPar) return a.toPar - b.toPar;
    if (a.total !== b.total) return a.total - b.total;
    return b.holesPlayed - a.holesPlayed;
  });

  return assignTeamRanks(sorted).map((row) => ({
    rank: row.isStableford ? (row.total > 0 ? row.rank : 0) : row.toPar != null ? row.rank : 0,
    teamId: row.teamId,
    teamName: row.teamName,
    memberNames: row.memberNames,
    memberCount: row.memberCount,
    total: row.total,
    holesPlayed: row.holesPlayed,
    toPar: row.toPar,
    isStableford: row.isStableford,
  }));
}
