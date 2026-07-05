/** Tournament is finished when scoring is completed, even if the calendar date is still in the future. */
export function isTournamentScoringCompleted(
  playRound: { status: string } | null | undefined
): boolean {
  return playRound?.status === "completed";
}

export function isTournamentPast(
  tournament: { date: Date },
  playRound: { status: string } | null | undefined,
  now: Date = new Date()
): boolean {
  return tournament.date < now || isTournamentScoringCompleted(playRound);
}

export function isTournamentUpcoming(
  tournament: { date: Date },
  playRound: { status: string } | null | undefined,
  now: Date = new Date()
): boolean {
  return !isTournamentPast(tournament, playRound, now);
}
