"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { formatStartTime } from "@/lib/tournament-time";
import { AvatarWithSash } from "@/components/AvatarWithSash";

interface RegisteredUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl: string | null;
  scgaOfficial?: boolean;
}

interface Prize {
  name: string;
  amount: number;
  winnerId?: string;
  winnerIds?: string[];
  winnerName?: string;
  result?: string;
}

interface Tournament {
  id: string;
  slug: string;
  name: string;
  date: string;
  startTime: string | null;
  course: string;
  scoringFormat: string;
  individualOrTeam: string;
  teamSize: number | null;
  availableSpots: number;
  greenFee: number;
  prizePool: number;
  clubDonation: number;
  registeredCount: number;
  isRegistered: boolean;
  registeredUsers: RegisteredUser[];
  prizes?: Prize[];
}

export default function TournamentsPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [past, setPast] = useState<Tournament[]>([]);
  const [upcoming, setUpcoming] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadTournaments = () => {
    setLoadError("");
    fetch("/api/tournaments")
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .catch(() => ({}))
            .then((err) => {
              throw new Error(
                (err as { error?: string })?.error ||
                  `Failed to load tournaments (${res.status})`
              );
            });
        }
        return res.json();
      })
      .then((data) => {
        const fmt = (t: { date?: string | null; [key: string]: unknown }) => {
          const dateStr =
            typeof t.date === "string" ? t.date.split("T")[0] : "";
          return { ...t, date: dateStr };
        };
        const pastList = Array.isArray(data?.past) ? data.past : [];
        const upcomingList = Array.isArray(data?.upcoming) ? data.upcoming : [];
        setPast(pastList.map(fmt));
        setUpcoming(upcomingList.map(fmt));
      })
      .catch((err) => {
        setLoadError(err?.message ?? "Failed to load tournaments");
        setPast([]);
        setUpcoming([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (status === "loading") return;
    loadTournaments();
  }, [status]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const formatDateWithTime = (dateStr: string, startTime?: string | null) => {
    const d = new Date(dateStr + "T12:00:00");
    const datePart = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = formatStartTime(startTime);
    return timePart ? `${datePart} · ${timePart}` : datePart;
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

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900">
              Tournaments
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Past and upcoming club tournaments
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/tournaments/create"
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Create Tournament
            </Link>
          )}
        </div>

        {loadError && (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError("");
                setIsLoading(true);
                loadTournaments();
              }}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-10 space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-stone-900">
                Upcoming
              </h2>
              <div className="mt-4 space-y-3">
                {upcoming.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.slug ?? t.id}`}
                    className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-stone-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-row items-start justify-between gap-4">
                          <h3 className="text-xl font-semibold text-stone-900">{t.name}</h3>
                          <span className="hidden shrink-0 items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-sm font-medium text-stone-700 sm:inline-flex">
                            {t.registeredCount} / {t.availableSpots} spots
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-stone-700">{t.course}</p>
                        <p className="mt-3 text-sm text-stone-500">{formatDateWithTime(t.date, t.startTime)}</p>
                        <p className="mt-2 text-sm text-stone-500">
                          {t.scoringFormat}
                          {t.individualOrTeam === "team" && t.teamSize
                            ? ` · ${t.teamSize}-person teams`
                            : " · Individual"}
                        </p>
                        {((t.greenFee ?? 0) + (t.prizePool ?? 0) + (t.clubDonation ?? 0)) > 0 && (
                          <p className="mt-2 text-sm font-medium text-emerald-700">
                            {formatCurrency((t.greenFee ?? 0) + (t.prizePool ?? 0) + (t.clubDonation ?? 0))} buy-in
                          </p>
                        )}
                        <p className="mt-2 text-sm sm:hidden">
                          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
                            {t.registeredCount} / {t.availableSpots} spots
                          </span>
                        </p>
                        {(t.registeredUsers ?? []).length > 0 && (
                          <div className="mt-4 flex -space-x-2" title={(t.registeredUsers ?? []).map((u) => u.fullName).join(", ")}>
                            {(t.registeredUsers ?? []).map((u) => (
                              <AvatarWithSash
                                key={u.id}
                                imageUrl={u.imageUrl}
                                alt={u.fullName}
                                size="sm"
                                fallback={u.firstName ? u.firstName[0].toUpperCase() : "?"}
                                className="h-7 w-7 border-2 border-white ring-2 ring-stone-200"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-stone-900">
              Past
            </h2>
            {past.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">
                No past tournaments yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {past.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.slug ?? t.id}`}
                    className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-stone-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-row items-start justify-between gap-4">
                          <h3 className="text-xl font-semibold text-stone-900">{t.name}</h3>
                          <span className="hidden shrink-0 items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-sm font-medium text-stone-700 sm:inline-flex">
                            {t.registeredCount} / {t.availableSpots} spots
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-stone-700">{t.course}</p>
                        <p className="mt-3 text-sm text-stone-500">{formatDateWithTime(t.date, t.startTime)}</p>
                        <p className="mt-2 text-sm text-stone-500">
                          {t.scoringFormat}
                          {t.individualOrTeam === "team" && t.teamSize
                            ? ` · ${t.teamSize}-person teams`
                            : " · Individual"}
                        </p>
                        {(t.prizes ?? []).length > 0 && (t.prizes ?? []).some((p) => p.winnerName) && (
                          <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 bg-white">
                            <div className="border-b border-stone-200 bg-stone-50 px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Winners</p>
                            </div>
                            <ul className="divide-y divide-stone-100">
                              {(t.prizes ?? []).filter((p) => p.winnerName).map((p, idx) => (
                                <li key={idx} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                                  <span className="font-medium text-stone-900">{p.name}</span>
                                  <span className="text-stone-900">{p.winnerName}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="mt-2 text-sm sm:hidden">
                          <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
                            {t.registeredCount} / {t.availableSpots} spots
                          </span>
                        </p>
                        {(t.registeredUsers ?? []).length > 0 && (
                          <div className="mt-4 flex -space-x-2" title={(t.registeredUsers ?? []).map((u) => u.fullName).join(", ")}>
                            {(t.registeredUsers ?? []).map((u) => (
                              <AvatarWithSash
                                key={u.id}
                                imageUrl={u.imageUrl}
                                alt={u.fullName}
                                size="sm"
                                fallback={u.firstName ? u.firstName[0].toUpperCase() : "?"}
                                className="h-7 w-7 border-2 border-white ring-2 ring-stone-200"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
