"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { EmailTemplatesAdminShell } from "@/components/EmailTemplatesAdminShell";

interface EmailTemplateSummary {
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  updatedAt: string;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || iso.startsWith("1970")) {
    return "Default template";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EmailTemplatesPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTemplates = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/email-templates");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load email templates");
        return;
      }
      setTemplates(data);
    } catch {
      setError("Failed to load email templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isAdmin) {
      setLoading(false);
      return;
    }
    loadTemplates();
  }, [status, session, isAdmin, loadTemplates]);

  return (
    <EmailTemplatesAdminShell loading={status === "loading" || (isAdmin && loading)}>
      <h1 className="font-serif text-3xl font-semibold text-stone-900">Email Templates</h1>
      <p className="mt-2 text-stone-600">
        Choose a template to edit its subject and message. The club layout is added automatically
        when emails are sent.
      </p>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="mt-8 divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {templates.map((template) => (
          <li key={template.slug}>
            <Link
              href={`/email-templates/${template.slug}`}
              className="flex flex-col gap-2 px-5 py-5 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">{template.name}</p>
                {template.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{template.description}</p>
                ) : null}
                <p className="mt-2 truncate text-xs text-stone-500">
                  Subject: {template.subject}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm text-stone-500">
                <span>Updated {formatUpdatedAt(template.updatedAt)}</span>
                <span className="font-medium text-emerald-600">Edit →</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </EmailTemplatesAdminShell>
  );
}
