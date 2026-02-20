import { prisma } from "@/lib/db";
import { tournamentSlug, findUniqueSlug } from "@/lib/tournament-slug";

/**
 * Resolve a tournament by id (cuid) or slug.
 * Slugs contain dashes (MM-DD-YY-name); cuids do not.
 * Lazy-backfills slug for old tournaments that don't have one.
 */
export async function findTournamentByIdOrSlug(idOrSlug: string) {
  const isSlug = idOrSlug.includes("-");
  let tournament = await prisma.tournament.findFirst({
    where: isSlug ? { slug: idOrSlug } : { id: idOrSlug },
  });
  if (tournament && !tournament.slug) {
    const baseSlug = tournamentSlug(tournament.date, tournament.name);
    const slug = await findUniqueSlug(baseSlug, tournament.id);
    tournament = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { slug },
    });
  }
  return tournament;
}
