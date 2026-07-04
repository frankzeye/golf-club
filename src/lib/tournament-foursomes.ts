import { memberSlug } from "@/lib/member-slug";

export const MAX_FOURSOME_SIZE = 4;

export interface FoursomeDraft {
  id?: string;
  name: string;
  sortOrder: number;
  userIds: string[];
}

export interface AutoAssignFoursome {
  name: string;
  sortOrder: number;
  userIds: string[];
}

export function autoAssignFoursomes(userIds: string[]): AutoAssignFoursome[] {
  if (userIds.length === 0) return [];

  const foursomes: AutoAssignFoursome[] = [];
  for (let i = 0; i < userIds.length; i += MAX_FOURSOME_SIZE) {
    const group = userIds.slice(i, i + MAX_FOURSOME_SIZE);
    foursomes.push({
      name: `Group ${foursomes.length + 1}`,
      sortOrder: foursomes.length,
      userIds: group,
    });
  }
  return foursomes;
}

export function validateFoursomeDrafts(
  drafts: FoursomeDraft[],
  registeredUserIds: Set<string>
): string | null {
  const seen = new Set<string>();
  for (const foursome of drafts) {
    if (!foursome.name.trim()) return "Each foursome needs a name.";
    if (foursome.userIds.length > MAX_FOURSOME_SIZE) {
      return `Each foursome can have at most ${MAX_FOURSOME_SIZE} players.`;
    }
    for (const userId of foursome.userIds) {
      if (!registeredUserIds.has(userId)) {
        return "Foursomes can only include registered tournament players.";
      }
      if (seen.has(userId)) {
        return "Each player can only be assigned to one foursome.";
      }
      seen.add(userId);
    }
  }
  return null;
}

const foursomeInclude = {
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

export { foursomeInclude };

function formatFoursomeMember(user: {
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

export function formatTournamentFoursomes(
  foursomes: Array<{
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
  return foursomes
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((foursome) => ({
      id: foursome.id,
      name: foursome.name,
      sortOrder: foursome.sortOrder,
      memberUserIds: foursome.members.map((m) => m.user.id),
      members: foursome.members.map((m) => formatFoursomeMember(m.user)),
    }));
}
