import {
  renderEmailTemplate,
  type EmailTemplateSlug,
} from "@/lib/email-templates";
import { wrapEmailLayout } from "@/lib/email-layout";

export const EMAIL_PREVIEW_SAMPLES: Record<EmailTemplateSlug, Record<string, string>> = {
  password_reset: {
    resetUrl: "https://example.com/reset-password?token=sample-token",
  },
  outing_invite: {
    inviteeName: "Alex",
    organizerName: "Frank B.",
    course: "The Golf Club at Rancho California",
    date: "Saturday, July 12, 2025",
    outingUrl: "https://example.com/social-rounds/sample-outing",
  },
};

function previewPreheader(slug: EmailTemplateSlug, vars: Record<string, string>): string {
  if (slug === "password_reset") {
    return "Reset your Spencer's Crossing Golf Club password.";
  }
  return `${vars.organizerName ?? "A club member"} invited you to play at ${vars.course ?? "a course"}.`;
}

/** Build a full HTML preview with sample placeholder values. */
export function buildEmailPreviewHtml(
  slug: EmailTemplateSlug,
  subject: string,
  htmlBody: string,
  baseUrl?: string
): { subject: string; html: string } {
  const vars = EMAIL_PREVIEW_SAMPLES[slug];
  const renderedSubject = renderEmailTemplate(subject, vars);
  const innerHtml = renderEmailTemplate(htmlBody, vars);
  const html = wrapEmailLayout(innerHtml, {
    preheader: previewPreheader(slug, vars),
    baseUrl,
  });
  return { subject: renderedSubject, html };
}
