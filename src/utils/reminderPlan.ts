import type { Debt, Transaction } from '@/src/types/finance';
import type { ReminderRule, SpendConcept } from '@/src/types/settings';
import { filterByCalendarMonth, predictMonthlySpends } from '@/src/utils/financeMath';

/** Days ahead a daily reminder is planned; refreshed whenever the app opens or a movement is saved. */
const DAILY_HORIZON_DAYS = 7;
/** Weeks ahead a weekly reminder is planned. */
const WEEKLY_HORIZON = 4;
/** Months ahead a monthly reminder is planned. */
const MONTHLY_HORIZON = 3;
/** iOS keeps at most 64 pending local notifications per app; leave room for the others. */
export const MAX_PLANNED_REMINDERS = 48;
/** A payment this close to the usual amount counts as the month's bill. */
const PAID_RATIO = 0.9;
const TYPICAL_LOOKBACK_DAYS = 90;
const TYPICAL_MIN_SAMPLES = 3;
const TYPICAL_MONTHS = 6;

export type ReminderFrequency = 'daily' | 'weekly' | 'monthly';

/** How often a rule fires; monthly covers both a fixed day and the last day of the month. */
export function reminderFrequency(rule: ReminderRule): ReminderFrequency {
  if (rule.lastDay || (rule.dayOfMonth != null && rule.dayOfMonth >= 1 && rule.dayOfMonth <= 28)) {
    return 'monthly';
  }
  if (rule.weekday != null && rule.weekday >= 0 && rule.weekday <= 6) return 'weekly';
  return 'daily';
}

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

function paidDebtIn(debtId: string, transactions: Transaction[], month: Date): boolean {
  return filterByCalendarMonth(transactions, month.getFullYear(), month.getMonth()).some(
    (t) => t.type === 'debt_payment' && t.debtId === debtId
  );
}

