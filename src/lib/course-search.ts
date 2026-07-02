import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const MIN_TOKEN_LENGTH = 2;
const DEFAULT_LIMIT = 15;

export type CourseSearchRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

/** Combined label used for cross-field matching (name + city + state). */
export const courseSearchHaystack = Prisma.sql`(
  coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state, '')
)`;

/** Split a search string into tokens (words) of at least 2 characters. */
export function tokenizeCourseSearchQuery(query: string): string[] {
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= MIN_TOKEN_LENGTH);

  if (tokens.length > 0) return tokens;

  const trimmed = query.trim();
  return trimmed.length >= MIN_TOKEN_LENGTH ? [trimmed] : [];
}

function orderedPattern(tokens: string[]): string {
  return `%${tokens.join("%")}%`;
}

function tokenMatchesAnyField(token: string) {
  const pattern = `%${token}%`;
  return Prisma.sql`(
    name ILIKE ${pattern}
    OR city ILIKE ${pattern}
    OR state ILIKE ${pattern}
    OR ${courseSearchHaystack} ILIKE ${pattern}
  )`;
}

function allTokensInHaystack(tokens: string[]) {
  return Prisma.join(
    tokens.map((token) => {
      const pattern = `%${token}%`;
      return Prisma.sql`${courseSearchHaystack} ILIKE ${pattern}`;
    }),
    " AND "
  );
}

function allTokensInName(tokens: string[]) {
  return Prisma.join(
    tokens.map((token) => {
      const pattern = `%${token}%`;
      return Prisma.sql`name ILIKE ${pattern}`;
    }),
    " AND "
  );
}

function tokenRelevanceScore(token: string) {
  const pattern = `%${token}%`;
  const prefix = `${token}%`;
  return Prisma.sql`(
    CASE WHEN name ILIKE ${prefix} THEN 4
         WHEN name ILIKE ${pattern} THEN 3
         WHEN city ILIKE ${prefix} THEN 3
         WHEN city ILIKE ${pattern} THEN 2
         WHEN state ILIKE ${pattern} THEN 1
         ELSE 0
    END
  )`;
}

/** Boost when tokens match both course name and location (e.g. "rancho" + "murrieta"). */
function crossFieldMatchBonus(tokens: string[]) {
  if (tokens.length < 2) {
    return Prisma.sql`0`;
  }

  const nameMatch = Prisma.join(
    tokens.map((token) => {
      const pattern = `%${token}%`;
      return Prisma.sql`name ILIKE ${pattern}`;
    }),
    " OR "
  );

  const locationMatch = Prisma.join(
    tokens.map((token) => {
      const pattern = `%${token}%`;
      return Prisma.sql`city ILIKE ${pattern} OR state ILIKE ${pattern}`;
    }),
    " OR "
  );

  return Prisma.sql`(
    CASE WHEN (${nameMatch}) AND (${locationMatch}) THEN 60 ELSE 0 END
  )`;
}

/** Boost when tokens appear in order across the combined name + city + state string. */
function haystackOrderedBonus(tokens: string[]) {
  if (tokens.length < 2) {
    return Prisma.sql`0`;
  }

  const forward = orderedPattern(tokens);
  const reverse = orderedPattern([...tokens].reverse());

  return Prisma.sql`(
    CASE WHEN ${courseSearchHaystack} ILIKE ${forward} THEN 50
         WHEN ${courseSearchHaystack} ILIKE ${reverse} THEN 48
         ELSE 0 END
  )`;
}

function searchRelevanceScore(tokens: string[]) {
  const nameOrdered = orderedPattern(tokens);
  const tokenScores = Prisma.join(
    tokens.map((token) => tokenRelevanceScore(token)),
    " + "
  );

  return Prisma.sql`(
    (CASE WHEN name ILIKE ${nameOrdered} THEN 100 ELSE 0 END) +
    ${haystackOrderedBonus(tokens)} +
    ${crossFieldMatchBonus(tokens)} +
    (CASE WHEN ${allTokensInHaystack(tokens)} THEN 25 ELSE 0 END) +
    (CASE WHEN ${allTokensInName(tokens)} THEN 20 ELSE 0 END) +
    ${tokenScores}
  )`;
}

/**
 * Search courses where every token matches name, city, state, or the combined label.
 * Example: "rancho murrieta" matches "The Golf Club At Rancho California" in Murrieta, CA.
 */
export async function searchGolfCourses(
  query: string,
  limit = DEFAULT_LIMIT
): Promise<CourseSearchRow[]> {
  const tokens = tokenizeCourseSearchQuery(query);
  if (tokens.length === 0) return [];

  const whereClause = Prisma.join(
    tokens.map((token) => tokenMatchesAnyField(token)),
    " AND "
  );

  const scoreExpr = searchRelevanceScore(tokens);

  return prisma.$queryRaw<CourseSearchRow[]>`
    SELECT id, name, city, state
    FROM "GolfCourse"
    WHERE ${whereClause}
    ORDER BY (${scoreExpr}) DESC, name ASC
    LIMIT ${limit}
  `;
}

export async function golfCourseDirectoryCount(): Promise<number> {
  return prisma.golfCourse.count();
}
