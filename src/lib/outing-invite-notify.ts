import { prisma } from "@/lib/db";
import { escapeHtml, escapeHtmlAttr } from "@/lib/email-from";
import { sendExpoPushNotifications } from "@/lib/expo-push";
import { outingSlug } from "@/lib/outing-slug";
import { sendTemplatedEmail } from "@/lib/send-templated-email";
import { getSiteBaseUrl } from "@/lib/site-url";

function formatInviteDate(date: Date | null | undefined): string {
  if (!date) return "Date TBD";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
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

async function sendOutingInvitePush(
  inviteeUserIds: string[],
  outing: OutingForNotify,
  organizerName: string
): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: inviteeUserIds } },
    select: { token: true, userId: true },
  });

  if (tokens.length === 0) {
    console.info(
      `Outing invite push skipped: no push tokens for ${inviteeUserIds.length} invitee(s)`
    );
    return;
  }

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

async function sendOutingInviteEmails(
  inviteeUserIds: string[],
  outing: OutingForNotify,
  organizerName: string
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { id: { in: inviteeUserIds } },
    select: { id: true, email: true, firstName: true },
  });

  if (users.length === 0) return;

  const slug = outing.slug ?? outingSlug(outing.course, outing.createdAt);
  const outingUrl = `${getSiteBaseUrl()}/social-rounds/${encodeURIComponent(slug)}`;
  const organizer = organizerName.trim() || "A club member";
  const dateLabel = formatInviteDate(outing.date);

  const variables = {
    organizerName: escapeHtml(organizer),
    course: escapeHtml(outing.course),
    date: escapeHtml(dateLabel),
    outingUrl: escapeHtmlAttr(outingUrl),
  };

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const inviteeName = escapeHtml(user.firstName.trim() || "there");
      await sendTemplatedEmail("outing_invite", user.email, {
        ...variables,
        inviteeName,
      });
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Outing invite email failed:", result.reason);
    }
  }
}

/**
 * Notify invitees via push and email. Failures are logged but do not block the invite API.
 */
export async function notifyOutingInvites(
  inviteeUserIds: string[],
  outing: OutingForNotify,
  organizerName: string
): Promise<void> {
  const uniqueIds = [...new Set(inviteeUserIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const results = await Promise.allSettled([
    sendOutingInvitePush(uniqueIds, outing, organizerName),
    sendOutingInviteEmails(uniqueIds, outing, organizerName),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Outing invite notification failed:", result.reason);
    }
  }
}