/** Logged within the `days` days before `date` (from the start of that day). */
function paidSince(subId: string, transactions: Transaction[], date: Date, days: number): boolean {
  const from = new Date(date.getFullYear(), date.getMonth(), date.getDate() - days).getTime();
  return transactions.some(
    (t) => isSpend(t) && t.categoryId === subId && new Date(t.createdAt).getTime() >= from
  );
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

    const frequency = reminderFrequency(rule);
    if (frequency === 'monthly') {
      const bill = bills.get(rule.subId);
      const usual = bill?.expectedAmount ?? typicalMonth(rule.subId, transactions, now);
      for (let i = 0; i <= MONTHLY_HORIZON; i += 1) {
        // Day 0 of the next month is the last day of this one.
        const day = rule.lastDay
          ? new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
          : new Date(now.getFullYear(), now.getMonth() + i, rule.dayOfMonth);
        const date = at(day);
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
    if (frequency === 'weekly') {
      const ahead = ((rule.weekday as number) - now.getDay() + 7) % 7;
      let planned = 0;
      for (let i = 0; i <= WEEKLY_HORIZON && planned < WEEKLY_HORIZON; i += 1) {
        const date = at(new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead + 7 * i));
        if (date <= now) continue;
        // Bought it in the days since last week's reminder: this week is covered.
        if (planned === 0 && paidSince(rule.subId, transactions, date, 6)) continue;
        out.push({ id: `${rule.subId}@${stamp(date)}`, subId: rule.subId, date, amount: usual });
        planned += 1;
      }
      continue;
    }

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

/** Debt reminders go out the morning before the due date, in time to pay. */
export const DEBT_REMINDER_HOUR = 9;
const DEBT_DAYS_BEFORE = 1;

export type DebtReminderOccurrence = {
  id: string;
  debtId: string;
  date: Date;
  dueDate: Date;
  /** Installment (or what is left of it this month); null for a card without one. */
  amount: number | null;
};

/** Active debts that can have a due-date reminder: open, with something owed and a due day. */
export function remindableDebts(debts: Debt[]): Debt[] {
  return debts.filter(
    (d) =>
      !d.closedAt &&
      (d.balance > 0 || d.installment > 0) &&
      !Number.isNaN(new Date(d.nextPaymentDate).getTime())
  );
}

/**
 * Next due dates of each active debt, reminded the day before. This month is
 * skipped once its installment is logged; a partial payment reminds what is left.
 */
export function planDebtReminders(
  debts: Debt[],
  transactions: Transaction[],
  spendConcepts: SpendConcept[],
  mutedDebtIds: Set<string>,
  now = new Date()
): DebtReminderOccurrence[] {
  const thisMonth = new Map(
    predictMonthlySpends(transactions, debts, now, spendConcepts)
      .filter((p) => p.debtId)
      .map((p) => [p.debtId as string, p])
  );
  const out: DebtReminderOccurrence[] = [];

  for (const debt of remindableDebts(debts)) {
    if (mutedDebtIds.has(debt.id)) continue;
    const dueDay = new Date(debt.nextPaymentDate).getDate();
    const installment = debt.installment > 0 ? Math.min(debt.installment, debt.balance || debt.installment) : null;
    let planned = 0;
    for (let i = 0; i <= MONTHLY_HORIZON && planned < MONTHLY_HORIZON; i += 1) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + i + 1, 0).getDate();
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, Math.min(dueDay, lastDay));
      const date = new Date(
        dueDate.getFullYear(),
        dueDate.getMonth(),
        dueDate.getDate() - DEBT_DAYS_BEFORE,
        DEBT_REMINDER_HOUR
      );
      if (date <= now) continue;
      let amount = installment;
      if (i === 0) {
        const bill = thisMonth.get(debt.id);
        if (bill?.status === 'paid') continue;
        if (bill) amount = bill.amount;
        // Cards without a fixed installment are not in the bills list: any payment settles the month.
        else if (paidDebtIn(debt.id, transactions, dueDate)) continue;
      }
      out.push({ id: `debt-${debt.id}@${stamp(date)}`, debtId: debt.id, date, dueDate, amount });
      planned += 1;
    }
  }
  return out;
}

/** Suggested reminders fire this many days before the usual pay day, in the morning. */
const SUGGEST_DAYS_BEFORE = 1;
export const SUGGEST_REMINDER_HOUR = 9;

export type ReminderSuggestion = {
  subId: string;
  /** Day of the month it is usually paid. */
  usualDay: number;
  /** Usual monthly amount. */
  amount: number;
  /** Ready-made rule: the morning before the usual day. */
  rule: ReminderRule;
};

/**
 * Concepts paid month after month ("Pagos a vigilar") that have no reminder yet
 * and were not turned down: the reminders worth offering. Ant spends never are.
 */
export function suggestReminders(
  transactions: Transaction[],
  debts: Debt[],
  spendConcepts: SpendConcept[],
  rules: ReminderRule[],
  dismissed: string[],
  now = new Date()
): ReminderSuggestion[] {
  const taken = new Set([...rules.map((r) => r.subId), ...dismissed]);
  const subs = new Map(spendConcepts.flatMap((c) => c.subs.map((s) => [s.id, s] as const)));
  return predictMonthlySpends(transactions, debts, now, spendConcepts)
    .filter((p) => p.source === 'history' && !taken.has(p.categoryId))
    .filter((p) => {
      const sub = subs.get(p.categoryId);
      return sub != null && !sub.isAnt;
    })
    .map((p) => {
      const day = Math.min(28, Math.max(1, p.typicalDay - SUGGEST_DAYS_BEFORE));
      return {
        subId: p.categoryId,
        usualDay: p.typicalDay,
        amount: p.expectedAmount,
        rule: { subId: p.categoryId, hour: SUGGEST_REMINDER_HOUR, minute: 0, dayOfMonth: day },
      };
    })
    .sort((a, b) => b.amount - a.amount);
}
