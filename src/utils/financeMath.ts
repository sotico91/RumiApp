import { getAntCategoryIds } from '@/src/data/financeDefaults';
import { findSpendSub, resolveConceptColor } from '@/src/data/spendConcepts';
import type { Debt, Period, Transaction } from '@/src/types/finance';
import type { Currency, SpendConcept } from '@/src/types/settings';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function periodStart(period: Period, now = new Date()): Date {
  if (period === 'hoy') return startOfDay(now);
  if (period === 'semana') return startOfWeek(now);
  return startOfMonth(now);
}

/** Exclusive end of the current day / week / month. */
export function periodEnd(period: Period, now = new Date()): Date {
  const end = new Date(periodStart(period, now));
  if (period === 'hoy') end.setDate(end.getDate() + 1);
  else if (period === 'semana') end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

/**
 * Previous window to compare a period against. While the current period is
 * still running, cut the previous one to the same elapsed time — otherwise
 * Oct 1–2 is compared with all of September and always looks "98% less".
 */
export function comparableRange(
  current: { from: Date; to: Date },
  previous: { from: Date; to: Date },
  now = new Date()
): { from: Date; to: Date } {
  if (now.getTime() >= current.to.getTime() || now.getTime() <= current.from.getTime()) {
    return previous;
  }
  const elapsed = now.getTime() - current.from.getTime();
  const cut = new Date(Math.min(previous.from.getTime() + elapsed, previous.to.getTime()));
  return { from: previous.from, to: cut };
}

export function previousMonthRange(now = new Date()): { from: Date; to: Date } {
  const to = startOfMonth(now);
  const from = new Date(to);
  from.setMonth(from.getMonth() - 1);
  return { from, to };
}

export function filterByPeriod(
  transactions: Transaction[],
  period: Period,
  now = new Date()
): Transaction[] {
  // Calendar month always starts at 0 for the new month (no spill from prior months).
  if (period === 'mes') {
    return filterByCalendarMonth(transactions, now.getFullYear(), now.getMonth());
  }
  const from = periodStart(period, now).getTime();
  if (period === 'hoy') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return filterBetween(transactions, new Date(from), new Date(end.getTime() + 1));
  }
  return transactions.filter((e) => new Date(e.createdAt).getTime() >= from);
}

/** Inclusive calendar month: year + monthIndex (0-11). */
export function calendarMonthRange(year: number, monthIndex: number): { from: Date; to: Date } {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  return { from, to };
}

export function filterByCalendarMonth(
  transactions: Transaction[],
  year: number,
  monthIndex: number
): Transaction[] {
  const { from, to } = calendarMonthRange(year, monthIndex);
  return filterBetween(transactions, from, to);
}

