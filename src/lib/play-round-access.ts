import { prisma } from "@/lib/db";

export interface PlayRoundAccess {
  canView: boolean;
  canScoreAny: boolean;
  canDelete: boolean;
  viewerPlayerId: string | null;
  scorablePlayerIds: string[];
  isTournamentRound: boolean;
}

async function resolveScorablePlayerIds(
  round: {
    tournamentId: string | null;
    players: Array<{ id: string; userId: string }>;
  },
  userId: string,
  isAdmin: boolean,
  viewerPlayer: { id: string; userId: string } | null,
  isTournamentRound: boolean
): Promise<string[]> {
  if (!isTournamentRound || !round.tournamentId) {
    if (isAdmin) return round.players.map((p) => p.id);
    if (!viewerPlayer) return [];
    return [viewerPlayer.id];
  }

  if (!viewerPlayer) return [];

  const membership = await prisma.tournamentFoursomeMember.findFirst({
    where: {
      userId,
      foursome: { tournamentId: round.tournamentId },
    },
    include: {
      foursome: {
        include: { members: { select: { userId: true } } },
      },
    },
  });

  if (!membership) {
    return [viewerPlayer.id];
  }

  const mateUserIds = new Set(membership.foursome.members.map((m) => m.userId));
  return round.players.filter((p) => mateUserIds.has(p.userId)).map((p) => p.id);
}

export async function getFoursomeMemberUserIds(
  tournamentId: string,
  userId: string
): Promise<string[] | null> {
  const membership = await prisma.tournamentFoursomeMember.findFirst({
    where: {
      userId,
      foursome: { tournamentId },
    },
    include: {
      foursome: {
        include: { members: { select: { userId: true } } },
      },
    },
  });

  if (!membership) return null;
  return membership.foursome.members.map((m) => m.userId);
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
      scorablePlayerIds: [],
      isTournamentRound: false,
    };
  }

  const viewerPlayer = round.players.find((p) => p.userId === userId) ?? null;
  const isAdmin = userRole === "admin";
  const isTournamentRound = round.tournamentId != null;
  const scorablePlayerIds = await resolveScorablePlayerIds(
    round,
    userId,
    isAdmin,
    viewerPlayer,
    isTournamentRound
  );

  if (isTournamentRound) {
    const isRegistered = viewerPlayer != null;
    return {
      canView: isAdmin || isRegistered,
      canScoreAny: isAdmin,
      canDelete: isAdmin,
      viewerPlayerId: viewerPlayer?.id ?? null,
      scorablePlayerIds,
      isTournamentRound: true,
    };
  }

  return {
    canView: isAdmin,
    canScoreAny: isAdmin,
    canDelete: isAdmin,
    viewerPlayerId: viewerPlayer?.id ?? null,
    scorablePlayerIds,
    isTournamentRound: false,
  };
}

export function canSaveScoreForPlayer(
  access: PlayRoundAccess,
  playerId: string
): boolean {
  if (access.canScoreAny && !access.isTournamentRound) return true;
  return access.scorablePlayerIds.includes(playerId);
}
