import { prisma } from "@/lib/db";
import { memberSlug, findUniqueMemberSlug } from "@/lib/member-slug";

/**
 * Resolve a member by id (cuid) or slug.
 * Supports legacy links that use a computed slug before it was saved on the user record.
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

  if (!user) {
    const usersWithoutSlug = await prisma.user.findMany({
      where: { slug: null },
    });
    user =
      usersWithoutSlug.find(
        (candidate) =>
          memberSlug(candidate.firstName ?? "", candidate.lastName ?? "") === idOrSlug
      ) ?? null;
  }

  if (user && !user.slug) {
    const baseSlug = memberSlug(user.firstName ?? "", user.lastName ?? "");
    const slug = await findUniqueMemberSlug(baseSlug, user.id);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { slug },
    });
  }

  return user;
}
