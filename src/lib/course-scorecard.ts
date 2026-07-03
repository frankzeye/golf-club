export interface ScorecardHole {
  hole: number;
  par: number;
  handicap?: number;
}

function defaultHoles(holeCount: number, totalPar: number): ScorecardHole[] {
  const basePar = Math.floor(totalPar / holeCount);
  let remainder = totalPar - basePar * holeCount;
  return Array.from({ length: holeCount }, (_, i) => {
    const par = basePar + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return { hole: i + 1, par };
  });
}

/** Parse OpenGolfAPI course details into hole-by-hole par values. */
export function parseCourseScorecard(
  details: unknown,
  options?: { holeCount?: number; totalPar?: number | null }
): ScorecardHole[] {
  const fallbackCount = options?.holeCount ?? 18;
  const fallbackPar = options?.totalPar ?? 72;

  if (!details || typeof details !== "object") {
    return defaultHoles(fallbackCount, fallbackPar);
  }

  const record = details as Record<string, unknown>;
  const holeCount =
    typeof record.holes === "number" && record.holes > 0
      ? record.holes
      : fallbackCount;
  const totalPar =
    typeof record.par === "number" && record.par > 0 ? record.par : fallbackPar;

  if (Array.isArray(record.scorecard)) {
    const holes: ScorecardHole[] = [];
    for (const entry of record.scorecard) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const hole = Number(row.hole ?? row.number ?? row.holeNumber);
      const par = Number(row.par);
      if (!Number.isInteger(hole) || hole < 1) continue;
      if (!Number.isInteger(par) || par < 1) continue;
      const handicap = Number(row.handicap ?? row.strokeIndex ?? row.hcp);
      holes.push({
        hole,
        par,
        handicap: Number.isInteger(handicap) ? handicap : undefined,
      });
    }

    if (holes.length > 0) {
      return holes
        .sort((a, b) => a.hole - b.hole)
        .slice(0, Math.max(holeCount, holes.length));
    }
  }

  return defaultHoles(holeCount, totalPar);
}

export function parsePlayerScores(scores: unknown): Record<string, number> {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(scores as Record<string, unknown>)) {
    const strokes = Number(value);
    if (Number.isInteger(strokes) && strokes > 0) {
      result[key] = strokes;
    }
  }
  return result;
}

export function totalStrokes(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, n) => sum + n, 0);
}

export function holesPlayed(scores: Record<string, number>): number {
  return Object.keys(scores).length;
}

export function scoreToPar(strokes: number, par: number): number {
  return strokes - par;
}

export function formatScoreToPar(strokes: number, par: number): string {
  const diff = scoreToPar(strokes, par);
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : String(diff);
}

/** Max selectable strokes for score entry (par 4 → 8, par 5 → 10). */
export function maxStrokesForPar(par: number): number {
  if (par >= 5) return 10;
  if (par === 4) return 8;
  return Math.max(1, par + 3);
}

export function quickScoreOptions(par: number): number[] {
  const min = Math.max(1, par - 2);
  const max = maxStrokesForPar(par);
  const options: number[] = [];
  for (let n = min; n <= max; n++) options.push(n);
  return options;
}

export function formatRelativeToPar(diff: number): string {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : String(diff);
}

export function playerCumulativeToPar(
  scores: Record<string, number>,
  scorecard: ScorecardHole[]
): number | null {
  let diff = 0;
  let hasScore = false;
  for (const hole of scorecard) {
    const strokes = scores[String(hole.hole)];
    if (strokes != null) {
      diff += strokes - hole.par;
      hasScore = true;
    }
  }
  return hasScore ? diff : null;
}

export interface LeaderboardRow<TPlayer> {
  player: TPlayer;
  rank: number;
  total: number;
  holesPlayed: number;
  toPar: number | null;
}

export function buildLeaderboard<
  T extends {
    id: string;
    total: number;
    holesPlayed: number;
    scores: Record<string, number>;
  },
>(players: T[], scorecard: ScorecardHole[]): LeaderboardRow<T>[] {
  const sorted = [...players].sort((a, b) => {
    const aToPar = playerCumulativeToPar(a.scores, scorecard);
    const bToPar = playerCumulativeToPar(b.scores, scorecard);
    if (aToPar == null && bToPar == null) return 0;
    if (aToPar == null) return 1;
    if (bToPar == null) return -1;
    if (aToPar !== bToPar) return aToPar - bToPar;
    if (a.total !== b.total) return a.total - b.total;
    return b.holesPlayed - a.holesPlayed;
  });

  return sorted.map((player, index) => {
    const toPar = playerCumulativeToPar(player.scores, scorecard);
    let rank = index + 1;
    if (index > 0) {
      const prev = sorted[index - 1];
      const prevToPar = playerCumulativeToPar(prev.scores, scorecard);
      if (
        prevToPar === toPar &&
        prev.total === player.total &&
        prev.holesPlayed === player.holesPlayed
      ) {
        let r = index;
        while (r > 0) {
          const p = sorted[r - 1];
          const pPar = playerCumulativeToPar(p.scores, scorecard);
          if (
            pPar === toPar &&
            p.total === player.total &&
            p.holesPlayed === player.holesPlayed
          ) {
            r--;
          } else break;
        }
        rank = r + 1;
      }
    }

    return {
      player,
      rank,
      total: player.total,
      holesPlayed: player.holesPlayed,
      toPar,
    };
  });
}
