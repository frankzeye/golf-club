"use client";

import Link from "next/link";

interface WizardShellProps {
  title: string;
  subtitle?: string;
  steps: string[];
  currentStep: number;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  canGoNext?: boolean;
  isSubmitting?: boolean;
  cancelHref?: string;
  children: React.ReactNode;
}

export function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  canGoNext = true,
  isSubmitting = false,
  cancelHref = "/tournaments",
  children,
}: WizardShellProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={cancelHref}
          className="text-sm font-medium text-stone-500 hover:text-stone-700"
        >
          ← Cancel
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-stone-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
      </div>

      <ol className="mb-8 flex flex-wrap gap-2">
        {steps.map((label, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          return (
            <li
              key={label}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : isComplete
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-stone-100 text-stone-500"
              }`}
            >
              {index + 1}. {label}
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">{children}</div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            {backLabel}
          </button>
        ) : (
          <span />
        )}
        {onNext ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isSubmitting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : nextLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
