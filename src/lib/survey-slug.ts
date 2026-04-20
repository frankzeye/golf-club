import { prisma } from "@/lib/db";
import { formatAvailabilitySurveyTitle } from "@/lib/survey-title";

/** Lowercase, non-alphanumeric → dashes, for URL paths. */
export function slugifySurveyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export async function uniqueSlugForSurvey(
  base: string,
  exceptSurveyId?: string
): Promise<string> {
  let slug = base || "survey";
  let n = 2;
  for (;;) {
    const clash = await prisma.survey.findFirst({
      where: {
        slug,
        ...(exceptSurveyId ? { NOT: { id: exceptSurveyId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base || "survey"}-${n++}`;
  }
}

/** Persist a slug for this survey row if missing; returns final slug. */
export async function ensureSurveySlug(
  row: Pick<{ id: string; month: number; year: number; slug: string | null }, "id" | "month" | "year" | "slug">
): Promise<string> {
  if (row.slug) return row.slug;
  const title = formatAvailabilitySurveyTitle(row.month, row.year);
  const base = slugifySurveyTitle(title);
  const slug = await uniqueSlugForSurvey(base, row.id);
  await prisma.survey.update({
    where: { id: row.id },
    data: { slug },
  });
  return slug;
}

export async function generateNewSurveySlug(month: number, year: number): Promise<string> {
  const base = slugifySurveyTitle(formatAvailabilitySurveyTitle(month, year));
  return uniqueSlugForSurvey(base);
}

/**
 * Resolve survey by internal id or public slug; lazily assigns slug for legacy rows.
 */
export async function findSurveyByIdOrSlug(idOrSlug: string) {
  const survey = await prisma.survey.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { options: { orderBy: { date: "asc" } } },
  });
  if (!survey) return null;
  if (!survey.slug) {
    await ensureSurveySlug(survey);
    return prisma.survey.findUnique({
      where: { id: survey.id },
      include: { options: { orderBy: { date: "asc" } } },
    });
  }
  return survey;
}
