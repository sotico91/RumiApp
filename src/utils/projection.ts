import type { Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import {
  calendarMonthRange,
  filterByCalendarMonth,
  isMonthOutflow,
  predictMonthlySpends,
  revolvingDebtIds,
  shiftMonth,
  sumByType,
} from '@/src/utils/financeMath';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Full months behind the current one that feed the usual daily pace. */
const HISTORY_MONTHS = 3;
/** A purchase this many times the typical one is a candidate one-off. */
const ONE_OFF_MULTIPLIER = 6;
/** Below this many day-to-day purchases there is no "typical" to compare with. */
const ONE_OFF_MIN_SAMPLE = 8;
/** Purchases needed before weekday habits fully count. */
const WEEKDAY_FULL_SAMPLE = 40;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Spend multiplier per weekday (0 = Sunday), averaging 1. Shrunk toward 1
 * while there are few purchases, so two pricey Saturdays do not set the rule.
 */
function weekdayFactors(
  history: { year: number; monthIndex: number; txs: Transaction[] }[]
): number[] {
  const sums = Array<number>(7).fill(0);
  const occurrences = Array<number>(7).fill(0);
  let count = 0;
  for (const month of history) {
    const total = daysInMonth(month.year, month.monthIndex);
    for (let day = 1; day <= total; day += 1) {
      occurrences[new Date(month.year, month.monthIndex, day).getDay()] += 1;
    }
    for (const t of month.txs) {
      sums[new Date(t.createdAt).getDay()] += t.amount;
      count += 1;
    }
  }
  const allDays = occurrences.reduce((s, n) => s + n, 0);
  const overall = allDays > 0 ? sums.reduce((s, n) => s + n, 0) / allDays : 0;
  if (overall <= 0) return Array<number>(7).fill(1);
  const weight = Math.min(1, count / WEEKDAY_FULL_SAMPLE);
  return sums.map((sum, dow) => {
    const raw = occurrences[dow] > 0 ? sum / occurrences[dow] / overall : 1;
    return 1 + (raw - 1) * weight;
  });
}

export type MonthProjection = {
  /** Money out so far this month (expenses + loan installments). */
  spent: number;
  income: number;
  /** Days elapsed (today included) and days in the month. */
  days: number;
  totalDays: number;
  /** Known monthly payments (loans, repeating bills) still to come. */
  pendingFixed: number;
  /** Day-to-day spend so far, the part that is extrapolated. */
  variableSoFar: number;
  /** Unusual big purchases this month, counted once and kept out of the pace. */
  oneOffs: number;
  /** Day-to-day spend per day used for the days left. */
  dailyPace: number;
  /** Past months that shaped the pace (0 = this month's pace alone). */
  historyMonths: number;
  /** Expected money out by month end. */
  projectedSpend: number;
  /** income − projectedSpend (negative = short). */
  projectedLeft: number;
  /** Too few days for the pace to be reliable. */
  early: boolean;
};

/**
 * Month-end estimate that does not blow up because rent was paid on day 1:
 * fixed payments count once (paid + still pending), and only the variable
 * day-to-day spend is extrapolated. The pace for the days left blends this
 * month with the usual pace of recent months (this month weighs more as it
 * runs), follows weekday habits, and leaves unusual big purchases out.
 */
export function projectMonth(
  transactions: Transaction[],
  debts: Debt[] = [],
  now = new Date(),
  spendConcepts?: SpendConcept[]
): MonthProjection {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const { from, to } = calendarMonthRange(year, monthIndex);
  const totalDays = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  const days = Math.min(totalDays, Math.max(1, Math.ceil((now.getTime() - from.getTime()) / DAY_MS)));

  const revolving = revolvingDebtIds(debts);
  const month = filterByCalendarMonth(transactions, year, monthIndex);
  const outflow = month.filter((t) => isMonthOutflow(t, revolving));

  // Card payments are not outflow (their purchases already are), so a card's
  // statement payment must not be added as a pending fixed cost either.
  const predictions = predictMonthlySpends(transactions, debts, now, spendConcepts).filter(
    (p) => !(p.debtId && revolving.has(p.debtId))
  );
  const fixedCategories = new Set(predictions.map((p) => p.categoryId));
  const isFixed = (t: Transaction) =>
    t.type === 'debt_payment' || (!!t.categoryId && fixedCategories.has(t.categoryId));

  const spent = outflow.reduce((s, t) => s + t.amount, 0);
  const variableTxs = outflow.filter((t) => !isFixed(t));
  const variableSoFar = variableTxs.reduce((s, t) => s + t.amount, 0);
  const pendingFixed = predictions
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + p.amount, 0);

  const history: { year: number; monthIndex: number; txs: Transaction[] }[] = [];
  for (let back = 1; back <= HISTORY_MONTHS; back += 1) {
    const m = shiftMonth(year, monthIndex, -back);
    const txs = filterByCalendarMonth(transactions, m.year, m.monthIndex).filter(
      (t) => isMonthOutflow(t, revolving) && !isFixed(t)
    );
    if (txs.length > 0) history.push({ ...m, txs });
  }

  // One-off: far above the typical purchase and nothing near that size in the
  // same concept this month or lately (a TV, not the Saturday market run).
  const sample = [...variableTxs, ...history.flatMap((h) => h.txs)].map((t) => t.amount);
  const cutoff =
    sample.length >= ONE_OFF_MIN_SAMPLE ? median(sample) * ONE_OFF_MULTIPLIER : Infinity;
  const pool = [...variableTxs, ...history.flatMap((h) => h.txs)];
  const isOneOff = (t: Transaction) =>
    t.amount > cutoff &&
    !pool.some((p) => p !== t && p.categoryId === t.categoryId && p.amount >= t.amount * 0.5);
  const oneOffs = variableTxs.filter(isOneOff).reduce((s, t) => s + t.amount, 0);

  const currentDaily = (variableSoFar - oneOffs) / days;
  const typical = history.map((h) => ({
    ...h,
    txs: h.txs.filter((t) => !isOneOff(t)),
  }));
  const historyDaily =
    typical.length > 0
      ? typical.reduce(
          (s, h) => s + h.txs.reduce((a, t) => a + t.amount, 0) / daysInMonth(h.year, h.monthIndex),
          0
        ) / typical.length
      : null;
  const weight = days / totalDays;
  const dailyPace =
    historyDaily == null ? currentDaily : weight * currentDaily + (1 - weight) * historyDaily;

  const factors = weekdayFactors(typical);
  let remaining = 0;
  for (let day = days + 1; day <= totalDays; day += 1) {
    remaining += dailyPace * factors[new Date(year, monthIndex, day).getDay()];
  }

  const projectedSpend = spent + remaining + pendingFixed;
  const income = sumByType(month, 'income');

  return {
    spent,
    income,
    days,
    totalDays,
    pendingFixed,
    variableSoFar,
    oneOffs,
    dailyPace,
    historyMonths: typical.length,
    projectedSpend,
    projectedLeft: income - projectedSpend,
    early: days < 7 && typical.length === 0,
  };
}
