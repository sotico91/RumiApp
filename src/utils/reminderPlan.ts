import type { Debt, Transaction } from '@/src/types/finance';
import type { ReminderRule, SpendConcept } from '@/src/types/settings';
import { filterByCalendarMonth, predictMonthlySpends } from '@/src/utils/financeMath';

/** Days ahead a daily reminder is planned; refreshed whenever the app opens or a movement is saved. */
const DAILY_HORIZON_DAYS = 7;
/** Months ahead a monthly reminder is planned. */
const MONTHLY_HORIZON = 3;
/** iOS keeps at most 64 pending local notifications per app; leave room for the others. */
export const MAX_PLANNED_REMINDERS = 48;
/** A payment this close to the usual amount counts as the month's bill. */
const PAID_RATIO = 0.9;
const TYPICAL_LOOKBACK_DAYS = 90;
const TYPICAL_MIN_SAMPLES = 3;
const TYPICAL_MONTHS = 6;

export type ReminderOccurrence = {
  /** Stable per rule + fire time, so unchanged occurrences are not rescheduled. */
  id: string;
  subId: string;
  date: Date;
  /** What is usually paid (or what is left of this month's bill); null when unknown. */
  amount: number | null;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isSpend(t: Transaction): boolean {
  return t.type === 'expense' || t.type === 'debt_payment';
}

function stamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}`;
}

/** Usual single payment for a concept over the last months (coffee, parking…). */
function typicalPayment(subId: string, transactions: Transaction[], now: Date): number | null {
  const since = now.getTime() - TYPICAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const amounts = transactions
    .filter((t) => isSpend(t) && t.categoryId === subId && new Date(t.createdAt).getTime() >= since)
    .map((t) => t.amount);
  return amounts.length >= TYPICAL_MIN_SAMPLES ? Math.round(median(amounts)) : null;
}

/** Usual monthly total for a bill: median of the last months it was paid (2+ months). */
function typicalMonth(subId: string, transactions: Transaction[], now: Date): number | null {
  const totals: number[] = [];
  for (let back = 1; back <= TYPICAL_MONTHS; back += 1) {
    const m = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const total = paidIn(subId, transactions, m.getFullYear(), m.getMonth());
    if (total > 0) totals.push(total);
  }
  return totals.length >= 2 ? Math.round(median(totals)) : null;
}

function paidIn(subId: string, transactions: Transaction[], year: number, monthIndex: number): number {
  return filterByCalendarMonth(transactions, year, monthIndex)
    .filter((t) => isSpend(t) && t.categoryId === subId)
    .reduce((s, t) => s + t.amount, 0);
}

function paidOn(subId: string, transactions: Transaction[], day: Date): boolean {
  return transactions.some((t) => {
    if (!isSpend(t) || t.categoryId !== subId) return false;
    const d = new Date(t.createdAt);
    return (
      d.getFullYear() === day.getFullYear() &&
      d.getMonth() === day.getMonth() &&
      d.getDate() === day.getDate()
    );
  });
}

/**
 * The next reminders worth sending. A month whose bill is already logged is
 * skipped, and a partial payment reminds only what is left; a daily reminder
 * skips today once that concept was logged today. Nearest first, capped.
 */
export function planReminders(
  rules: ReminderRule[],
  transactions: Transaction[],
  debts: Debt[],
  spendConcepts: SpendConcept[],
  now = new Date()
): ReminderOccurrence[] {
  const bills = new Map(
    predictMonthlySpends(transactions, debts, now, spendConcepts).map((p) => [p.categoryId, p])
  );
  const out: ReminderOccurrence[] = [];

  for (const rule of rules) {
    const at = (base: Date) =>
      new Date(base.getFullYear(), base.getMonth(), base.getDate(), rule.hour, rule.minute);

    if (rule.dayOfMonth != null && rule.dayOfMonth >= 1 && rule.dayOfMonth <= 28) {
      const bill = bills.get(rule.subId);
      const usual = bill?.expectedAmount ?? typicalMonth(rule.subId, transactions, now);
      for (let i = 0; i <= MONTHLY_HORIZON; i += 1) {
        const date = at(new Date(now.getFullYear(), now.getMonth() + i, rule.dayOfMonth));
        if (date <= now) continue;
        const paid = paidIn(rule.subId, transactions, date.getFullYear(), date.getMonth());
        let amount = usual;
        if (paid > 0) {
          // Paid without a known amount, or paid in full: nothing to remind this month.
          if (usual == null || paid >= usual * PAID_RATIO) continue;
          amount = usual - paid;
        }
        out.push({ id: `${rule.subId}@${stamp(date)}`, subId: rule.subId, date, amount });
        if (out.filter((o) => o.subId === rule.subId).length >= MONTHLY_HORIZON) break;
      }
      continue;
    }

    const usual = typicalPayment(rule.subId, transactions, now);
    for (let i = 0; i < DAILY_HORIZON_DAYS; i += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const date = at(day);
      if (date <= now) continue;
      if (i === 0 && paidOn(rule.subId, transactions, day)) continue;
      out.push({ id: `${rule.subId}@${stamp(date)}`, subId: rule.subId, date, amount: usual });
    }
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_PLANNED_REMINDERS);
}
