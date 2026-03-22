"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import { AvatarWithSash } from "@/components/AvatarWithSash";

const SCORING_FORMATS = [
  "Stroke Play",
  "Stableford",
  "Best Ball",
  "Scramble",
  "Match Play",
  "Shamble",
  "Chapman",
  "Four Ball",
  "Modified Stableford",
  "Pinehurst (Chapman)",
  "Alternate Shot",
  "Other",
];

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
  winnerName?: string;
  result?: string;
}

interface Tournament {
  id: string;
  slug: string;
  name: string;
  date: string;
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    course: "",
    scoringFormat: "",
    individualOrTeam: "individual" as "individual" | "team",
    teamSize: "2" as "2" | "4",
    availableSpots: "32",
    greenFee: "",
    prizePool: "",
    clubDonation: "",
    paymentMethod: "" as "" | "venmo" | "cash",
    venmoUsername: "",
    prizes: [] as { name: string; amount: string }[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadTournaments = () => {
    fetch("/api/tournaments")
      .then((res) => res.json())
      .then((data) => {
        const fmt = (t: { date: string }) => ({
          ...t,
          date: t.date.split("T")[0],
        });
        setPast((data.past || []).map(fmt));
        setUpcoming((data.upcoming || []).map(fmt));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (status === "loading") return;
    loadTournaments();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          date: form.date,
          course: form.course.trim(),
          scoringFormat: form.scoringFormat,
          individualOrTeam: form.individualOrTeam,
          teamSize: form.individualOrTeam === "team" ? parseInt(form.teamSize, 10) : null,
          availableSpots: parseInt(form.availableSpots, 10),
          greenFee: parseFloat(form.greenFee) || 0,
          prizePool: parseFloat(form.prizePool) || 0,
          clubDonation: parseFloat(form.clubDonation) || 0,
          paymentMethod: form.paymentMethod || null,
          venmoUsername: form.paymentMethod === "venmo" ? form.venmoUsername : null,
          prizes: form.prizes
            .filter((p) => p.name.trim() && p.amount.trim())
            .map((p) => ({ name: p.name.trim(), amount: parseFloat(p.amount) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create tournament");
        return;
      }
      setForm({
        name: "",
        description: "",
        date: "",
        course: "",
        scoringFormat: "",
        individualOrTeam: "individual",
        teamSize: "2",
        availableSpots: "32",
        greenFee: "",
        prizePool: "",
        clubDonation: "",
        paymentMethod: "",
        venmoUsername: "",
        prizes: [],
      });
      setShowForm(false);
      loadTournaments();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {showForm ? "Cancel" : "Create Tournament"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {isAdmin && showForm && (
          <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-stone-900">New Tournament</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Spring Championship"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Short description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Course
                </label>
                <CourseAutocomplete
                  value={form.course}
                  onChange={(v) => setForm((p) => ({ ...p, course: v }))}
                  placeholder="Search California courses"
                  id="tournament-course"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Golf Scoring Format
                </label>
                <select
                  value={form.scoringFormat}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, scoringFormat: e.target.value }))
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select format</option>
                  {SCORING_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Individual or Team
                </label>
                <div className="mt-2 flex rounded-lg border border-stone-300 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, individualOrTeam: "individual" }))
                    }
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      form.individualOrTeam === "individual"
                        ? "bg-emerald-600 text-white"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, individualOrTeam: "team" }))
                    }
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      form.individualOrTeam === "team"
                        ? "bg-emerald-600 text-white"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    Team
                  </button>
                </div>
                {form.individualOrTeam === "team" && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-stone-600">
                      Team size
                    </label>
                    <div className="mt-1 flex gap-4">
                      {(["2", "4"] as const).map((size) => (
                        <label
                          key={size}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="radio"
                            name="teamSize"
                            value={size}
                            checked={form.teamSize === size}
                            onChange={() =>
                              setForm((p) => ({ ...p, teamSize: size }))
                            }
                            className="h-4 w-4 border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-stone-700">
                            {size} players
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Available Spots
                </label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={form.availableSpots}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, availableSpots: e.target.value }))
                  }
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700">
                    Green Fee ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.greenFee}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, greenFee: e.target.value }))
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">
                    Prize Pool ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.prizePool}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, prizePool: e.target.value }))
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">
                    Club Donation ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.clubDonation}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, clubDonation: e.target.value }))
                    }
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Payment Options
                </label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        paymentMethod: p.paymentMethod === "venmo" ? "" : "venmo",
                      }))
                    }
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      form.paymentMethod === "venmo"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    Venmo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        paymentMethod: p.paymentMethod === "cash" ? "" : "cash",
                      }))
                    }
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      form.paymentMethod === "cash"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    Cash
                  </button>
                </div>
                {form.paymentMethod === "venmo" && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-stone-700">
                      Venmo Username
                    </label>
                    <input
                      type="text"
                      value={form.venmoUsername}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, venmoUsername: e.target.value }))
                      }
                      placeholder="@username"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Prizes
                </label>
                <div className="mt-2 space-y-2">
                  {form.prizes.map((prize, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={prize.name}
                        onChange={(e) => {
                          const updated = [...form.prizes];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setForm((p) => ({ ...p, prizes: updated }));
                        }}
                        placeholder="Prize name (e.g., 1st Place)"
                        className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={prize.amount}
                        onChange={(e) => {
                          const updated = [...form.prizes];
                          updated[idx] = { ...updated[idx], amount: e.target.value };
                          setForm((p) => ({ ...p, prizes: updated }));
                        }}
                        placeholder="Amount"
                        className="w-28 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.prizes.filter((_, i) => i !== idx);
                          setForm((p) => ({ ...p, prizes: updated }));
                        }}
                        className="rounded-lg border border-stone-300 px-3 py-2.5 text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        prizes: [...p.prizes, { name: "", amount: "" }],
                      }))
                    }
                    className="rounded-lg border border-dashed border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-400 hover:text-stone-700"
                  >
                    + Add Prize
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create Tournament"}
              </button>
            </form>
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
                        <p className="mt-3 text-sm text-stone-500">{formatDate(t.date)}</p>
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
                        <p className="mt-3 text-sm text-stone-500">{formatDate(t.date)}</p>
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