export function shiftMonth(
  year: number,
  monthIndex: number,
  delta: number
): { year: number; monthIndex: number } {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

export function filterBetween(
  transactions: Transaction[],
  from: Date,
  to: Date
): Transaction[] {
  const a = from.getTime();
  const b = to.getTime();
  return transactions.filter((t) => {
    const ts = new Date(t.createdAt).getTime();
    return ts >= a && ts < b;
  });
}

export function formatExpenseDate(iso: string, language: 'en' | 'es' = 'en'): string {
  const date = new Date(iso);
  return date.toLocaleString(language === 'es' ? 'es-CO' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Share of a reference amount (e.g. category spend vs income). */
export function percentOfBase(amount: number, base: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(base) || base <= 0) return 0;
  return (amount / base) * 100;
}

export function sumByType(
  transactions: Transaction[],
  type: Transaction['type']
): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Money out: regular expenses + debt installment payments. */
/** Ids of cards / credit lines: their charges are already logged as expenses. */
export function revolvingDebtIds(debts: Pick<Debt, 'id' | 'kind'>[] = []): Set<string> {
  return new Set(debts.filter((d) => d.kind === 'revolving').map((d) => d.id));
}

/**
 * Money that left this month: expenses plus loan installments. Paying a card
 * is excluded — the purchases on it were already counted as expenses, so
 * counting the payment too would double the spend.
 */
export function isMonthOutflow(t: Transaction, revolvingIds: Set<string>): boolean {
  if (t.type === 'expense') return true;
  if (t.type !== 'debt_payment') return false;
  return !(t.debtId && revolvingIds.has(t.debtId));
}

export function sumSpendOut(transactions: Transaction[], debts: Pick<Debt, 'id' | 'kind'>[] = []): number {
  const revolving = revolvingDebtIds(debts);
  return transactions
    .filter((t) => isMonthOutflow(t, revolving))
    .reduce((sum, t) => sum + t.amount, 0);
}

export type AccruedInstallment = {
  debtId: string;
  categoryId: string;
  amount: number;
  name?: string;
};

/**
 * Unpaid Wealth installments for a calendar month.
 * Kept for reminders / predictions — do NOT add these to month spend totals;
 * only logged expense / debt_payment movements count as gasto.
 */
export function unpaidInstallmentsForMonth(
  transactions: Transaction[],
  debts: Debt[],
  year: number,
  monthIndex: number
): AccruedInstallment[] {
  const monthTxs = filterByCalendarMonth(transactions, year, monthIndex);
  const paidByDebt = new Map<string, number>();
  const paidByCategory = new Map<string, number>();
  for (const t of monthTxs) {
    if (t.type !== 'expense' && t.type !== 'debt_payment') continue;
    if (t.type === 'debt_payment' && t.debtId) {
      paidByDebt.set(t.debtId, (paidByDebt.get(t.debtId) ?? 0) + t.amount);
    }
    if (t.categoryId) {
      paidByCategory.set(t.categoryId, (paidByCategory.get(t.categoryId) ?? 0) + t.amount);
    }
  }

  const extra: AccruedInstallment[] = [];
  for (const debt of debts) {
    if (debt.closedAt || !(debt.installment > 0) || !(debt.balance > 0)) continue;
    const due = Math.min(debt.installment, debt.balance);
    const paidDirect = paidByDebt.get(debt.id) ?? 0;
    const paidCat = debt.categoryId ? paidByCategory.get(debt.categoryId) ?? 0 : 0;
    const paid = paidDirect > 0 ? paidDirect : paidCat;
    const remaining = Math.max(0, due - paid);
    if (remaining <= 0) continue;
    extra.push({
      debtId: debt.id,
      categoryId: debt.categoryId ?? `debt-${debt.id}`,
      amount: remaining,
      name: debt.name?.trim() || undefined,
    });
  }
  return extra;
}

export function accruedInstallmentsTotal(
  transactions: Transaction[],
  debts: Debt[],
  year: number,
  monthIndex: number
): number {
  return unpaidInstallmentsForMonth(transactions, debts, year, monthIndex).reduce(
    (s, x) => s + x.amount,
    0
  );
}

export function isAntCategoryId(
  categoryId: string,
  spendConcepts: SpendConcept[] = []
): boolean {
  const hit = findSpendSub(spendConcepts, categoryId);
  if (hit) return hit.sub.isAnt === true;
  return getAntCategoryIds().includes(categoryId);
}

export function antExpenseBreakdown(
  transactions: Transaction[],
  spendConcepts: SpendConcept[] = []
) {
  const map = new Map<string, number>();
  let total = 0;

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.categoryId) continue;
    if (!isAntCategoryId(t.categoryId, spendConcepts)) continue;
    total += t.amount;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }

  const items = Array.from(map.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      amount,
      color: resolveConceptColor(categoryId, spendConcepts),
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total, items };
}

/** Amounts within one bucket count as "the same" spend: ~1.000 COP or ~1 USD. */
function recurringBucket(amount: number, currency: Currency): number {
  return Math.round(amount / (currency === 'USD' ? 1 : 1000));
}

