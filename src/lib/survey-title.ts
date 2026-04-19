/** Display title: "Dates You Can Play in March 2026" */
export function formatAvailabilitySurveyTitle(month: number, year: number): string {
  const label = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });
  return `Dates You Can Play in ${label} ${year}`;
}

/** `dateStr` must be `YYYY-MM-DD`. */
export function isYmdInCalendarMonth(
  dateStr: string,
  month: number,
  year: number
): boolean {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return y === year && mo === month;
}
