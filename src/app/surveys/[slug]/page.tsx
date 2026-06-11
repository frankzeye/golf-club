"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface SurveyResponder {
  id: string;
  fullName: string;
  imageUrl: string | null;
}

interface SurveyOption {
  id: string;
  date: string | null;
  label?: string | null;
  imageUrl?: string | null;
  responseCount?: number;
  responders?: SurveyResponder[];
}

interface SurveyDetail {
  id: string;
  slug: string | null;
  type?: string;
  allowMultiple?: boolean;
  month: number | null;
  year: number | null;
  title: string;
  options: SurveyOption[];
  selectedOptionIds: string[];
  uniqueResponderCount?: number;
}

function dateBoundsForMonth(month: number, year: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    min: `${year}-${pad(month)}-01`,
    max: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function formatDateLabel(ymd: string) {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatChartAxisLabel(ymd: string) {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug as string;
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionImageUrl, setNewOptionImageUrl] = useState<string | null>(null);
  const [isUploadingOptionImage, setIsUploadingOptionImage] = useState(false);
  const [isAddingDate, setIsAddingDate] = useState(false);
  const [removingOptionId, setRemovingOptionId] = useState<string | null>(null);
  const [isDeletingSurvey, setIsDeletingSurvey] = useState(false);
  const [showSavedAck, setShowSavedAck] = useState(false);
  const savedRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedRedirectTimerRef.current) {
        clearTimeout(savedRedirectTimerRef.current);
        savedRedirectTimerRef.current = null;
      }
    };
  }, []);

  const loadSurvey = useCallback(() => {
    if (!slugParam) return;
    setError("");
    const pathSeg = encodeURIComponent(slugParam);
    fetch(`/api/surveys/${pathSeg}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: SurveyDetail) => {
        setSurvey(data);
        setSelected(new Set(data.selectedOptionIds ?? []));
        if (data.slug && slugParam === data.id && data.slug !== data.id) {
          router.replace(`/surveys/${data.slug}`);
        }
      })
      .catch(() => setError("Survey not found"))
      .finally(() => setIsLoading(false));
  }, [slugParam, router]);

  useEffect(() => {
    if (status === "loading" || !slugParam) return;
    setIsLoading(true);
    loadSurvey();
  }, [slugParam, status, loadSurvey]);

  const isMultipleChoice = survey?.type === "multiple_choice";
  const singleSelect = isMultipleChoice && survey?.allowMultiple === false;

  const toggleOption = (optionId: string) => {
    setSelected((prev) => {
      if (singleSelect) return new Set([optionId]);
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const handleSaveSelections = async () => {
    if (!survey || !session || !slugParam) return;
    setIsSaving(true);
    setError("");
    try {
      const pathSeg = encodeURIComponent(slugParam);
      const res = await fetch(`/api/surveys/${pathSeg}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      setSelected(new Set(data.selectedOptionIds ?? [...selected]));
      setShowSavedAck(true);
      if (savedRedirectTimerRef.current) clearTimeout(savedRedirectTimerRef.current);
      savedRedirectTimerRef.current = setTimeout(() => {
        savedRedirectTimerRef.current = null;
        router.push("/surveys");
      }, 1800);
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || !slugParam) return;
    const body = isMultipleChoice
      ? { label: newOptionLabel.trim(), imageUrl: newOptionImageUrl ?? undefined }
      : { date: newDate };
    if (isMultipleChoice ? !newOptionLabel.trim() && !newOptionImageUrl : !newDate) return;
    setIsAddingDate(true);
    setError("");
    try {
      const pathSeg = encodeURIComponent(slugParam);
      const res = await fetch(`/api/surveys/${pathSeg}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add option");
        return;
      }
      setNewDate("");
      setNewOptionLabel("");
      setNewOptionImageUrl(null);
      loadSurvey();
    } catch {
      setError("Failed to add option");
    } finally {
      setIsAddingDate(false);
    }
  };

  const handleUploadNewOptionImage = async (file: File) => {
    setIsUploadingOptionImage(true);
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
      setNewOptionImageUrl(data.imageUrl);
    } catch {
      setError("Failed to upload image");
    } finally {
      setIsUploadingOptionImage(false);
    }
  };

  const handleRemoveOption = async (optionId: string) => {
    const confirmMsg = isMultipleChoice
      ? "Remove this option from the survey?"
      : "Remove this date from the survey?";
    if (!survey || !slugParam || !confirm(confirmMsg)) return;
    setRemovingOptionId(optionId);
    setError("");
    try {
      const pathSeg = encodeURIComponent(slugParam);
      const res = await fetch(`/api/surveys/${pathSeg}/options/${optionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to remove");
        return;
      }
      loadSurvey();
    } catch {
      setError("Failed to remove");
    } finally {
      setRemovingOptionId(null);
    }
  };

  const handleDeleteSurvey = async () => {
    if (!survey || !slugParam || !confirm("Delete this entire survey? This cannot be undone.")) return;
    setIsDeletingSurvey(true);
    setError("");
    try {
      const pathSeg = encodeURIComponent(slugParam);
      const res = await fetch(`/api/surveys/${pathSeg}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete");
        return;
      }
      router.push("/surveys");
    } catch {
      setError("Failed to delete");
    } finally {
      setIsDeletingSurvey(false);
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
          <p className="text-stone-600">
            <Link href="/signin" className="font-medium text-emerald-600 hover:underline">
              Sign in
            </Link>{" "}
            to view this survey.
          </p>
        </main>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
          <p className="text-red-600">{error}</p>
          <Link href="/surveys" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline">
            ← Back to surveys
          </Link>
        </main>
      </div>
    );
  }

  if (!survey) return null;

  const bounds = dateBoundsForMonth(survey.month ?? 1, survey.year ?? 2000);
  const hasImageOptions =
    isMultipleChoice && survey.options.some((o) => o.imageUrl);
  const optionLabel = (o: SurveyOption) =>
    o.label ?? (o.date ? formatDateLabel(o.date) : "—");
  const optionAxisLabel = (o: SurveyOption) =>
    o.label ?? (o.date ? formatChartAxisLabel(o.date) : "—");
  const responseMax = Math.max(
    1,
    ...survey.options.map((o) => o.responseCount ?? 0)
  );
  const totalSelections = survey.options.reduce(
    (sum, o) => sum + (o.responseCount ?? 0),
    0
  );
  const uniqueResponders = survey.uniqueResponderCount ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <Link
          href="/surveys"
          className="text-sm font-medium text-stone-600 hover:text-emerald-600"
        >
          ← Surveys
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900">{survey.title}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {isMultipleChoice
                ? singleSelect
                  ? "Pick one option. You can change your answer anytime."
                  : "Select every option that applies. You can change your answers anytime."
                : "Select every date you can play. You can change your answers anytime."}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDeleteSurvey}
              disabled={isDeletingSurvey}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeletingSurvey ? "…" : "Delete survey"}
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {isAdmin && (
          <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">
              {isMultipleChoice ? "Add answer options" : "Add date options"}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {isMultipleChoice
                ? "Add another answer members can choose from — text, a thumbnail image, or both."
                : `Dates must fall in ${survey.month}/${survey.year}.`}
            </p>
            <form onSubmit={handleAddOption} className="mt-4 flex flex-wrap items-end gap-3">
              {isMultipleChoice ? (
                <>
                  {newOptionImageUrl ? (
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={newOptionImageUrl}
                        alt="New option"
                        className="h-12 w-12 rounded-lg border border-stone-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewOptionImageUrl(null)}
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
                        id="new-option-image"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadNewOptionImage(file);
                          e.target.value = "";
                        }}
                        disabled={isUploadingOptionImage}
                        className="hidden"
                      />
                      <label
                        htmlFor="new-option-image"
                        className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-stone-300 text-[10px] font-medium text-stone-500 hover:border-emerald-400 hover:text-emerald-600"
                      >
                        {isUploadingOptionImage ? "…" : "+ Img"}
                      </label>
                    </>
                  )}
                  <div className="min-w-[240px] flex-1">
                    <label className="block text-xs font-medium text-stone-600">Option</label>
                    <input
                      type="text"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      maxLength={200}
                      placeholder={newOptionImageUrl ? "Caption (optional)" : "New answer option"}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-stone-600">Date</label>
                  <input
                    type="date"
                    min={bounds.min}
                    max={bounds.max}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={
                  isAddingDate ||
                  isUploadingOptionImage ||
                  (isMultipleChoice ? !newOptionLabel.trim() && !newOptionImageUrl : !newDate)
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isAddingDate ? "Adding…" : isMultipleChoice ? "Add option" : "Add date"}
              </button>
            </form>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-900">
            {isMultipleChoice ? "Your answer" : "Your availability"}
          </h2>
          {survey.options.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">
              {isAdmin
                ? `Add ${isMultipleChoice ? "options" : "dates"} above so members can respond.`
                : `No ${isMultipleChoice ? "options" : "dates"} have been added yet. Check back later.`}
            </p>
          ) : hasImageOptions ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              {survey.options.map((o) => {
                const isSelected = selected.has(o.id);
                return (
                  <div key={o.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleOption(o.id)}
                      aria-pressed={isSelected}
                      className={`w-full overflow-hidden rounded-xl border-2 bg-stone-50 text-left transition-all ${
                        isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-200"
                          : "border-stone-200 hover:border-emerald-300"
                      }`}
                    >
                      {o.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={o.imageUrl}
                          alt={o.label || "Answer option"}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center px-3 text-center text-sm font-medium text-stone-900">
                          {optionLabel(o)}
                        </div>
                      )}
                      {o.label && o.imageUrl && (
                        <p className="px-3 py-2 text-sm font-medium text-stone-900">
                          {o.label}
                        </p>
                      )}
                    </button>
                    {isSelected && (
                      <span className="pointer-events-none absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow">
                        ✓
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(o.id)}
                        disabled={removingOptionId === o.id}
                        className="absolute right-2 top-2 rounded-md border border-stone-300 bg-white/90 px-2 py-1 text-xs font-medium text-stone-600 shadow-sm hover:bg-white disabled:opacity-50"
                      >
                        {removingOptionId === o.id ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {survey.options.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 bg-stone-50 px-4 py-3"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type={singleSelect ? "radio" : "checkbox"}
                      name={singleSelect ? "survey-answer" : undefined}
                      checked={selected.has(o.id)}
                      onChange={() => toggleOption(o.id)}
                      className={`h-4 w-4 shrink-0 border-stone-300 text-emerald-600 focus:ring-emerald-500 ${
                        singleSelect ? "" : "rounded"
                      }`}
                    />
                    {(o.label || o.date || !o.imageUrl) && (
                      <span className="text-sm font-medium text-stone-900">{optionLabel(o)}</span>
                    )}
                  </label>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(o.id)}
                      disabled={removingOptionId === o.id}
                      className="shrink-0 rounded border border-stone-300 px-2 py-1 text-xs font-medium text-stone-600 hover:bg-white disabled:opacity-50"
                    >
                      {removingOptionId === o.id ? "…" : "Remove"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {survey.options.length > 0 && (
            <button
              type="button"
              onClick={handleSaveSelections}
              disabled={isSaving || showSavedAck}
              className="mt-6 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : showSavedAck ? "Saved" : "Save my selections"}
            </button>
          )}
        </section>

        {survey.options.length > 0 && (
          <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-900">Responses so far</h2>
            <p className="mt-1 text-xs text-stone-500">
              {isMultipleChoice
                ? singleSelect
                  ? "Each bar is how many members picked that option."
                  : "Each bar is how many members selected that option (you can pick multiple)."
                : "Each bar is how many members selected that date (you can pick multiple dates)."}{" "}
              <span className="text-stone-600">
                {uniqueResponders} member{uniqueResponders === 1 ? "" : "s"} with at least one
                answer · {totalSelections} total selection{totalSelections === 1 ? "" : "s"}
              </span>
            </p>
            {totalSelections === 0 ? (
              <p className="mt-6 text-sm text-stone-500">No responses yet.</p>
            ) : (
              <div className="mt-6 space-y-3" role="img" aria-label="Survey responses by option">
                {survey.options.map((o) => {
                  const count = o.responseCount ?? 0;
                  const pct = Math.round((count / responseMax) * 100);
                  return (
                    <div key={o.id} className="grid gap-1.5 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:items-center">
                      <span className="flex items-center gap-2 text-xs font-medium text-stone-600 sm:justify-end sm:text-right">
                        {o.imageUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={o.imageUrl}
                            alt={o.label || "Answer option"}
                            className="h-12 w-12 shrink-0 rounded-md border border-stone-200 object-cover"
                          />
                        )}
                        {(o.label || o.date || !o.imageUrl) && optionAxisLabel(o)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-8 min-w-0 flex-1 overflow-hidden rounded-md bg-stone-100">
                            <div
                              className="h-full min-w-0 rounded-md bg-gradient-to-r from-emerald-500/90 to-emerald-600 transition-[width] duration-500 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-stone-800">
                            {count}
                          </span>
                        </div>
                        {isAdmin && (o.responders?.length ?? 0) > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {o.responders!.map((r) => (
                              <Link
                                key={r.id}
                                href={`/members/${r.id}`}
                                className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 py-0.5 pl-0.5 pr-2 text-xs font-medium text-stone-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                <AvatarWithSash
                                  imageUrl={r.imageUrl}
                                  alt={r.fullName}
                                  size="sm"
                                  fallback={r.fullName[0]?.toUpperCase() ?? "?"}
                                />
                                {r.fullName}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {showSavedAck && (
        <div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-stone-100/40 via-white/30 to-emerald-50/50 backdrop-blur-[3px]"
          aria-live="polite"
        >
          <p className="animate-[savedPulse_1.8s_ease-out_forwards] rounded-full border border-emerald-200/60 bg-white/75 px-10 py-3.5 font-serif text-xl font-medium tracking-wide text-emerald-900 shadow-[0_8px_32px_rgba(16,185,129,0.12)] ring-1 ring-white/80">
            Saved
          </p>
        </div>
      )}
      <style jsx global>{`
        @keyframes savedPulse {
          0% {
            opacity: 0;
            transform: scale(0.96) translateY(6px);
          }
          18% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0.92;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
