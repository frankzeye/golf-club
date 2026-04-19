"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";

interface SurveyRow {
  id: string;
  month: number;
  year: number;
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
  const [createMonth, setCreateMonth] = useState(() => new Date().getMonth() + 1);
  const [createYear, setCreateYear] = useState(() => new Date().getFullYear());
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(() => {
    setError("");
    fetch("/api/surveys")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load surveys");
        return res.json();
      })
      .then((data) => {
        setSurveys(Array.isArray(data.surveys) ? data.surveys : []);
      })
      .catch(() => {
        setError("Could not load surveys.");
        setSurveys([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: createMonth, year: createYear }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create survey");
        return;
      }
      setShowCreate(false);
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
              Share which dates you can play so we can plan tee times and events.
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              {showCreate ? "Cancel" : "New survey"}
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {showCreate && isAdmin && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-stone-900">Create availability survey</h2>
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

        <ul className="mt-8 space-y-3">
          {surveys.length === 0 ? (
            <li className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500">
              No surveys yet.
              {isAdmin && " Create one to collect dates from members."}
            </li>
          ) : (
            surveys.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/surveys/${s.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div>
                    <p className="font-medium text-stone-900">{s.title}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {s.optionCount} date{s.optionCount === 1 ? "" : "s"} · Created{" "}
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
