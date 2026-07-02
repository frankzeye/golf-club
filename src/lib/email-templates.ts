import { prisma } from "@/lib/db";
import {
  emailBulletList,
  emailButton,
  emailGreeting,
  emailMuted,
  emailParagraph,
  emailTitle,
} from "@/lib/email-layout";

export type EmailTemplateSlug = "password_reset" | "outing_invite";

export interface EmailTemplateRecord {
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  updatedAt: Date;
}

const PASSWORD_RESET_BODY = [
  emailTitle("Reset your password"),
  emailGreeting(),
  emailParagraph(
    "We received a request to reset the password for your <strong>Spencer's Crossing Golf Club</strong> account."
  ),
  emailParagraph(
    "Use the button below to choose a new password. This link expires in <strong>one hour</strong>."
  ),
  emailButton("{{resetUrl}}", "Set a new password"),
  emailMuted(
    "If you didn't request a password reset, you can safely ignore this email. Your password won't change unless you use the link above."
  ),
].join("\n");

const OUTING_INVITE_BODY = [
  emailTitle("You're invited to play"),
  emailGreeting("{{inviteeName}}"),
  emailParagraph(
    "<strong>{{organizerName}}</strong> invited you to a social round. Here are the details:"
  ),
  emailBulletList([
    "<strong>Course:</strong> {{course}}",
    "<strong>Date:</strong> {{date}}",
    "<strong>Organizer:</strong> {{organizerName}}",
  ]),
  emailButton("{{outingUrl}}", "View outing and respond"),
  emailMuted(
    "You can accept or decline the invite from the club website or mobile app."
  ),
].join("\n");

const DEFAULT_TEMPLATES: Record<
  EmailTemplateSlug,
  Omit<EmailTemplateRecord, "updatedAt"> & { updatedAt?: Date }
> = {
  password_reset: {
    slug: "password_reset",
    name: "Password reset",
    description:
      'Sent when a member requests a password reset. Use {{resetUrl}} for the link. Content appears inside the club email layout.',
    subject: "Reset your Spencer's Crossing Golf Club password",
    htmlBody: PASSWORD_RESET_BODY,
  },
  outing_invite: {
    slug: "outing_invite",
    name: "Outing invite",
    description:
      "Sent when a member is invited to a social round. Placeholders: {{inviteeName}}, {{organizerName}}, {{course}}, {{date}}, {{outingUrl}}. Content appears inside the club email layout.",
    subject: "{{organizerName}} invited you to play at {{course}}",
    htmlBody: OUTING_INVITE_BODY,
  },
};

export function renderEmailTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function getEmailTemplate(
  slug: EmailTemplateSlug
): Promise<EmailTemplateRecord> {
  const row = await prisma.emailTemplate.findUnique({ where: { slug } });
  if (row) {
    return {
      slug: row.slug,
      name: row.name,
      description: row.description,
      subject: row.subject,
      htmlBody: row.htmlBody,
      updatedAt: row.updatedAt,
    };
  }

  const fallback = DEFAULT_TEMPLATES[slug];
  return {
    ...fallback,
    updatedAt: new Date(0),
  };
}

export async function listEmailTemplates(): Promise<EmailTemplateRecord[]> {
  const rows = await prisma.emailTemplate.findMany({
    orderBy: { name: "asc" },
  });

  if (rows.length > 0) {
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      subject: row.subject,
      htmlBody: row.htmlBody,
      updatedAt: row.updatedAt,
    }));
  }

  return Object.values(DEFAULT_TEMPLATES).map((template) => ({
    ...template,
    updatedAt: new Date(0),
  }));
}

export function isKnownEmailTemplateSlug(slug: string): slug is EmailTemplateSlug {
  return slug in DEFAULT_TEMPLATES;
}

export function getDefaultEmailTemplateBody(slug: EmailTemplateSlug): string {
  return DEFAULT_TEMPLATES[slug].htmlBody;
}
