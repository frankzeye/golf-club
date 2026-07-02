"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageShell } from "@/components/AdminPageShell";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface Participant {
  id: string;
  fullName: string;
  imageUrl: string | null;
  status?: string;
}

interface PlayRound {
  id: string;
  slug: string;
  course: string;
  playerCount: number;
  participantCount: number;
  createdAt: string;
  participants: Participant[];
}

function formatCreatedAt(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function PlayRoundCard({ round }: { round: PlayRound }) {
  const confirmedPlayers = round.participants.filter((p) => p.status === "confirmed");

  return (
    <Link
      href={`/social-rounds/${round.slug}`}
      className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-stone-900">{round.course}</h3>
          <p className="mt-1 text-sm text-stone-600">
            {formatCreatedAt(round.createdAt)} · {confirmedPlayers.length} player
            {confirmedPlayers.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex -space-x-2">
          {confirmedPlayers.slice(0, 4).map((p) => (
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
          {confirmedPlayers.map((p) => p.fullName).join(", ")}
        </p>
      </div>
    </Link>
  );
}

export default function PlayRoundPage() {
  const [rounds, setRounds] = useState<PlayRound[]>([]);
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
            Set up a round by choosing a course and who you&apos;re playing with.
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
            Create your first round →
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
