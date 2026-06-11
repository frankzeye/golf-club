import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { surveyDisplayTitle } from "@/lib/survey-title";

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
export async function ensureSurveySlug(row: {
  id: string;
  type?: string | null;
  title?: string | null;
  month: number | null;
  year: number | null;
  slug: string | null;
}): Promise<string> {
  if (row.slug) return row.slug;
  const title = surveyDisplayTitle(row);
  const base = slugifySurveyTitle(title);
  for (let attempt = 0; attempt < 12; attempt++) {
    const slug = await uniqueSlugForSurvey(base, row.id);
    try {
      await prisma.survey.update({
        where: { id: row.id },
        data: { slug },
      });
      return slug;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        continue;
      }
      throw e;
    }
  }
  throw new Error("Could not assign a unique survey slug");
}

export async function generateNewSurveySlug(title: string): Promise<string> {
  const base = slugifySurveyTitle(title);
  return uniqueSlugForSurvey(base);
}

/**
 * Resolve survey by internal id or public slug; lazily assigns slug for legacy rows.
 */
const OPTION_ORDER = [
  { date: "asc" as const },
  { sortOrder: "asc" as const },
  { id: "asc" as const },
];

export async function findSurveyByIdOrSlug(idOrSlug: string) {
  const survey = await prisma.survey.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { options: { orderBy: OPTION_ORDER } },
  });
  if (!survey) return null;
  if (!survey.slug) {
    await ensureSurveySlug(survey);
    return prisma.survey.findUnique({
      where: { id: survey.id },
      include: { options: { orderBy: OPTION_ORDER } },
    });
  }
  return survey;
}
