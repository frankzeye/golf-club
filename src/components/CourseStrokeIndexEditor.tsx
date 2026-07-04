"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface ScorecardHoleRow {
  hole: number;
  par: number;
  handicap?: number;
}

interface CourseStrokeIndexEditorProps {
  courseId: string;
  className?: string;
}

export function CourseStrokeIndexEditor({
  courseId,
  className = "",
}: CourseStrokeIndexEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState("");
  const [holes, setHoles] = useState<ScorecardHoleRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [hasBuiltinDefaults, setHasBuiltinDefaults] = useState(false);
  const [hasSavedOverrides, setHasSavedOverrides] = useState(false);

  const loadStrokeIndexes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/stroke-indexes`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load hole handicaps");
        return;
      }

      const scorecard = Array.isArray(data.scorecard) ? data.scorecard : [];
      setCourseName(typeof data.courseName === "string" ? data.courseName : "");
      setHoles(scorecard);
      setHasBuiltinDefaults(!!data.hasBuiltinDefaults);
      setHasSavedOverrides(!!data.hasSavedOverrides);
      setDrafts(
        Object.fromEntries(
          scorecard.map((hole: ScorecardHoleRow) => [
            hole.hole,
            hole.handicap != null ? String(hole.handicap) : "",
          ])
        )
      );
    } catch {
      setError("Failed to load hole handicaps");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadStrokeIndexes();
  }, [loadStrokeIndexes]);

  const isDirty = useMemo(() => {
    return holes.some((hole) => {
      const draft = drafts[hole.hole]?.trim() ?? "";
      const current = hole.handicap != null ? String(hole.handicap) : "";
      return draft !== current;
    });
  }, [drafts, holes]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const strokeIndexes: Record<string, number> = {};
      for (const hole of holes) {
        const raw = drafts[hole.hole]?.trim() ?? "";
        if (raw === "") {
          setError(`Enter a stroke index for hole ${hole.hole}`);
          setSaving(false);
          return;
        }
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1 || value > holes.length) {
          setError(`Hole ${hole.hole} stroke index must be 1–${holes.length}`);
          setSaving(false);
          return;
        }
        strokeIndexes[String(hole.hole)] = value;
      }

      const res = await fetch(`/api/courses/${courseId}/stroke-indexes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strokeIndexes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save hole handicaps");
        return;
      }

      const scorecard = Array.isArray(data.scorecard) ? data.scorecard : [];
      setHoles(scorecard);
      setHasSavedOverrides(true);
      setDrafts(
        Object.fromEntries(
          scorecard.map((hole: ScorecardHoleRow) => [
            hole.hole,
            hole.handicap != null ? String(hole.handicap) : "",
          ])
        )
      );
    } catch {
      setError("Failed to save hole handicaps");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={`rounded-xl border border-stone-200 bg-white p-4 ${className}`}>
        <p className="text-sm text-stone-500">Loading hole handicaps…</p>
      </div>
    );
  }

  if (holes.length === 0) {
    return (
      <div className={`rounded-xl border border-stone-200 bg-white p-4 ${className}`}>
        <p className="text-sm text-stone-500">
          No scorecard available for this course yet. Select the course from search results so
          we can load hole pars.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Course hole handicaps</h2>
          <p className="mt-1 text-sm text-stone-600">
            Stroke index for each hole (1 = hardest) used for net scoring and pop dots.
            {courseName ? ` ${courseName}.` : ""}
          </p>
          {hasSavedOverrides ? (
            <p className="mt-1 text-xs text-emerald-700">Saved for this course.</p>
          ) : hasBuiltinDefaults ? (
            <p className="mt-1 text-xs text-stone-500">
              Showing built-in defaults. Save to store custom values for this course.
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-700">
              OpenGolfAPI did not provide hole handicaps. Enter them here for net scoring.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save hole handicaps"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
              <th className="px-2 py-2">Hole</th>
              <th className="px-2 py-2">Par</th>
              <th className="px-2 py-2">Stroke index</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((hole) => (
              <tr key={hole.hole} className="border-b border-stone-100">
                <td className="px-2 py-2 font-medium text-stone-900">{hole.hole}</td>
                <td className="px-2 py-2 text-stone-700">{hole.par}</td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={1}
                    max={holes.length}
                    step={1}
                    inputMode="numeric"
                    aria-label={`Hole ${hole.hole} stroke index`}
                    className="w-20 rounded-md border border-stone-300 px-2 py-1 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={drafts[hole.hole] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [hole.hole]: e.target.value }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
