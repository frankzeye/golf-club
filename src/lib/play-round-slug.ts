import { prisma } from "@/lib/db";

export function playRoundSlug(course: string, createdAt: Date): string {
  const d = new Date(createdAt);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const courseSlug = course
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "round";
  return `play-${mm}-${dd}-${yy}-${courseSlug}`;
}

export async function findUniquePlayRoundSlug(
  slug: string,
  excludeId?: string
): Promise<string> {
  let candidate = slug;
  let n = 2;
  while (true) {
    const existing = await prisma.playRound.findUnique({
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

export async function findPlayRoundByIdOrSlug(idOrSlug: string) {
  const byId = await prisma.playRound.findUnique({ where: { id: idOrSlug } });
  if (byId) return byId;
  return prisma.playRound.findUnique({ where: { slug: idOrSlug } });
}
