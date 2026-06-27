export function parseDurationDaysHours(
  days: unknown,
  hours: unknown
): { days: number; hours: number } | { error: string } {
  const d = Number(days);
  const h = Number(hours);
  if (!Number.isInteger(d) || d < 0 || d > 365) {
    return { error: "Days must be a whole number from 0 to 365" };
  }
  if (!Number.isInteger(h) || h < 0 || h > 23) {
    return { error: "Hours must be a whole number from 0 to 23" };
  }
  if (d === 0 && h === 0) {
    return { error: "Survey must stay open for at least 1 hour or 1 day" };
  }
  return { days: d, hours: h };
}

export function endsAtFromDuration(
  days: number,
  hours: number,
  from: Date = new Date()
): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000);
}

export function isSurveyClosed(endsAt: Date | null | undefined, now = new Date()): boolean {
  if (!endsAt) return false;
  return endsAt.getTime() <= now.getTime();
}

export function formatSurveyDeadline(endsAt: Date | string | null | undefined): string {
  if (!endsAt) return "No deadline";
  const d = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Value for `<input type="datetime-local" />` in local time. */
export function toDatetimeLocalValue(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): Date | { error: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: "End date is required" };
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return { error: "Invalid end date" };
  }
  return d;
}
