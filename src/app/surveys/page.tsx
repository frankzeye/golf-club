"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";

interface CreateOption {
  label: string;
  imageUrl: string | null;
}

interface SurveyRow {
  id: string;
  slug?: string;
  type?: string;
  month: number | null;
  year: number | null;
  title: string;
  optionCount: number;
  createdAt: string;
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function SurveysPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"" | "availability" | "multiple_choice">("");
  const [createMonth, setCreateMonth] = useState(() => new Date().getMonth() + 1);
  const [createYear, setCreateYear] = useState(() => new Date().getFullYear());
  const [createTitle, setCreateTitle] = useState("");
  const [createOptions, setCreateOptions] = useState<CreateOption[]>([
    { label: "", imageUrl: null },
    { label: "", imageUrl: null },
  ]);
  const [createAllowMultiple, setCreateAllowMultiple] = useState(false);
  const [uploadingOptionIdx, setUploadingOptionIdx] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const resetCreateForm = () => {
    setCreateType("");
    setCreateTitle("");
    setCreateOptions([
      { label: "", imageUrl: null },
      { label: "", imageUrl: null },
    ]);
    setCreateAllowMultiple(false);
  };

  const handleOptionImageUpload = async (idx: number, file: File) => {
    setUploadingOptionIdx(idx);
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/surveys/option-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to upload image");
        return;
      }
      setCreateOptions((prev) =>
        prev.map((o, i) => (i === idx ? { ...o, imageUrl: data.imageUrl } : o))
      );
    } catch {
      setError("Failed to upload image");
    } finally {
      setUploadingOptionIdx(null);
    }
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/surveys");
      let data: { surveys?: SurveyRow[]; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // non-JSON body (e.g. HTML error page)
      }
      if (!res.ok) {
        setSurveys([]);
        setError(
          typeof data.error === "string" && data.error
            ? data.error
            : `Could not load surveys (${res.status}).`
        );
        return;
      }
      setSurveys(Array.isArray(data.surveys) ? data.surveys : []);
    } catch {
      setError("Could not load surveys.");
      setSurveys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createType) return;
    const filledOptions = createOptions
      .map((o) => ({ label: o.label.trim(), imageUrl: o.imageUrl }))
      .filter((o) => o.label || o.imageUrl);
    if (createType === "multiple_choice") {
      if (!createTitle.trim()) {
        setError("Enter a question for the survey.");
        return;
      }
      if (filledOptions.length < 2) {
        setError("Add at least two answer options (text or image).");
        return;
      }
    }
    setIsCreating(true);
    setError("");
    try {
      const body =
        createType === "multiple_choice"
          ? {
              type: "multiple_choice",
              title: createTitle.trim(),
              options: filledOptions,
              allowMultiple: createAllowMultiple,
            }
          : { type: "availability", month: createMonth, year: createYear };
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create survey");
        return;
      }
      setShowCreate(false);
      resetCreateForm();
      if (data.slug) {
        router.push(`/surveys/${data.slug}`);
        return;
      }
      if (data.id) {
        router.push(`/surveys/${data.id}`);
        return;
      }
      load();
    } catch {
      setError("Failed to create survey");
    } finally {
      setIsCreating(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
          <h1 className="font-serif text-2xl font-semibold text-stone-900">Surveys</h1>
          <p className="mt-2 text-stone-600">
            <Link href="/signin" className="font-medium text-emerald-600 hover:underline">
              Sign in
            </Link>{" "}
            to view and complete club surveys.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900">Surveys</h1>
            <p className="mt-1 text-sm text-stone-600">
              Answer club surveys so we can plan tee times and events.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowCreate((v) => {
                  if (v) resetCreateForm();
                  return !v;
                });
              }}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              {showCreate ? "Cancel" : "New survey"}
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {showCreate && isAdmin && createType === "" && (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">
              What type of survey do you want to create?
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCreateType("availability")}
                className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <p className="font-medium text-stone-900">Availability survey</p>
                <p className="mt-1 text-xs text-stone-500">
                  Members pick which dates they can play in a given month.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setCreateType("multiple_choice")}
                className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <p className="font-medium text-stone-900">Multiple choice survey</p>
                <p className="mt-1 text-xs text-stone-500">
                  Ask a question and let members choose from your answer options.
                </p>
              </button>
            </div>
          </div>
        )}

        {showCreate && isAdmin && createType === "availability" && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setCreateType("")}
              className="text-xs font-medium text-stone-500 hover:text-emerald-600"
            >
              ← Change survey type
            </button>
            <h2 className="mt-3 text-sm font-semibold text-stone-900">Create availability survey</h2>
            <p className="mt-1 text-xs text-stone-500">
              Title will be &quot;Dates You Can Play in [Month] [Year]&quot;. You can add specific dates on the next
              screen.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600">Month</label>
                <select
                  value={createMonth}
                  onChange={(e) => setCreateMonth(Number(e.target.value))}
                  className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600">Year</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={createYear}
                  onChange={(e) => setCreateYear(Number(e.target.value))}
                  className="mt-1 w-28 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {showCreate && isAdmin && createType === "multiple_choice" && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setCreateType("")}
              className="text-xs font-medium text-stone-500 hover:text-emerald-600"
            >
              ← Change survey type
            </button>
            <h2 className="mt-3 text-sm font-semibold text-stone-900">Create multiple choice survey</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600">Question</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Which course should we play next month?"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600">Answer options</label>
                <p className="mt-0.5 text-xs text-stone-400">
                  Each option needs text, a thumbnail image, or both.
                </p>
                <div className="mt-2 space-y-2">
                  {createOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {opt.imageUrl ? (
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={opt.imageUrl}
                            alt={opt.label || `Option ${idx + 1}`}
                            className="h-12 w-12 rounded-lg border border-stone-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCreateOptions((prev) =>
                                prev.map((o, i) =>
                                  i === idx ? { ...o, imageUrl: null } : o
                                )
                              )
                            }
                            aria-label="Remove image"
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-700 text-[10px] leading-none text-white hover:bg-stone-900"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            id={`option-image-${idx}`}
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleOptionImageUpload(idx, file);
                              e.target.value = "";
                            }}
                            disabled={uploadingOptionIdx !== null}
                            className="hidden"
                          />
                          <label
                            htmlFor={`option-image-${idx}`}
                            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-stone-300 text-[10px] font-medium text-stone-500 hover:border-emerald-400 hover:text-emerald-600"
                          >
                            {uploadingOptionIdx === idx ? "…" : "+ Img"}
                          </label>
                        </>
                      )}
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) =>
                          setCreateOptions((prev) =>
                            prev.map((o, i) =>
                              i === idx ? { ...o, label: e.target.value } : o
                            )
                          )
                        }
                        maxLength={200}
                        placeholder={opt.imageUrl ? "Caption (optional)" : `Option ${idx + 1}`}
                        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {createOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCreateOptions((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="shrink-0 rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCreateOptions((prev) => [...prev, { label: "", imageUrl: null }])
                  }
                  className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  + Add option
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={createAllowMultiple}
                  onChange={(e) => setCreateAllowMultiple(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                Allow members to select multiple options
              </label>
              <button
                type="submit"
                disabled={isCreating || uploadingOptionIdx !== null}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        <ul className="mt-8 space-y-3">
          {surveys.length === 0 ? (
            <li className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500">
              No surveys yet.
              {isAdmin && " Create one to collect answers from members."}
            </li>
          ) : (
            surveys.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/surveys/${s.slug || s.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div>
                    <p className="font-medium text-stone-900">{s.title}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {s.type === "multiple_choice" ? "Multiple choice" : "Availability"} ·{" "}
                      {s.optionCount}{" "}
                      {s.type === "multiple_choice"
                        ? `option${s.optionCount === 1 ? "" : "s"}`
                        : `date${s.optionCount === 1 ? "" : "s"}`}{" "}
                      · Created{" "}
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">Open →</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </main>
    </div>
  );
}
