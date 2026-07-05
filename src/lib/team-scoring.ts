import {
  playerCumulativeToPar,
  playerNetCumulativeToPar,
  playerNetTotal,
  playerStablefordPoints,
  strokesReceivedOnHole,
  type LeaderboardScoringMode,
  type ScorecardHole,
} from "@/lib/course-scorecard";
import {
  BEST_BALL_SCORING_FORMAT,
  SCRAMBLE_SCORING_FORMAT,
  STABLEFORD_SCORING_FORMAT,
} from "@/lib/tournament-scoring-formats";

export type TeamScoringMember = {
  scores: Record<string, number>;
  handicapIndex?: number | null;
  holesPlayed?: number;
  total?: number;
};

function holesPlayedFromScores(scores: Record<string, number>): number {
  return Object.keys(scores).length;
}

function totalStrokesFromScores(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, strokes) => sum + strokes, 0);
}

/** Per-hole best net (or gross) score among team members. */
export function computeBestBallTeamScores(
  members: TeamScoringMember[],
  scorecard: ScorecardHole[],
  scoringMode: LeaderboardScoringMode
): Record<string, number> {
  const teamScores: Record<string, number> = {};

  for (const hole of scorecard) {
    let best: number | null = null;
    for (const player of members) {
      const strokes = player.scores[String(hole.hole)];
      if (strokes == null) continue;

      const value =
        scoringMode === "net"
          ? strokes - strokesReceivedOnHole(player.handicapIndex, scorecard, hole.hole)
          : strokes;

      if (best == null || value < best) best = value;
    }

    if (best != null) teamScores[String(hole.hole)] = best;
  }

  return teamScores;
}

/** Single team scorecard — uses the member who recorded the most holes. */
export function computeScrambleTeamScores(members: TeamScoringMember[]): Record<string, number> {
  const sorted = [...members].sort(
    (a, b) =>
      (b.holesPlayed ?? holesPlayedFromScores(b.scores)) -
      (a.holesPlayed ?? holesPlayedFromScores(a.scores))
  );

  for (const player of sorted) {
    const count = player.holesPlayed ?? holesPlayedFromScores(player.scores);
    if (count > 0) return player.scores;
  }

  const merged: Record<string, number> = {};
  for (const player of members) {
    for (const [hole, strokes] of Object.entries(player.scores)) {
      if (merged[hole] == null) merged[hole] = strokes;
    }
  }
  return merged;
}

function lowestTeamHandicap(members: TeamScoringMember[]): number | null {
  const handicaps = members
    .map((member) => member.handicapIndex)
    .filter((value): value is number => value != null && Number.isFinite(value));
  if (handicaps.length === 0) return null;
  return Math.min(...handicaps);
}

function bestBallStablefordPoints(
  members: TeamScoringMember[],
  scorecard: ScorecardHole[],
  scoringMode: LeaderboardScoringMode
): number {
  let points = 0;

  for (const hole of scorecard) {
    let bestHolePoints = 0;
    for (const player of members) {
      const strokes = player.scores[String(hole.hole)];
      if (strokes == null) continue;

      const net =
        scoringMode === "net"
          ? strokes - strokesReceivedOnHole(player.handicapIndex, scorecard, hole.hole)
          : strokes;
      const holePoints = Math.max(0, 2 + hole.par - net);
      if (holePoints > bestHolePoints) bestHolePoints = holePoints;
    }
    points += bestHolePoints;
  }

  return points;
}

export function aggregateTeamStrokeStats(
  members: TeamScoringMember[],
  scorecard: ScorecardHole[],
  scoringFormat: string,
  scoringMode: LeaderboardScoringMode
): { total: number; holesPlayed: number; toPar: number | null; isStableford: boolean } {
  const isStableford = scoringFormat === STABLEFORD_SCORING_FORMAT;

  if (scoringFormat === BEST_BALL_SCORING_FORMAT) {
    if (isStableford) {
      const total = bestBallStablefordPoints(members, scorecard, scoringMode);
      const teamScores = computeBestBallTeamScores(members, scorecard, scoringMode);
      return {
        total,
        holesPlayed: holesPlayedFromScores(teamScores),
        toPar: null,
        isStableford: true,
      };
    }

    const teamScores = computeBestBallTeamScores(members, scorecard, scoringMode);
    const total = totalStrokesFromScores(teamScores);
    let toPar = 0;
    let hasScore = false;
    for (const hole of scorecard) {
      const strokes = teamScores[String(hole.hole)];
      if (strokes != null) {
        toPar += strokes - hole.par;
        hasScore = true;
      }
    }

    return {
      total,
      holesPlayed: holesPlayedFromScores(teamScores),
      toPar: hasScore ? toPar : null,
      isStableford: false,
    };
  }

  if (scoringFormat === SCRAMBLE_SCORING_FORMAT) {
    const teamScores = computeScrambleTeamScores(members);
    const holesPlayed = holesPlayedFromScores(teamScores);

    if (isStableford) {
      const handicapIndex =
        scoringMode === "net" ? lowestTeamHandicap(members) : null;
      const total = playerStablefordPoints(
        teamScores,
        scorecard,
        handicapIndex,
        scoringMode
      );
      return { total, holesPlayed, toPar: null, isStableford: true };
    }

    if (scoringMode === "net") {
      const handicapIndex = lowestTeamHandicap(members);
      return {
        total: playerNetTotal(teamScores, scorecard, handicapIndex),
        holesPlayed,
        toPar: playerNetCumulativeToPar(teamScores, scorecard, handicapIndex),
        isStableford: false,
      };
    }

    return {
      total: totalStrokesFromScores(teamScores),
      holesPlayed,
      toPar: playerCumulativeToPar(teamScores, scorecard),
      isStableford: false,
    };
  }

  if (isStableford) {
    const total = members.reduce(
      (sum, player) =>
        sum +
        playerStablefordPoints(
          player.scores,
          scorecard,
          player.handicapIndex,
          scoringMode
        ),
      0
    );
    const holesPlayed =
      members.length > 0
        ? Math.max(...members.map((player) => player.holesPlayed ?? holesPlayedFromScores(player.scores)))
        : 0;
    return { total, holesPlayed, toPar: null, isStableford: true };
  }

  const total = members.reduce(
    (sum, player) =>
      sum +
      (scoringMode === "net"
        ? playerNetTotal(player.scores, scorecard, player.handicapIndex)
        : (player.total ?? totalStrokesFromScores(player.scores))),
    0
  );

  let toParSum = 0;
  let hasScore = false;
  for (const player of members) {
    const toPar =
      scoringMode === "net"
        ? playerNetCumulativeToPar(player.scores, scorecard, player.handicapIndex)
        : playerCumulativeToPar(player.scores, scorecard);
    if (toPar != null) {
      toParSum += toPar;
      hasScore = true;
    }
  }

  const holesPlayed =
    members.length > 0
      ? Math.min(...members.map((player) => player.holesPlayed ?? holesPlayedFromScores(player.scores)))
      : 0;

  return {
    total,
    holesPlayed,
    toPar: hasScore ? toParSum : null,
    isStableford: false,
  };
}
