"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  const id = typeof params?.id === "string" ? params.id : "";
  const [round, setRound] = useState<PlayRoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

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

  async function toggleStatus() {
    if (!round) return;
    const nextStatus = round.status === "completed" ? "in_progress" : "completed";
    setStatusSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/play-rounds/${round.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to update round");
        return;
      }
      setRound(data);
    } catch {
      setError("Failed to update round");
    } finally {
      setStatusSaving(false);
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-stone-900">{round.course}</h1>
              <p className="mt-1 text-sm text-stone-600">
                {new Date(round.createdAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {round.holeCount} holes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  round.status === "completed"
                    ? "bg-stone-100 text-stone-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {round.status === "completed" ? "Completed" : "In progress"}
              </span>
              <button
                type="button"
                onClick={toggleStatus}
                disabled={statusSaving}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {statusSaving
                  ? "Saving…"
                  : round.status === "completed"
                    ? "Reopen round"
                    : "Mark complete"}
              </button>
            </div>
          </div>

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
