import { prisma } from "@/lib/db";

export interface PlayRoundAccess {
  canView: boolean;
  canScoreAny: boolean;
  canDelete: boolean;
  viewerPlayerId: string | null;
  isTournamentRound: boolean;
}

export async function getPlayRoundAccess(
  playRoundId: string,
  userId: string,
  userRole: string
): Promise<PlayRoundAccess> {
  const round = await prisma.playRound.findUnique({
    where: { id: playRoundId },
    select: {
      tournamentId: true,
      players: { select: { id: true, userId: true } },
    },
  });

  if (!round) {
    return {
      canView: false,
      canScoreAny: false,
      canDelete: false,
      viewerPlayerId: null,
      isTournamentRound: false,
    };
  }

  const viewerPlayer = round.players.find((p) => p.userId === userId) ?? null;
  const isAdmin = userRole === "admin";
  const isTournamentRound = round.tournamentId != null;

  if (isTournamentRound) {
    const isRegistered = viewerPlayer != null;
    return {
      canView: isAdmin || isRegistered,
      canScoreAny: isAdmin,
      canDelete: isAdmin,
      viewerPlayerId: viewerPlayer?.id ?? null,
      isTournamentRound: true,
    };
  }

  return {
    canView: isAdmin,
    canScoreAny: isAdmin,
    canDelete: isAdmin,
    viewerPlayerId: viewerPlayer?.id ?? null,
    isTournamentRound: false,
  };
}

export function canSaveScoreForPlayer(
  access: PlayRoundAccess,
  playerId: string
): boolean {
  if (access.canScoreAny) return true;
  return access.viewerPlayerId === playerId;
}
