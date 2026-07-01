import { prisma } from "@/lib/db";
import { outingSlug, findUniqueOutingSlug } from "@/lib/outing-slug";

export async function findOutingByIdOrSlug(idOrSlug: string) {
  const isSlug = idOrSlug.includes("-");
  let outing = await prisma.outing.findFirst({
    where: isSlug ? { slug: idOrSlug } : { id: idOrSlug },
  });
  if (outing && !outing.slug) {
    const baseSlug = outingSlug(outing.course, outing.createdAt);
    const slug = await findUniqueOutingSlug(baseSlug, outing.id);
    outing = await prisma.outing.update({
      where: { id: outing.id },
      data: { slug },
    });
  }
  return outing;
}
