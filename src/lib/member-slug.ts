import { prisma } from "@/lib/db";

/** e.g. "John Smith" -> "john-smith" */
export function memberSlug(firstName: string, lastName: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "member";
}

export function memberProfileHref(user: { slug?: string | null; id: string }): string {
  return `/members/${user.slug ?? user.id}`;
}

export async function findUniqueMemberSlug(
  slug: string,
  excludeId?: string
): Promise<string> {
  let candidate = slug;
  let n = 2;
  while (true) {
    const existing = await prisma.user.findUnique({
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

export async function syncMemberSlug(
  userId: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const baseSlug = memberSlug(firstName, lastName);
  const slug = await findUniqueMemberSlug(baseSlug, userId);
  await prisma.user.update({
    where: { id: userId },
    data: { slug },
  });
  return slug;
}
