"use client";

import { useMemo } from "react";

import { buildEmailPreviewHtml } from "@/lib/email-preview";
import type { EmailTemplateSlug } from "@/lib/email-templates";

type EmailTemplatePreviewProps = {
  slug: EmailTemplateSlug;
  subject: string;
  htmlBody: string;
};

export function EmailTemplatePreview({ slug, subject, htmlBody }: EmailTemplatePreviewProps) {
  const preview = useMemo(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
    return buildEmailPreviewHtml(slug, subject, htmlBody, baseUrl);
  }, [slug, subject, htmlBody]);

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-100 p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-stone-900">Preview</h3>
        <p className="text-xs text-stone-500">
          Sample data is used for placeholders like{" "}
          <code className="rounded bg-white px-1 py-0.5 text-stone-600">{`{{course}}`}</code>
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-stone-200 bg-white px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Subject</p>
        <p className="mt-1 text-sm font-medium text-stone-900">{preview.subject}</p>
      </div>

      <iframe
        title="Email preview"
        srcDoc={preview.html}
        sandbox=""
        className="w-full rounded-lg border border-stone-200 bg-white"
        style={{ height: "640px" }}
      />
    </div>
  );
}
