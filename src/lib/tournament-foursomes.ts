import { memberSlug } from "@/lib/member-slug";
import { parseStartTime } from "@/lib/tournament-time";

export const MAX_FOURSOME_SIZE = 4;
export const DEFAULT_FOURSOME_START_HOLE = 1;
export const MAX_FOURSOME_START_HOLE = 18;

export interface FoursomeDraft {
  id?: string;
  name: string;
  sortOrder: number;
  userIds: string[];
  startTime?: string | null;
  startHole?: number;
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

export function parseFoursomeStartHole(value: unknown): number {
  if (value == null || value === "") return DEFAULT_FOURSOME_START_HOLE;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_FOURSOME_START_HOLE) {
    return DEFAULT_FOURSOME_START_HOLE;
  }
  return n;
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
    if (foursome.startTime != null && foursome.startTime !== "" && !parseStartTime(foursome.startTime)) {
      return "Each foursome tee time must be a valid time.";
    }
    if (
      foursome.startHole != null &&
      (!Number.isInteger(foursome.startHole) ||
        foursome.startHole < 1 ||
        foursome.startHole > MAX_FOURSOME_START_HOLE)
    ) {
      return `Starting hole must be between 1 and ${MAX_FOURSOME_START_HOLE}.`;
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
    startTime: string | null;
    startHole: number;
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
      startTime: foursome.startTime ?? null,
      startHole: foursome.startHole ?? DEFAULT_FOURSOME_START_HOLE,
      memberUserIds: foursome.members.map((m) => m.user.id),
      members: foursome.members.map((m) => formatFoursomeMember(m.user)),
    }));
}
