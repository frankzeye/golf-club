"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { EmailTemplatePreview } from "@/components/EmailTemplatePreview";
import { EmailTemplatesAdminShell } from "@/components/EmailTemplatesAdminShell";
import { isKnownEmailTemplateSlug, type EmailTemplateSlug } from "@/lib/email-templates";

interface EmailTemplateDetail {
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
  updatedAt: string;
}

export default function EmailTemplateEditPage() {
  const params = useParams();
  const slugParam = typeof params?.slug === "string" ? params.slug : "";
  const slug = isKnownEmailTemplateSlug(slugParam) ? slugParam : null;

  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [template, setTemplate] = useState<EmailTemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadTemplate = useCallback(async () => {
    if (!slug) return;
    setError("");
    try {
      const res = await fetch(`/api/email-templates/${slug}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load email template");
        setTemplate(null);
        return;
      }
      setTemplate(data);
    } catch {
      setError("Failed to load email template");
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isAdmin) {
      setLoading(false);
      return;
    }
    if (!slug) {
      setLoading(false);
      return;
    }
    loadTemplate();
  }, [status, session, isAdmin, slug, loadTemplate]);

  async function saveTemplate() {
    if (!template || !slug) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/email-templates/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: template.subject,
          htmlBody: template.htmlBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save template");
        return;
      }
      setTemplate(data);
      setSaved(true);
    } catch {
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  if (!slug) {
    return (
      <EmailTemplatesAdminShell>
        <p className="text-stone-600">Template not found.</p>
        <Link
          href="/email-templates"
          className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Email Templates
        </Link>
      </EmailTemplatesAdminShell>
    );
  }

  return (
    <EmailTemplatesAdminShell loading={status === "loading" || (isAdmin && loading)}>
      {error && !template ? (
        <>
          <p className="text-stone-600">{error}</p>
          <Link
            href="/email-templates"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Email Templates
          </Link>
        </>
      ) : template ? (
        <>
          <Link
            href="/email-templates"
            className="text-sm font-medium text-stone-500 hover:text-emerald-600"
          >
            ← Email Templates
          </Link>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl font-semibold text-stone-900">{template.name}</h1>
              {template.description ? (
                <p className="mt-2 text-sm text-stone-600">{template.description}</p>
              ) : null}
            </div>
            {saved ? <span className="text-sm font-medium text-emerald-700">Saved</span> : null}
          </div>

          {error ? (
            <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="subject"
                  className="block text-xs font-medium uppercase tracking-wide text-stone-500"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={template.subject}
                  onChange={(e) => {
                    setSaved(false);
                    setTemplate({ ...template, subject: e.target.value });
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="htmlBody"
                  className="block text-xs font-medium uppercase tracking-wide text-stone-500"
                >
                  HTML body
                </label>
                <textarea
                  id="htmlBody"
                  value={template.htmlBody}
                  onChange={(e) => {
                    setSaved(false);
                    setTemplate({ ...template, htmlBody: e.target.value });
                  }}
                  rows={14}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={saveTemplate}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save template"}
              </button>
            </div>
          </section>

          <div className="mt-8">
            <EmailTemplatePreview
              slug={slug as EmailTemplateSlug}
              subject={template.subject}
              htmlBody={template.htmlBody}
            />
          </div>
        </>
      ) : null}
    </EmailTemplatesAdminShell>
  );
}
