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
