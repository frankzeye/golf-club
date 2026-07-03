"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageShell } from "@/components/AdminPageShell";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface PlayerSummary {
  id: string;
  fullName: string;
  imageUrl: string | null;
  total: number;
  holesPlayed: number;
}

interface PlayRoundSummary {
  id: string;
  slug: string;
  course: string;
  status: string;
  createdAt: string;
  holeCount: number;
  players: PlayerSummary[];
}

function formatCreatedAt(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function PlayRoundCard({ round }: { round: PlayRoundSummary }) {
  return (
    <Link
      href={`/play-round/${round.slug}`}
      className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-stone-900">{round.course}</h3>
          <p className="mt-1 text-sm text-stone-600">
            {formatCreatedAt(round.createdAt)} · {round.players.length} player
            {round.players.length === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            round.status === "completed"
              ? "bg-stone-100 text-stone-600"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {round.status === "completed" ? "Completed" : "In progress"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {round.players.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white"
              >
                <AvatarWithSash
                  imageUrl={p.imageUrl}
                  alt={p.fullName}
                  fill
                  fallback={p.fullName[0]?.toUpperCase() ?? "?"}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-600">
            {round.players.map((p) => p.fullName).join(", ")}
          </p>
        </div>
        {round.players.some((p) => p.total > 0) ? (
          <p className="text-sm font-medium text-stone-700">
            Leader:{" "}
            {[...round.players].sort((a, b) => (a.total || 999) - (b.total || 999))[0]?.fullName}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default function PlayRoundPage() {
  const [rounds, setRounds] = useState<PlayRoundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRounds = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/play-rounds");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load play rounds");
        setRounds([]);
        return;
      }
      setRounds(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load play rounds");
      setRounds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  return (
    <AdminPageShell pageName="Play Round" loading={loading}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-stone-900">Play Round</h1>
          <p className="mt-1 text-sm text-stone-600">
            Start a round, load the course scorecard, and enter scores hole by hole as you play.
          </p>
        </div>
        <Link
          href="/play-round/create"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          New Round
        </Link>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && rounds.length === 0 && !error ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-stone-600">No play rounds yet.</p>
          <Link
            href="/play-round/create"
            className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Start your first round →
          </Link>
        </div>
      ) : null}

      {rounds.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {rounds.map((round) => (
            <PlayRoundCard key={round.id} round={round} />
          ))}
        </div>
      ) : null}
    </AdminPageShell>
  );
}
