import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listEmailTemplates } from "@/lib/email-templates";

/**
 * GET /api/email-templates — List editable email templates (admin only).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  try {
    const templates = await listEmailTemplates();
    return NextResponse.json(
      templates.map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        subject: t.subject,
        htmlBody: t.htmlBody,
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("GET /api/email-templates failed:", err);
    return NextResponse.json({ error: "Failed to load email templates" }, { status: 500 });
  }
}
