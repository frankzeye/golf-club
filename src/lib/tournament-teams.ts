import { memberSlug } from "@/lib/member-slug";

export interface TeamDraft {
  id?: string;
  name: string;
  sortOrder: number;
  userIds: string[];
}

export interface AutoAssignTeam {
  name: string;
  sortOrder: number;
  userIds: string[];
}

export function autoAssignTeams(userIds: string[], teamSize: number): AutoAssignTeam[] {
  if (userIds.length === 0) return [];

  const size = teamSize === 4 ? 4 : 2;
  const teams: AutoAssignTeam[] = [];
  for (let i = 0; i < userIds.length; i += size) {
    const group = userIds.slice(i, i + size);
    teams.push({
      name: `Team ${teams.length + 1}`,
      sortOrder: teams.length,
      userIds: group,
    });
  }
  return teams;
}

export function validateTeamDrafts(
  drafts: TeamDraft[],
  registeredUserIds: Set<string>,
  teamSize: number
): string | null {
  const maxSize = teamSize === 4 ? 4 : 2;
  const seen = new Set<string>();

  for (const team of drafts) {
    if (!team.name.trim()) return "Each team needs a name.";
    if (team.userIds.length > maxSize) {
      return `Each team can have at most ${maxSize} players.`;
    }
    for (const userId of team.userIds) {
      if (!registeredUserIds.has(userId)) {
        return "Teams can only include registered tournament players.";
      }
      if (seen.has(userId)) {
        return "Each player can only be assigned to one team.";
      }
      seen.add(userId);
    }
  }
  return null;
}

const teamInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          slug: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          handicapIndex: true,
          scgaOfficial: true,
        },
      },
    },
    orderBy: { id: "asc" as const },
  },
} as const;

export { teamInclude };

function formatTeamMember(user: {
  id: string;
  slug: string | null;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  handicapIndex: number | null;
  scgaOfficial: boolean;
}) {
  return {
    id: user.id,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    imageUrl: user.imageUrl,
    handicapIndex: user.handicapIndex,
    slug: user.slug ?? memberSlug(user.firstName ?? "", user.lastName ?? ""),
  };
}

export function formatTournamentTeams(
  teams: Array<{
    id: string;
    name: string;
    sortOrder: number;
    members: Array<{
      user: {
        id: string;
        slug: string | null;
        firstName: string;
        lastName: string;
        imageUrl: string | null;
        handicapIndex: number | null;
        scgaOfficial: boolean;
      };
    }>;
  }>
) {
  return teams
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((team) => ({
      id: team.id,
      name: team.name,
      sortOrder: team.sortOrder,
      memberUserIds: team.members.map((m) => m.user.id),
      members: team.members.map((m) => formatTeamMember(m.user)),
    }));
}
