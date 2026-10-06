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

/** A payment up to this many days late still settles that due date. */
const CYCLE_GRACE_DAYS = 10;

/** `day` of the month `offset` months from (year, monthIndex), clamped to that month, at noon. */
function dueOn(year: number, monthIndex: number, offset: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + offset + 1, 0).getDate();
  return new Date(year, monthIndex + offset, Math.min(day, lastDay), 12, 0, 0, 0);
}

/** The due date a payment settles: the first one on the pay day at or after paidAt − grace. */
function settledDue(payDay: number, paidAt: Date): Date {
  const from = new Date(paidAt.getFullYear(), paidAt.getMonth(), paidAt.getDate() - CYCLE_GRACE_DAYS);
  const due = dueOn(from.getFullYear(), from.getMonth(), 0, payDay);
  return due.getTime() >= from.getTime() ? due : dueOn(from.getFullYear(), from.getMonth(), 1, payDay);
}

/**
 * Next due date after paying: the cycle after the one this payment settles,
 * keeping the pay day. Never moves back, so a second payment in the same cycle
 * (extra capital, a split installment) does not skip a month.
 */
export function nextDueAfterPayment(currentIso: string, paidAtIso: string): string {
  const current = new Date(currentIso);
  const paidAt = new Date(paidAtIso);
  if (Number.isNaN(current.getTime()) || Number.isNaN(paidAt.getTime())) {
    return nextPaymentIsoFromDay(paidAt.getDate() || 1, paidAt);
  }
  const settled = settledDue(current.getDate(), paidAt);
  const next = dueOn(settled.getFullYear(), settled.getMonth(), 1, current.getDate());
  return (next.getTime() > current.getTime() ? next : current).toISOString();
}

/** Undo of nextDueAfterPayment: back to the settled cycle when this payment is what moved the date. */
export function dueBeforePayment(currentIso: string, paidAtIso: string): string {
  const current = new Date(currentIso);
  const paidAt = new Date(paidAtIso);
  if (Number.isNaN(current.getTime()) || Number.isNaN(paidAt.getTime())) return currentIso;
  const settled = settledDue(current.getDate(), paidAt);
  const movedTo = dueOn(settled.getFullYear(), settled.getMonth(), 1, current.getDate());
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return sameDay(movedTo, current) ? settled.toISOString() : currentIso;
}
