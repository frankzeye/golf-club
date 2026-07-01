/**
 * Generate a URL slug for an outing: MM-DD-YY-course-name-in-lowercase-with-dashes
 */
export function outingSlug(course: string, createdAt: Date): string {
  const d = new Date(createdAt);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const courseSlug = course
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "outing";
  return `${mm}-${dd}-${yy}-${courseSlug}`;
}

export async function findUniqueOutingSlug(
  slug: string,
  excludeId?: string
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  let candidate = slug;
  let n = 2;
  while (true) {
    const existing = await prisma.outing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${slug}-${n}`;
    n += 1;
  }
}

export function formatTimeOfDay(timeOfDay: string | null | undefined): string | null {
  if (!timeOfDay) return null;
  const labels: Record<string, string> = {
    morning: "Morning",
    midday: "Mid day",
    afternoon: "Afternoon",
  };
  return labels[timeOfDay] ?? timeOfDay;
}
