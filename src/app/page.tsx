"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";

interface Tournament {
  id: string;
  slug: string;
  name: string;
  date: string;
  course: string;
  registeredCount: number;
  availableSpots: number;
}

const FEATURES = [
  {
    href: "/tournaments",
    title: "Tournaments",
    description:
      "Browse upcoming events, register your spot, and see results from past competitions.",
    icon: TrophyIcon,
    public: true,
  },
  {
    href: "/tee-times",
    title: "Tee Times",
    description:
      "Search tee times across Southern California courses and book your next round.",
    icon: ClockIcon,
    public: false,
  },
  {
    href: "/surveys",
    title: "Surveys",
    description:
      "Vote on availability dates and club decisions so we can plan together.",
    icon: PollIcon,
    public: false,
  },
  {
    href: "/members",
    title: "Members",
    description:
      "Meet the club — handicaps, home courses, and profiles for every member.",
    icon: MembersIcon,
    public: false,
  },
] as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const { data: session, status } = useSession();
  const [upcoming, setUpcoming] = useState<Tournament[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((res) => (res.ok ? res.json() : { upcoming: [] }))
      .then((data) => {
        const list = Array.isArray(data?.upcoming) ? data.upcoming : [];
        setUpcoming(
          list.slice(0, 3).map((t: { date?: string; [key: string]: unknown }) => ({
            ...t,
            date: typeof t.date === "string" ? t.date.split("T")[0] : "",
          }))
        );
      })
      .catch(() => setUpcoming([]))
      .finally(() => setIsLoadingTournaments(false));
  }, []);

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Riverside County&apos;s favorite golf social club
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Spencer&apos;s Crossing
            </h1>
            <p className="mt-1 font-serif text-3xl text-stone-500 sm:text-4xl">
              Golf Club
            </p>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              Limited size monthly tournaments all over Riverside County.
              Where friends are made and personal records set.
            </p>

            {status === "loading" ? (
              <div className="mt-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : session ? (
              <div className="mt-8">
                <p className="text-sm font-medium text-emerald-700">
                  Welcome back{firstName ? `, ${firstName}` : ""}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/tournaments"
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    View Tournaments
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  >
                    My Profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex justify-center">
                <Link
                  href="/tournaments"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Browse tournaments →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Feature cards */}
        <section className="mx-auto max-w-4xl px-4 py-12">
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const needsAuth = !feature.public && !session;
              const href = needsAuth
                ? `/signin?callbackUrl=${encodeURIComponent(feature.href)}`
                : feature.href;

              return (
                <Link
                  key={feature.href}
                  href={href}
                  className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-colors hover:border-stone-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-900">
                        {feature.title}
                        {needsAuth && (
                          <span className="ml-2 text-xs font-normal text-stone-400">
                            Sign in required
                          </span>
                        )}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-stone-500">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Upcoming tournaments */}
        <section className="border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-semibold text-stone-900">
                  Upcoming tournaments
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {session
                    ? "Register before spots fill up."
                    : "Anyone can browse — sign in to register."}
                </p>
              </div>
              <Link
                href="/tournaments"
                className="shrink-0 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View all
              </Link>
            </div>

            {isLoadingTournaments ? (
              <div className="mt-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : upcoming.length === 0 ? (
              <p className="mt-8 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-6 py-10 text-center text-sm text-stone-500">
                No upcoming tournaments yet. Check back soon.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {upcoming.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tournaments/${t.slug ?? t.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 transition-colors hover:border-stone-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">
                        {t.name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-stone-600">
                        {t.course}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-stone-700">
                        {formatDate(t.date)}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {t.registeredCount} / {t.availableSpots} spots
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52M6.75 15.75H4.875c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H6.75m9.75-3.75h1.875c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H16.5"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PollIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function MembersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}
