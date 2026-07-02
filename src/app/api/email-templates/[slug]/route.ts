import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizeEmailTemplateFonts } from "@/lib/email-layout";
import {
  getEmailTemplate,
  isKnownEmailTemplateSlug,
  type EmailTemplateSlug,
} from "@/lib/email-templates";

/**
 * GET /api/email-templates/[slug] — Get one email template (admin only).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { slug } = await params;
  if (!isKnownEmailTemplateSlug(slug)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    const template = await getEmailTemplate(slug);
    return NextResponse.json({
      slug: template.slug,
      name: template.name,
      description: template.description,
      subject: template.subject,
      htmlBody: normalizeEmailTemplateFonts(template.htmlBody),
      updatedAt: template.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("GET /api/email-templates/[slug] failed:", err);
    return NextResponse.json({ error: "Failed to load email template" }, { status: 500 });
  }
}

/**
 * PATCH /api/email-templates/[slug] — Update an email template (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const { slug } = await params;
  if (!isKnownEmailTemplateSlug(slug)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const htmlBody = normalizeEmailTemplateFonts(
      typeof body.htmlBody === "string" ? body.htmlBody.trim() : ""
    );

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!htmlBody) {
      return NextResponse.json({ error: "Email body is required" }, { status: 400 });
    }

    const existing = await getEmailTemplate(slug as EmailTemplateSlug);

    const updated = await prisma.emailTemplate.upsert({
      where: { slug },
      create: {
        slug,
        name: existing.name,
        description: existing.description,
        subject,
        htmlBody,
      },
      update: {
        subject,
        htmlBody,
      },
    });

    return NextResponse.json({
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      subject: updated.subject,
      htmlBody: updated.htmlBody,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("PATCH /api/email-templates/[slug] failed:", err);
    return NextResponse.json({ error: "Failed to update email template" }, { status: 500 });
  }
}
