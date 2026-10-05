/** Pay day of a debt, 1–28 so it exists in every month; null when out of range. */
export function clampPayDay(raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  const day = Math.round(raw);
  if (day < 1 || day > 28) return null;
  return day;
}

/** Next payment date (ISO) on that day: this month if still ahead, else next month. */
export function nextPaymentIsoFromDay(day: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), day, 12, 0, 0, 0);
  if (d.getTime() < from.getTime()) {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}
