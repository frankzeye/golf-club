import { prisma } from "@/lib/db";
import { sendExpoPushNotifications } from "@/lib/expo-push";
import { outingSlug } from "@/lib/outing-slug";

function formatInviteDate(date: Date | null | undefined): string {
  if (!date) return "Date TBD";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type OutingForNotify = {
  id: string;
  slug: string | null;
  course: string;
  date: Date | null;
  createdAt: Date;
};

/**
 * Send push notifications to users invited to an outing.
 * Failures are logged but do not block the invite API response.
 */
export async function notifyOutingInvites(
  inviteeUserIds: string[],
  outing: OutingForNotify,
  organizerName: string
): Promise<void> {
  const uniqueIds = [...new Set(inviteeUserIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: uniqueIds } },
    select: { token: true, userId: true },
  });

  if (tokens.length === 0) return;

  const slug = outing.slug ?? outingSlug(outing.course, outing.createdAt);
  const dateLabel = formatInviteDate(outing.date);
  const organizer = organizerName.trim() || "A club member";

  const messages = tokens.map((row) => ({
    to: row.token,
    title: "You're invited to play",
    body: `${organizer} invited you to ${outing.course} · ${dateLabel}`,
    sound: "default" as const,
    data: {
      type: "outing_invite",
      outingId: outing.id,
      slug,
    },
  }));

  const invalidTokens = await sendExpoPushNotifications(messages);
  if (invalidTokens.length > 0) {
    await prisma.pushToken.deleteMany({
      where: { token: { in: invalidTokens } },
    });
  }
}
