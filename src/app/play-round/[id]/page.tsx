"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/AdminPageShell";
import {
  PlayRoundScorecard,
  type PlayRoundScorecardHole,
  type PlayRoundScorecardPlayer,
} from "@/components/PlayRoundScorecard";

interface PlayRoundDetail {
  id: string;
  slug: string;
  course: string;
  status: string;
  holeCount: number;
  createdAt: string;
  players: PlayRoundScorecardPlayer[];
  scorecard: PlayRoundScorecardHole[];
}

export default function PlayRoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [round, setRound] = useState<PlayRoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadRound = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const res = await fetch(`/api/play-rounds/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load play round");
        setRound(null);
        return;
      }
      setRound(data);
    } catch {
      setError("Failed to load play round");
      setRound(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  async function handleCancel() {
    if (!round) return;
    const confirmed = window.confirm(
      "Delete this play round? All scores will be permanently removed. This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/play-rounds/${round.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to delete round");
        return;
      }
      router.push("/play-round");
    } catch {
      setError("Failed to delete round");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminPageShell pageName="Play Round" loading={loading} maxWidthClass="max-w-6xl">
      <Link
        href="/play-round"
        className="text-sm font-medium text-stone-600 hover:text-emerald-600"
      >
        ← Back to Play Round
      </Link>

      {error && !round ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {round ? (
        <div className="mt-4 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="min-w-0 flex-1 font-serif text-2xl font-semibold text-stone-900">
                {round.course}
              </h1>
              <button
                type="button"
                onClick={handleCancel}
                disabled={deleting}
                className="shrink-0 pt-1 text-xs font-medium text-stone-500 hover:text-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Cancel"}
              </button>
            </div>
            <p className="mt-1 text-sm text-stone-600">
              {new Date(round.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              · {round.holeCount} holes
            </p>
          </div>

          {error && round ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <PlayRoundScorecard
            roundId={round.id}
            holes={round.scorecard}
            players={round.players}
            status={round.status}
            onRoundUpdate={(updated) => setRound(updated as PlayRoundDetail)}
          />
        </div>
      ) : null}
    </AdminPageShell>
  );
}
