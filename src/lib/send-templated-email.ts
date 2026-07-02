import { createResendClient } from "@/lib/resend";
import {
  getEmailTemplate,
  renderEmailTemplate,
  type EmailTemplateSlug,
} from "@/lib/email-templates";
import { isEmailConfigured, resolveEmailFromHeader } from "@/lib/email-from";
import { wrapEmailLayout } from "@/lib/email-layout";

function preheaderForTemplate(
  slug: EmailTemplateSlug,
  variables: Record<string, string>
): string | undefined {
  if (slug === "password_reset") {
    return "Reset your Spencer's Crossing Golf Club password.";
  }
  if (slug === "outing_invite") {
    const organizer = variables.organizerName ?? "A club member";
    const course = variables.course ?? "a course";
    return `${organizer} invited you to play at ${course}.`;
  }
  return undefined;
}

export async function sendTemplatedEmail(
  slug: EmailTemplateSlug,
  to: string,
  variables: Record<string, string>
): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(`Email skipped (${slug}): RESEND_API_KEY or EMAIL_FROM not configured`);
    return;
  }

  const template = await getEmailTemplate(slug);
  const innerHtml = renderEmailTemplate(template.htmlBody, variables);
  const subject = renderEmailTemplate(template.subject, variables);
  const html = wrapEmailLayout(innerHtml, {
    preheader: preheaderForTemplate(slug, variables),
  });
  const from = resolveEmailFromHeader();

  const resend = createResendClient();
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    const msg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
    throw new Error(msg || "Resend returned an error");
  }
}
