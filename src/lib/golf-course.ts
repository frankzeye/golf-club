import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mergeStrokeIndexesIntoCourseDetails } from "@/lib/course-stroke-indexes";

export const OPENGOLF_ATTRIBUTION = "Contains data from OpenGolfAPI (opengolfapi.org)";
export const OPENGOLF_API_BASE = "https://api.opengolfapi.org/v1";
export const DETAILS_CACHE_MS = 90 * 24 * 60 * 60 * 1000;

export function formatCourseLabel(
  name: string,
  city?: string | null,
  state?: string | null
): string {
  const location = [city, state].filter(Boolean).join(", ");
  return location ? `${name} — ${location}` : name;
}

export async function resolveCourseSelection(
  courseId: string | null | undefined,
  courseName: string | null | undefined
): Promise<{ course: string; courseId: string | null } | null> {
  const id = typeof courseId === "string" ? courseId.trim() : "";
  if (id) {
    const golfCourse = await prisma.golfCourse.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (golfCourse) {
      return { course: golfCourse.name, courseId: golfCourse.id };
    }
  }

  const name = typeof courseName === "string" ? courseName.trim() : "";
  if (!name) return null;
  return { course: name, courseId: null };
}

export async function fetchAndCacheCourseDetails(
  id: string
): Promise<Prisma.JsonValue> {
  const existing = await prisma.golfCourse.findUnique({
    where: { id },
    select: { detailsJson: true, detailsCachedAt: true, strokeIndexesJson: true },
  });

  const dbStrokeIndexes = existing?.strokeIndexesJson ?? null;

  const now = Date.now();
  if (
    existing?.detailsJson &&
    existing.detailsCachedAt &&
    now - existing.detailsCachedAt.getTime() < DETAILS_CACHE_MS
  ) {
    const enriched = mergeStrokeIndexesIntoCourseDetails(
      existing.detailsJson,
      id,
      dbStrokeIndexes
    );
    if (enriched !== existing.detailsJson) {
      await prisma.golfCourse.update({
        where: { id },
        data: { detailsJson: enriched as Prisma.InputJsonValue },
      });
    }
    return enriched;
  }

  const res = await fetch(`${OPENGOLF_API_BASE}/courses/${id}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`OpenGolfAPI returned ${res.status}`);
  }

  const details = (await res.json()) as Prisma.JsonValue;
  const enriched = mergeStrokeIndexesIntoCourseDetails(details, id, dbStrokeIndexes);
  await prisma.golfCourse.update({
    where: { id },
    data: {
      detailsJson: enriched as Prisma.InputJsonValue,
      detailsCachedAt: new Date(),
    },
  });

  return enriched;
}
