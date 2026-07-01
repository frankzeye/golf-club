import { prisma } from "@/lib/db";
import { memberSlug, findUniqueMemberSlug } from "@/lib/member-slug";

/**
 * Resolve a member by id (cuid) or slug.
 * Lazy-backfills slug for existing users that don't have one.
 */
export async function findMemberByIdOrSlug(idOrSlug: string) {
  let user = await prisma.user.findUnique({
    where: { id: idOrSlug },
  });
  if (!user) {
    user = await prisma.user.findUnique({
      where: { slug: idOrSlug },
    });
  }
  if (user && !user.slug) {
    const baseSlug = memberSlug(user.firstName, user.lastName);
    const slug = await findUniqueMemberSlug(baseSlug, user.id);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { slug },
    });
  }
  return user;
}
