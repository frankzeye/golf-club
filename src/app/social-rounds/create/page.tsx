"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AccessDenied } from "@/components/AccessDenied";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import { MemberInvitePicker, type MemberInviteOption } from "@/components/MemberInvitePicker";

const STEPS = [
  "Players",
  "Course",
  "Tee Time",
  "Invites",
  "Wager",
] as const;

const PRESET_PLAYER_COUNTS = [4, 8] as const;
const MIN_PLAYER_COUNT = 2;
const MAX_PLAYER_COUNT = 99;
const TIME_OF_DAY_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Mid day" },
  { value: "afternoon", label: "Afternoon" },
] as const;

const inputClass =
  "w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default function CreateOutingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [members, setMembers] = useState<MemberInviteOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [playerPreset, setPlayerPreset] = useState<4 | 8 | "custom" | null>(null);
  const [customPlayerCount, setCustomPlayerCount] = useState("");
  const [course, setCourse] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [hasBookedTime, setHasBookedTime] = useState<boolean | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [invitedMembers, setInvitedMembers] = useState<MemberInviteOption[]>([]);
  const [hasWager, setHasWager] = useState<boolean | null>(null);
  const [wagerDetails, setWagerDetails] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/members")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setMembers(
          list.map((m: { id: string; fullName: string; imageUrl?: string | null; isFavorite?: boolean }) => ({
            id: m.id,
            fullName: m.fullName,
            imageUrl: m.imageUrl ?? null,
            isFavorite: m.isFavorite ?? false,
          }))
        );
      })
      .catch(() => setMembers([]));
  }, [status]);

  if (status === "loading") {
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

  const resolvedPlayerCount = (): number | null => {
    if (playerPreset === 4 || playerPreset === 8) return playerPreset;
    if (playerPreset === "custom") {
      const n = parseInt(customPlayerCount, 10);
      if (Number.isInteger(n) && n >= MIN_PLAYER_COUNT && n <= MAX_PLAYER_COUNT) {
        return n;
      }
    }
    return null;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return resolvedPlayerCount() != null;
      case 2:
        return course.trim().length > 0;
      case 3:
        if (hasBookedTime === null) return false;
        if (hasBookedTime) return date.length > 0 && startTime.length > 0;
        return preferredDate.length > 0 && timeOfDay.length > 0;
      case 4:
        return true;
      case 5:
        if (hasWager === null) return false;
        if (hasWager) return wagerDetails.trim().length > 0;
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    setError("");
    if (!canProceed()) return;
    if (step < STEPS.length) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError("");
    if (!canProceed() || resolvedPlayerCount() == null || hasBookedTime == null || hasWager == null) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/social-rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerCount: resolvedPlayerCount(),
          course: course.trim(),
          courseId,
          hasBookedTime,
          date: hasBookedTime ? date : preferredDate || null,
          startTime: hasBookedTime ? startTime : null,
          timeOfDay: hasBookedTime ? null : timeOfDay,
          hasWager,
          wagerDetails: hasWager ? wagerDetails.trim() : null,
          inviteUserIds: invitedMembers.map((m) => m.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create outing");
        return;
      }
      router.push(`/social-rounds/${data.slug ?? data.id}`);
    } catch {
      setError("Failed to create outing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-12">
        <Link
          href="/social-rounds"
          className="text-sm font-medium text-stone-500 hover:text-emerald-600"
        >
          ← Social Rounds
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold text-stone-900">
          Create Outing
        </h1>

        <div className="mt-6 flex gap-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1 rounded-full ${
                  i + 1 <= step ? "bg-emerald-600" : "bg-stone-200"
                }`}
              />
              <p
                className={`mt-1 hidden text-center text-xs sm:block ${
                  i + 1 === step ? "font-medium text-emerald-700" : "text-stone-400"
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          {step === 1 && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                How many players?
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Including yourself
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {PRESET_PLAYER_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setPlayerPreset(n);
                      setCustomPlayerCount("");
                    }}
                    className={`rounded-xl border-2 py-4 text-lg font-semibold transition-colors ${
                      playerPreset === n
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <div
                  className={`flex items-center rounded-xl border-2 px-3 transition-colors ${
                    playerPreset === "custom"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <input
                    id="custom-player-count"
                    type="number"
                    min={MIN_PLAYER_COUNT}
                    max={MAX_PLAYER_COUNT}
                    inputMode="numeric"
                    value={customPlayerCount}
                    onFocus={() => setPlayerPreset("custom")}
                    onChange={(e) => {
                      setPlayerPreset("custom");
                      setCustomPlayerCount(e.target.value);
                    }}
                    placeholder="Other"
                    className="w-full bg-transparent py-4 text-center text-lg font-semibold text-stone-900 placeholder:font-normal placeholder:text-stone-400 focus:outline-none"
                    aria-label="Custom number of players"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                What course?
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Start typing to search US golf courses
              </p>
              <div className="mt-5">
                <CourseAutocomplete
                  id="outing-course"
                  value={course}
                  courseId={courseId}
                  onChange={(name, id) => {
                    setCourse(name);
                    setCourseId(id ?? null);
                  }}
                  placeholder="e.g. Pebble Beach Golf Links"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Have you booked a time yet?
              </h2>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setHasBookedTime(true)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                    hasBookedTime === true
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setHasBookedTime(false)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                    hasBookedTime === false
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  No
                </button>
              </div>

              {hasBookedTime === true && (
                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="outing-date" className="block text-sm font-medium text-stone-700">
                      What date?
                    </label>
                    <input
                      id="outing-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="outing-time" className="block text-sm font-medium text-stone-700">
                      What time?
                    </label>
                    <input
                      id="outing-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                </div>
              )}

              {hasBookedTime === false && (
                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="preferred-date" className="block text-sm font-medium text-stone-700">
                      What date?
                    </label>
                    <input
                      id="preferred-date"
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      What time of day?
                    </p>
                    <div className="mt-2 grid gap-2">
                      {TIME_OF_DAY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTimeOfDay(opt.value)}
                          className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                            timeOfDay === opt.value
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                              : "border-stone-200 text-stone-700 hover:border-stone-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Who would you like to invite to play?
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Tap a favorite to invite them, or search for anyone by name.
              </p>

              <MemberInvitePicker
                members={members}
                selected={invitedMembers}
                onChange={setInvitedMembers}
                excludeIds={session?.user?.id ? [session.user.id] : []}
              />
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-stone-900">
                Would you like to add a wager on this round?
              </h2>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setHasWager(true)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                    hasWager === true
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setHasWager(false)}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                    hasWager === false
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 text-stone-700 hover:border-stone-300"
                  }`}
                >
                  No
                </button>
              </div>

              {hasWager === true && (
                <div className="mt-5">
                  <label htmlFor="wager-details" className="block text-sm font-medium text-stone-700">
                    Wager details
                  </label>
                  <input
                    id="wager-details"
                    type="text"
                    value={wagerDetails}
                    onChange={(e) => setWagerDetails(e.target.value)}
                    placeholder="e.g. $5 Nassau, skins $2 per hole"
                    className={`mt-1 ${inputClass}`}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? "Creating…" : "Create Outing"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
