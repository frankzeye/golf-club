"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import { CourseStrokeIndexEditor } from "@/components/CourseStrokeIndexEditor";
import { WizardShell } from "@/components/tournament-wizard/WizardShell";
import {
  DEFAULT_TOURNAMENT_CREATE_FORM,
  serializeTournamentCreateForm,
  validateTournamentCreateStep,
  type TournamentCreateFormState,
} from "@/lib/tournament-create-form";
import { TOURNAMENT_SCORING_FORMATS } from "@/lib/tournament-scoring-formats";

const CREATE_STEPS = [
  "Basic Information",
  "Tournament Type",
  "Prizes",
  "Course Hole Handicaps",
];

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function TournamentCreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TournamentCreateFormState>(DEFAULT_TOURNAMENT_CREATE_FORM);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function goNext() {
    const validationError = validateTournamentCreateStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    if (step < CREATE_STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    void handleCreate();
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  async function handleCreate() {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serializeTournamentCreateForm(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create tournament");
        return;
      }
      const slug = data.slug ?? data.id;
      router.push(`/tournaments/${slug}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <WizardShell
      title="Create Tournament"
      subtitle="Set up a new tournament in a few steps."
      steps={CREATE_STEPS}
      currentStep={step}
      onBack={step > 0 ? goBack : undefined}
      onNext={goNext}
      nextLabel={step === CREATE_STEPS.length - 1 ? "Create Tournament" : "Continue"}
      isSubmitting={isSubmitting}
    >
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-stone-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Spring Championship"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={inputClass}
              placeholder="Short description (optional)"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-stone-700">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Course</label>
            <CourseAutocomplete
              value={form.course}
              courseId={form.courseId}
              onChange={(name, courseId) =>
                setForm((prev) => ({ ...prev, course: name, courseId: courseId ?? null }))
              }
              placeholder="Search US golf courses"
              id="tournament-create-course"
              className={inputClass}
            />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">Tournament Type</h2>
          <div>
            <label className="block text-sm font-medium text-stone-700">Golf Scoring Format</label>
            <select
              value={form.scoringFormat}
              onChange={(e) => setForm((prev) => ({ ...prev, scoringFormat: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select format</option>
              {TOURNAMENT_SCORING_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Individual or Team</label>
            <div className="mt-2 flex rounded-lg border border-stone-300 p-1">
              {(["individual", "team"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, individualOrTeam: value }))}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    form.individualOrTeam === value
                      ? "bg-emerald-600 text-white"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {value === "individual" ? "Individual" : "Team"}
                </button>
              ))}
            </div>
            {form.individualOrTeam === "team" ? (
              <div className="mt-3 flex gap-4">
                {(["2", "4"] as const).map((size) => (
                  <label key={size} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="teamSize"
                      checked={form.teamSize === size}
                      onChange={() => setForm((prev) => ({ ...prev, teamSize: size }))}
                      className="h-4 w-4 border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-stone-700">{size} players</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Available Spots</label>
            <input
              type="number"
              min={1}
              max={999}
              value={form.availableSpots}
              onChange={(e) => setForm((prev) => ({ ...prev, availableSpots: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-stone-700">Green Fee ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.greenFee}
                onChange={(e) => setForm((prev) => ({ ...prev, greenFee: e.target.value }))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700">Prize Pool ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.prizePool}
                onChange={(e) => setForm((prev) => ({ ...prev, prizePool: e.target.value }))}
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700">Club Donation ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.clubDonation}
                onChange={(e) => setForm((prev) => ({ ...prev, clubDonation: e.target.value }))}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700">Payment Options</label>
            <div className="mt-2 flex gap-3">
              {(["venmo", "cash"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      paymentMethod: prev.paymentMethod === method ? "" : method,
                    }))
                  }
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                    form.paymentMethod === method
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-stone-300 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            {form.paymentMethod === "venmo" ? (
              <div className="mt-3">
                <label className="block text-sm font-medium text-stone-700">Venmo Username</label>
                <input
                  type="text"
                  value={form.venmoUsername}
                  onChange={(e) => setForm((prev) => ({ ...prev, venmoUsername: e.target.value }))}
                  placeholder="@username"
                  className={inputClass}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">Prizes</h2>
          <p className="text-sm text-stone-500">Add prize places and amounts (optional).</p>
          <div className="space-y-2">
            {form.prizes.map((prize, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={prize.name}
                  onChange={(e) => {
                    const prizes = [...form.prizes];
                    prizes[index] = { ...prizes[index], name: e.target.value };
                    setForm((prev) => ({ ...prev, prizes }));
                  }}
                  placeholder="Prize name"
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={prize.amount}
                  onChange={(e) => {
                    const prizes = [...form.prizes];
                    prizes[index] = { ...prizes[index], amount: e.target.value };
                    setForm((prev) => ({ ...prev, prizes }));
                  }}
                  placeholder="Amount"
                  className="w-28 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      prizes: prev.prizes.filter((_, prizeIndex) => prizeIndex !== index),
                    }))
                  }
                  className="rounded-lg border border-stone-300 px-3 py-2.5 text-stone-500 hover:bg-stone-50"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  prizes: [...prev.prizes, { name: "", amount: "" }],
                }))
              }
              className="rounded-lg border border-dashed border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-400"
            >
              + Add prize
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-stone-900">Course Hole Handicaps</h2>
          {form.courseId ? (
            <>
              <p className="text-sm text-stone-500">
                Set stroke indexes for {form.course}. You can skip and edit these later on the
                tournament page.
              </p>
              <CourseStrokeIndexEditor courseId={form.courseId} />
            </>
          ) : (
            <p className="text-sm text-stone-500">
              Select a course in step 1 to configure hole handicaps. You can still create the
              tournament without them.
            </p>
          )}
          <div className="border-t border-stone-200 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-stone-900">Admin only</p>
                <p className="mt-1 text-sm text-stone-500">
                  When enabled, this tournament is hidden from members and only visible to admins.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.adminOnly}
                onClick={() => setForm((prev) => ({ ...prev, adminOnly: !prev.adminOnly }))}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  form.adminOnly ? "bg-emerald-600" : "bg-stone-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    form.adminOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WizardShell>
  );
}
