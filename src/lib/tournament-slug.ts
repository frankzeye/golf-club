/**
 * Generate a URL slug for a tournament: MM-DD-YY-name-in-lowercase-with-dashes
 */
export function tournamentSlug(date: Date, name: string): string {
  const d = new Date(date);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tournament";
  return `${mm}-${dd}-${yy}-${nameSlug}`;
}

/**
 * Find a unique slug, appending -2, -3, etc. if needed.
 * Pass excludeId when updating so we don't conflict with ourselves.
 */
export async function findUniqueSlug(
  slug: string,
  excludeId?: string
): Promise<string> {
  const { prisma } = await import("@/lib/db");
  let candidate = slug;
  let n = 2;
  while (true) {
    const existing = await prisma.tournament.findUnique({
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
