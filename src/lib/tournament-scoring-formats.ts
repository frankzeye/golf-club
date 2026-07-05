export const TOURNAMENT_SCORING_FORMATS = [
  "Stroke Play",
  "Stableford",
  "Best Ball",
  "Scramble",
  "Ryder Cup",
  "Houses",
  "Flights",
] as const;

export type TournamentScoringFormat = (typeof TOURNAMENT_SCORING_FORMATS)[number];

export const FLIGHTS_SCORING_FORMAT: TournamentScoringFormat = "Flights";
export const BEST_BALL_SCORING_FORMAT: TournamentScoringFormat = "Best Ball";
export const SCRAMBLE_SCORING_FORMAT: TournamentScoringFormat = "Scramble";
export const STABLEFORD_SCORING_FORMAT: TournamentScoringFormat = "Stableford";