export function detectRecurring(
  transactions: Transaction[],
  currency: Currency = 'COP'
): Transaction[] {
  const expenses = transactions.filter((t) => t.type === 'expense' && t.categoryId);
  const groups = new Map<string, Transaction[]>();

  for (const t of expenses) {
    const key = `${t.categoryId}|${recurringBucket(t.amount, currency)}|${t.paymentMethod ?? ''}`;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const recurringIds = new Set<string>();
  for (const list of groups.values()) {
    if (list.length >= 2) {
      list.forEach((t) => recurringIds.add(t.id));
    }
  }

  return expenses.filter((t) => recurringIds.has(t.id));
}

export type PredictedSpendStatus = 'pending' | 'paid';
export type PredictedSpendSource = 'history' | 'debt';

export type PredictedSpend = {
  id: string;
  categoryId: string;
  /** Pending: what is still to pay. Paid: what was actually paid this month. */
  amount: number;
  /** Usual monthly amount (installment, or typical month total of the bill). */
  expectedAmount: number;
  /** Sum of this month's payments toward it (several payments add up). */
  paidAmount: number;
  /** How many payments this month. */
  payments: number;
  typicalDay: number;
  status: PredictedSpendStatus;
  source: PredictedSpendSource;
  debtId?: string;
  /** Display name when category tree / i18n is not enough (e.g. debt label). */
  label?: string;
};

function isSpendOut(t: Transaction): boolean {
  return t.type === 'expense' || t.type === 'debt_payment';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Months of history used to spot monthly bills. */
const BILL_LOOKBACK_MONTHS = 6;
/** A bill paid in a few parts still counts; more payments a month is everyday spending. */
const BILL_MAX_PAYMENTS_PER_MONTH = 2;
/** A bill not seen for longer than this has stopped (moved, cancelled). */
const BILL_MAX_GAP_MONTHS = 2;

type MonthSpend = { count: number; total: number; firstDay: number };

/**
 * Monthly payments to watch: installments of open debts, plus bills found in
 * the history — concepts paid once or twice a month (rent, utilities,
 * insurance…) in at least two months, and recently. Everyday spends (several
 * times a month) and ant spends are left out. This month's payments mark an
 * item as paid and add up to what was actually paid.
 */
export function predictMonthlySpends(
  transactions: Transaction[],
  debts: Debt[],
  now = new Date(),
  /** When given, repeating bills only count for subcategories that still exist. */
  spendConcepts?: SpendConcept[]
): PredictedSpend[] {
  const liveSubIds = spendConcepts
    ? new Set(spendConcepts.flatMap((c) => c.subs.map((s) => s.id)))
    : null;
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  // Per category, per month back (1 = last month): payments count, total and first day.
  const history = new Map<string, Map<number, MonthSpend>>();
  for (let back = 1; back <= BILL_LOOKBACK_MONTHS; back += 1) {
    const m = shiftMonth(year, monthIndex, -back);
    for (const t of filterByCalendarMonth(transactions, m.year, m.monthIndex)) {
      if (!isSpendOut(t) || !t.categoryId) continue;
      const months = history.get(t.categoryId) ?? new Map<number, MonthSpend>();
      const day = new Date(t.createdAt).getDate();
      const spend = months.get(back) ?? { count: 0, total: 0, firstDay: day };
      spend.count += 1;
      spend.total += t.amount;
      spend.firstDay = Math.min(spend.firstDay, day);
      months.set(back, spend);
      history.set(t.categoryId, months);
    }
  }

  const thisMonth = filterByCalendarMonth(transactions, year, monthIndex).filter(isSpendOut);
  const paidByDebtId = new Map<string, { total: number; count: number }>();
  const paidByCategory = new Map<string, { total: number; count: number }>();
  const add = (map: Map<string, { total: number; count: number }>, key: string, amount: number) => {
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += amount;
    cur.count += 1;
    map.set(key, cur);
  };
  for (const t of thisMonth) {
    if (t.type === 'debt_payment' && t.debtId) add(paidByDebtId, t.debtId, t.amount);
    if (t.categoryId) add(paidByCategory, t.categoryId, t.amount);
  }

  const results: PredictedSpend[] = [];
  const coveredCategories = new Set<string>();

  for (const debt of debts) {
    if (debt.closedAt) continue;
    if (!(debt.installment > 0)) continue;
    const categoryId = debt.categoryId ?? `debt-${debt.id}`;
    let typicalDay = 1;
    if (debt.nextPaymentDate) {
      const d = new Date(debt.nextPaymentDate).getDate();
      if (!Number.isNaN(d)) typicalDay = d;
    }
    const due = Math.min(debt.installment, Math.max(debt.balance, 0) || debt.installment);
    // Prefer explicit debt payments; otherwise any spend on the linked concept.
    const direct = paidByDebtId.get(debt.id);
    const byCategory = debt.categoryId ? paidByCategory.get(debt.categoryId) : undefined;
    const paid = direct && direct.total > 0 ? direct : byCategory ?? { total: 0, count: 0 };
    const isPaid = due <= 0 || paid.total >= due;
    results.push({
      id: `debt-${debt.id}`,
      categoryId,
      amount: isPaid ? paid.total : Math.max(due - paid.total, 0),
      expectedAmount: debt.installment,
      paidAmount: paid.total,
      payments: paid.count,
      typicalDay,
      status: isPaid ? 'paid' : 'pending',
      source: 'debt',
      debtId: debt.id,
      label: debt.name?.trim() || undefined,
    });
    if (debt.categoryId) coveredCategories.add(debt.categoryId);
  }

  for (const [categoryId, months] of history) {
    if (coveredCategories.has(categoryId)) continue;
    // Deleted or renamed-away subcategories should not keep showing up as "to pay".
    if (liveSubIds && !liveSubIds.has(categoryId)) continue;
    if (isAntCategoryId(categoryId, spendConcepts ?? [])) continue;
    const paidNow = paidByCategory.get(categoryId);
    const monthsPresent = months.size + (paidNow ? 1 : 0);
    if (monthsPresent < 2) continue;
    const lastSeenBack = paidNow ? 0 : Math.min(...months.keys());
    if (lastSeenBack > BILL_MAX_GAP_MONTHS) continue;
    const spends = [...months.values()];
    const perMonth = median([...spends.map((m) => m.count), ...(paidNow ? [paidNow.count] : [])]);
    if (perMonth > BILL_MAX_PAYMENTS_PER_MONTH) continue;

    const expected = median(spends.map((m) => m.total));
    const typicalDay = Math.min(28, Math.max(1, median(spends.map((m) => m.firstDay))));
    results.push({
      id: `hist-${categoryId}`,
      categoryId,
      amount: paidNow ? paidNow.total : expected,
      expectedAmount: expected,
      paidAmount: paidNow?.total ?? 0,
      payments: paidNow?.count ?? 0,
      typicalDay,
      status: paidNow ? 'paid' : 'pending',
      source: 'history',
    });
  }

  results.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    if (a.typicalDay !== b.typicalDay) return a.typicalDay - b.typicalDay;
    return a.amount - b.amount;
  });

  return results;
}

