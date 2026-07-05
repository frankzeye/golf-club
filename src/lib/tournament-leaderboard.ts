import { loadPlayRoundScorecard } from "@/lib/load-play-round-scorecard";
import { aggregateTeamStrokeStats } from "@/lib/team-scoring";
import { formatTournamentTeams } from "@/lib/tournament-teams";
import {
  mapPlayRoundPlayersForLeaderboard,
  type PlayRoundPlayerForLeaderboard,
} from "@/lib/tournament-flights";
import type { LeaderboardScoringMode } from "@/lib/course-scorecard";

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
  scoringFormat: string,
  scoringMode: LeaderboardScoringMode = "net"
): Promise<TournamentTeamLeaderboardRow[]> {
  if (teams.length === 0) return [];

  const scorecard = await loadPlayRoundScorecard(
    playRound.courseId,
    playRound.holeCount,
    null
  );

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
    const stats = aggregateTeamStrokeStats(members, scorecard, scoringFormat, scoringMode);

    return {
      teamId: team.id,
      teamName: team.name,
      memberNames,
      memberCount: team.members.length,
      total: stats.total,
      holesPlayed: stats.holesPlayed,
      toPar: stats.toPar,
      isStableford: stats.isStableford,
    };
  });

  const sorted = [...rows].sort((a, b) => {
    if (a.isStableford) {
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

export async function buildOverallTeamLeaderboards(
  teams: ReturnType<typeof formatTournamentTeams>,
  playRound: {
    courseId: string | null;
    holeCount: number;
    players: PlayRoundPlayerForLeaderboard[];
  },
  scoringFormat: string
) {
  const [net, gross] = await Promise.all([
    buildOverallTeamLeaderboard(teams, playRound, scoringFormat, "net"),
    buildOverallTeamLeaderboard(teams, playRound, scoringFormat, "gross"),
  ]);
  return { net, gross };
}
