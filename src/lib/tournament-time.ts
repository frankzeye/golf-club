/** Format "HH:mm" (24h) as "8:30 AM". Returns null if missing or invalid. */
export function formatStartTime(startTime: string | null | undefined): string | null {
  if (!startTime) return null;
  const [hStr, mStr] = startTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Validate and normalize start time from API input. Returns null if empty or invalid. */
export function parseStartTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
