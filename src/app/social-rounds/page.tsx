"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AccessDenied } from "@/components/AccessDenied";
import { AvatarWithSash } from "@/components/AvatarWithSash";
import { formatStartTime } from "@/lib/tournament-time";
import { formatTimeOfDay } from "@/lib/outing-slug";

interface Participant {
  id: string;
  fullName: string;
  imageUrl: string | null;
  status?: string;
}

interface Outing {
  id: string;
  slug: string;
  playerCount: number;
  course: string;
  hasBookedTime: boolean;
  date: string | null;
  startTime: string | null;
  timeOfDay: string | null;
  hasWager: boolean;
  wagerDetails: string | null;
  participantCount: number;
  isParticipant: boolean;
  isCreator: boolean;
  participants: Participant[];
  creator: Participant;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Date TBD";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatSchedule(outing: Outing) {
  if (outing.hasBookedTime && outing.startTime) {
    const time = formatStartTime(outing.startTime);
    return `${formatDate(outing.date)} · ${time ?? outing.startTime}`;
  }
  const parts: string[] = [];
  if (outing.date) parts.push(formatDate(outing.date));
  else parts.push("Date TBD");
  if (outing.timeOfDay) parts.push(formatTimeOfDay(outing.timeOfDay) ?? outing.timeOfDay);
  return parts.join(" · ");
}

function OutingCard({ outing }: { outing: Outing }) {
  const spotsLeft = outing.playerCount - outing.participantCount;
  const isFull = spotsLeft <= 0;
  const confirmedPlayers = outing.participants.filter((p) => p.status === "confirmed");

  return (
    <Link
      href={`/social-rounds/${outing.slug}`}
      className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg font-semibold text-stone-900">
            {formatSchedule(outing)}
          </h3>
          <p className="mt-1 text-sm text-stone-600">{outing.course}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            isFull
              ? "bg-stone-100 text-stone-600"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          <span className="text-xs text-stone-500">
            {outing.participantCount}/{outing.playerCount} players
          </span>
        </div>
        {outing.hasWager && (
          <span className="text-xs font-medium text-amber-700">Wager</span>
        )}
      </div>

      <p className="mt-2 text-xs text-stone-500">
        Organized by {outing.creator.fullName}
        {outing.isParticipant && " · You're in"}
      </p>
    </Link>
  );
}

export default function SocialRoundPage() {
  const { status } = useSession();
  const [open, setOpen] = useState<Outing[]>([]);
  const [full, setFull] = useState<Outing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/social-rounds")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load outings");
        return res.json();
      })
      .then((data) => {
        setOpen(Array.isArray(data.open) ? data.open : []);
        setFull(Array.isArray(data.full) ? data.full : []);
      })
      .catch((err) => {
        setLoadError(err?.message ?? "Failed to load outings");
        setOpen([]);
        setFull([]);
      })
      .finally(() => setIsLoading(false));
  }, [status]);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AccessDenied pageName="Social Rounds" />;
  }

  const hasOutings = open.length > 0 || full.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900">
              Social Rounds
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Browse outings posted by club members
            </p>
          </div>
          <Link
            href="/social-rounds/create"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create Outing
          </Link>
        </div>

        {loadError && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        )}

        {!loadError && !hasOutings && (
          <div className="mt-10 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <p className="text-stone-600">No outings yet.</p>
            <p className="mt-1 text-sm text-stone-500">
              Be the first to create one and invite members to play.
            </p>
            <Link
              href="/social-rounds/create"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Create Outing
            </Link>
          </div>
        )}

        {open.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
              Open outings
            </h2>
            <div className="mt-3 space-y-3">
              {open.map((o) => (
                <OutingCard key={o.id} outing={o} />
              ))}
            </div>
          </section>
        )}

        {full.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
              Full outings
            </h2>
            <div className="mt-3 space-y-3">
              {full.map((o) => (
                <OutingCard key={o.id} outing={o} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
