import { holesPlayed, parsePlayerScores } from "@/lib/course-scorecard";
import { prisma } from "@/lib/db";

/**
 * When every player on a tournament scoring round has all hole scores,
 * mark the play round completed.
 */
export async function maybeAutoCompletePlayRound(playRoundId: string): Promise<boolean> {
  const round = await prisma.playRound.findUnique({
    where: { id: playRoundId },
    select: {
      id: true,
      status: true,
      holeCount: true,
      tournamentId: true,
      players: { select: { scores: true } },
    },
  });

  if (!round || round.status === "completed" || !round.tournamentId) {
    return false;
  }
  if (round.players.length === 0) return false;

  const allScored = round.players.every((player) => {
    const scores = parsePlayerScores(player.scores);
    return holesPlayed(scores) >= round.holeCount;
  });

  if (!allScored) return false;

  await prisma.playRound.update({
    where: { id: playRoundId },
    data: { status: "completed" },
  });

  return true;
}
