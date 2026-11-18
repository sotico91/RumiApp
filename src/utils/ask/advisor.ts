import type { Transaction } from '@/src/types/finance';
import {
  budgetMonthOf,
  calendarMonthRange,
  filterBetween,
  filterByCalendarMonth,
  isMonthOutflow,
  revolvingDebtIds,
  shiftMonth,
  sumByType,
} from '@/src/utils/financeMath';
import type { AskContext, Handler } from './handlers';
import { analogRange, dayLabel, previousLabel } from './period';
import { normalize } from './text';

/** Full months behind this one that set what is "usual". */
const USUAL_MONTHS = 3;
/** A category counts as running high from this many times its usual to-date spend… */
const HIGH_RATIO = 1.3;
/** …and only when the excess is at least this share of the month's spend so far. */
const HIGH_MIN_SHARE = 0.05;
/** A limit is "going fast" when its use runs this much ahead of the month. */
const AHEAD_RATIO = 1.15;
/** Share of income suggested to put aside (the 20 of 50/30/20). */
const SAVE_SHARE = 0.2;
/** A repeating payment by note: amounts within this spread of their median. */
const RECURRING_SPREAD = 0.25;

const sum = (txs: Transaction[]) => txs.reduce((s, x) => s + x.amount, 0);

/** Money out the same way Home counts it: expenses + loan installments, not card payments. */
function outflow(ctx: AskContext, txs: Transaction[]): Transaction[] {
  const revolving = revolvingDebtIds(ctx.options.debts);
  return txs.filter((x) => isMonthOutflow(x, revolving));
}

const groupKey = (x: Transaction) => x.categoryId ?? (x.type === 'debt_payment' ? 'debt' : 'other');

function labelOf(ctx: AskContext, key: string): string {
  if (key === 'debt') return ctx.t('search.labelObligation');
  if (key === 'other') return ctx.t('home.expenses');
  return ctx.categoryLabel(key);
}

function byKey(txs: Transaction[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const x of txs) out.set(groupKey(x), (out.get(groupKey(x)) ?? 0) + x.amount);
  return out;
}

/** Elapsed share of the person's month, 0–1. */
function monthElapsed(ctx: AskContext): number {
  const p = ctx.snapshot().projection;
  return p.days / p.totalDays;
}

const pct = (n: number) => Math.round(n * 100);

/**
 * "¿Por qué este mes tengo menos plata?": spend and income against the same
 * stretch of the previous period, and the concepts that grew the most.
 */
export const why: Handler = (ctx) => {
  const { parsed, list, transactions, format, t } = ctx;
  if (!parsed.wants.why) return null;
  const prevRange = analogRange(parsed.period);
  const prevAll = filterBetween(transactions, prevRange.from, prevRange.to);
  const now = outflow(ctx, list);
  const prev = outflow(ctx, prevAll);
  const compare = previousLabel(parsed.period, prevRange, parsed.language, t);
  const period = parsed.period.label;
  const spendNow = sum(now);
  const spendPrev = sum(prev);
  const incomeNow = sumByType(list, 'income');
  const incomePrev = sumByType(prevAll, 'income');
  const diff = spendNow - spendPrev;

  const parts: string[] = [];
  const amounts = { period, compare, now: format(spendNow), prev: format(spendPrev), amount: format(Math.abs(diff)) };
  parts.push(
    t(diff > 0 ? 'search.answerWhySpendMore' : diff < 0 ? 'search.answerWhySpendLess' : 'search.answerWhySpendSame', amounts)
  );

  let rising: { key: string; delta: number }[] = [];
  if (diff > 0) {
    const a = byKey(now);
    const b = byKey(prev);
    rising = [...a.entries()]
      .map(([key, amount]) => ({ key, delta: amount - (b.get(key) ?? 0) }))
      .filter((r) => r.delta > 0)
      .sort((x, y) => y.delta - x.delta)
      .slice(0, 3);
    if (rising.length > 0) {
      parts.push(
        t('search.answerWhyRising', {
          detail: rising.map((r) => `${labelOf(ctx, r.key)} +${format(r.delta)}`).join(' · '),
        })
      );
    }
  }
  if (incomeNow < incomePrev) {
    parts.push(
      t('search.answerWhyIncomeLess', {
        amount: format(incomePrev - incomeNow),
        now: format(incomeNow),
        prev: format(incomePrev),
      })
    );
  }
  if (diff <= 0 && incomeNow >= incomePrev) parts.push(t('search.answerWhyNothing'));

  const keys = new Set(rising.map((r) => r.key));
  return {
    text: parts.join(' '),
    txs: now.filter((x) => keys.has(groupKey(x))),
    basis: 'inference',
    assumptions: [t('ask.assumeWhy', { compare })],
  };
};

/** Spend per category in the first `elapsedMs` of each of the last full months, averaged. */
function usualToDate(ctx: AskContext, elapsedMs: number): Map<string, number> {
  const cur = budgetMonthOf(new Date());
  const totals = new Map<string, number>();
  let months = 0;
  for (let back = 1; back <= USUAL_MONTHS; back += 1) {
    const m = shiftMonth(cur.year, cur.monthIndex, -back);
    const range = calendarMonthRange(m.year, m.monthIndex);
    const all = filterByCalendarMonth(ctx.transactions, m.year, m.monthIndex);
    if (all.length === 0) continue;
    months += 1;
    const to = new Date(Math.min(range.from.getTime() + elapsedMs, range.to.getTime()));
    for (const [key, amount] of byKey(outflow(ctx, filterBetween(all, range.from, to)))) {
      totals.set(key, (totals.get(key) ?? 0) + amount);
    }
  }
  if (months === 0) return totals;
  for (const [key, amount] of totals) totals.set(key, amount / months);
  return totals;
}

/**
 * "¿En qué estoy gastando demasiado?": limits used up or going faster than
 * the month, and day-to-day concepts well above their usual at this point.
 */
export const overspend: Handler = (ctx) => {
  const { parsed, transactions, options, format, t } = ctx;
  if (!parsed.wants.overspend) return null;
  const s = ctx.snapshot();
  const elapsed = monthElapsed(ctx);
  const cur = budgetMonthOf(new Date());
  const range = calendarMonthRange(cur.year, cur.monthIndex);
  const month = outflow(ctx, filterBetween(transactions, range.from, new Date()));
  const items: string[] = [];
  const flagged = new Set<string>();

  for (const b of [...(options.budgetStatus ?? [])].sort((x, y) => y.ratio - x.ratio)) {
    if (b.limit <= 0) continue;
    const label = ctx.categoryLabel(b.categoryId);
    if (b.ratio > 1) {
      items.push(t('search.overspendOver', { label, percent: pct(b.ratio) }));
      flagged.add(b.categoryId);
    } else if (b.ratio > elapsed * AHEAD_RATIO) {
      items.push(t('search.overspendAhead', { label, percent: pct(b.ratio), elapsed: pct(elapsed) }));
      flagged.add(b.categoryId);
    }
  }

  // Fixed bills land on one day; comparing them to date would flag rent on the 2nd.
  const fixed = new Set(s.fixed.map((p) => p.categoryId));
  const usual = usualToDate(ctx, Date.now() - range.from.getTime());
  const spentSoFar = sum(month);
  const high = [...byKey(month).entries()]
    .filter(([key]) => key !== 'debt' && !fixed.has(key) && !flagged.has(key))
    .map(([key, amount]) => ({ key, amount, usual: usual.get(key) ?? 0 }))
    .filter((r) => r.usual > 0 && r.amount > r.usual * HIGH_RATIO && r.amount - r.usual >= spentSoFar * HIGH_MIN_SHARE)
    .sort((a, b) => b.amount - b.usual - (a.amount - a.usual))
    .slice(0, 3);
  for (const r of high) {
    items.push(t('search.overspendHigh', { label: labelOf(ctx, r.key), amount: format(r.amount), usual: format(r.usual) }));
    flagged.add(r.key);
  }

  const assumptions = [t('ask.assumeOverspend')];
  if (items.length === 0) return { text: t('search.answerOverspendNone'), basis: 'inference', assumptions };
  return {
    text: t('search.answerOverspend', { detail: items.join(' · ') }),
    txs: month.filter((x) => flagged.has(groupKey(x))),
    basis: 'inference',
    assumptions,
  };
};

/** Limits this month: over, going faster than the month, or on pace. */
export const budget: Handler = ({ parsed, options, t, categoryLabel, snapshot }) => {
  if (!parsed.wants.budget || !options.budgetStatus?.length) return null;
  const period = parsed.period.label;
  const live = options.budgetStatus.filter((b) => b.limit > 0);
  const over = live.filter((b) => b.ratio > 1).sort((a, b) => b.ratio - a.ratio);
  if (over.length > 0) {
    return {
      text: t('search.answerBudgetOver', {
        label: categoryLabel(over[0].categoryId),
        percent: pct(over[0].ratio),
        count: over.length,
        period,
      }),
    };
  }
  const p = snapshot().projection;
  const elapsed = p.days / p.totalDays;
  const ahead = live.filter((b) => b.ratio > elapsed * AHEAD_RATIO).sort((a, b) => b.ratio - a.ratio);
  if (ahead.length > 0) {
    return {
      text: t('search.answerBudgetAhead', {
        label: categoryLabel(ahead[0].categoryId),
        percent: pct(ahead[0].ratio),
        elapsed: pct(elapsed),
        count: ahead.length,
      }),
    };
  }
  const limit = live.reduce((s, b) => s + b.limit, 0);
  const used = live.reduce((s, b) => s + b.ratio * b.limit, 0);
  return {
    text: t('search.answerBudgetOnPace', { period, used: limit > 0 ? pct(used / limit) : 0, elapsed: pct(elapsed) }),
  };
};

export type Recurring = {
  label: string;
  /** Usual amount per month. */
  amount: number;
  day: number;
  paid: boolean;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Payments that repeat every month: the month's expected bills (history and
 * debts) plus same-note payments of similar size in 2+ of the last 3 months
 * (Netflix, Spotify), which the bill finder skips in "hormiga" concepts.
 */
export function recurringPayments(ctx: AskContext): Recurring[] {
  const s = ctx.snapshot();
  const out: Recurring[] = s.fixed.map((p) => ({
    label: p.label ?? ctx.categoryLabel(p.categoryId),
    amount: p.expectedAmount,
    day: p.typicalDay,
    paid: p.status === 'paid',
  }));
  const known = new Set(s.fixed.map((p) => p.categoryId));

  const cur = budgetMonthOf(new Date());
  const series = new Map<string, { label: string; byMonth: Map<number, Transaction[]> }>();
  for (let back = 0; back <= USUAL_MONTHS; back += 1) {
    const m = shiftMonth(cur.year, cur.monthIndex, -back);
    for (const x of filterByCalendarMonth(ctx.transactions, m.year, m.monthIndex)) {
      if (x.type !== 'expense' || (x.categoryId && known.has(x.categoryId))) continue;
      const key = normalize(x.note ?? '');
      if (key.length < 3) continue;
      const entry = series.get(key) ?? { label: x.note!.trim(), byMonth: new Map() };
      entry.byMonth.set(back, [...(entry.byMonth.get(back) ?? []), x]);
      series.set(key, entry);
    }
  }
  for (const { label, byMonth } of series.values()) {
    const pastMonths = [...byMonth.keys()].filter((b) => b > 0).length;
    if (pastMonths < 2 || [...byMonth.values()].some((txs) => txs.length > 2)) continue;
    const totals = [...byMonth.values()].map(sum);
    const mid = median(totals);
    if (totals.some((v) => Math.abs(v - mid) > mid * RECURRING_SPREAD)) continue;
    const days = [...byMonth.values()].map((txs) => new Date(txs[0].createdAt).getDate());
    out.push({ label, amount: mid, day: Math.round(median(days)), paid: byMonth.has(0) });
  }
  return out.sort((a, b) => a.day - b.day || b.amount - a.amount);
}

/** "¿Qué suscripciones tengo?", "mis gastos fijos": what repeats every month and whether it is paid. */
export const recurring: Handler = (ctx) => {
  const { parsed, format, t } = ctx;
  if (!parsed.wants.recurring || parsed.wants.pastVerb) return null;
  const list = recurringPayments(ctx);
  const assumptions = [t('ask.assumeRecurring')];
  if (list.length === 0) return { text: t('search.answerRecurringNone'), basis: 'inference', assumptions };
  const detail = list
    .map((r) =>
      t('search.recurringItem', {
        label: r.label,
        amount: format(r.amount),
        day: r.day,
        status: t(r.paid ? 'search.recurringPaid' : 'search.recurringPending'),
      })
    )
    .join(' · ');
  return {
    text: t('search.answerRecurring', {
      total: format(list.reduce((s, r) => s + r.amount, 0)),
      count: list.length,
      detail,
    }),
    basis: 'inference',
    assumptions,
  };
};

/** The date a usual day falls on in the current month of the person (it may start on pay day). */
function dueDate(day: number, monthsAhead = 0): Date {
  const cur = budgetMonthOf(new Date());
  const m = shiftMonth(cur.year, cur.monthIndex, monthsAhead);
  const { from } = calendarMonthRange(m.year, m.monthIndex);
  const d = new Date(from.getFullYear(), from.getMonth(), day);
  return d < from ? new Date(from.getFullYear(), from.getMonth() + 1, day) : d;
}

/** "¿Qué me falta pagar este mes?": repeating payments not seen yet, by date. Pro. */
export const upcoming: Handler = (ctx) => {
  const { parsed, options, format, t } = ctx;
  if (!parsed.wants.upcoming) return null;
  const list = recurringPayments(ctx);
  const pending = list.filter((r) => !r.paid);
  if (options.isPro === false) {
    return { text: t('search.answerUpcomingPro', { count: pending.length }), proFeature: 'advisor' };
  }
  const assumptions = [t('ask.assumeRecurring')];
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  if (pending.length === 0) {
    const next = list[0];
    if (!next) return { text: t('search.answerRecurringNone'), basis: 'inference', assumptions };
    return {
      text: t('search.answerUpcomingNoneLeft', {
        label: next.label,
        date: dayLabel(dueDate(next.day, 1), parsed.language),
        amount: format(next.amount),
      }),
      basis: 'estimate',
      assumptions,
    };
  }
  const detail = pending
    .map((r) => {
      const date = dueDate(r.day);
      return t(date < today ? 'search.upcomingItemLate' : 'search.upcomingItem', {
        label: r.label,
        amount: format(r.amount),
        date: dayLabel(date, parsed.language),
      });
    })
    .join(' · ');
  return {
    text: t('search.answerUpcoming', {
      count: pending.length,
      total: format(pending.reduce((s, r) => s + r.amount, 0)),
      detail,
    }),
    basis: 'estimate',
    assumptions,
  };
};

/** Income and money out of each of the last full months that had income. */
function usualMonths(ctx: AskContext): { income: number; left: number } | null {
  const cur = budgetMonthOf(new Date());
  const rows: { income: number; left: number }[] = [];
  for (let back = 1; back <= USUAL_MONTHS; back += 1) {
    const m = shiftMonth(cur.year, cur.monthIndex, -back);
    const txs = filterByCalendarMonth(ctx.transactions, m.year, m.monthIndex);
    const income = sumByType(txs, 'income');
    if (income <= 0) continue;
    rows.push({ income, left: income - sum(outflow(ctx, txs)) });
  }
  if (rows.length === 0) return null;
  return {
    income: rows.reduce((s, r) => s + r.income, 0) / rows.length,
    left: rows.reduce((s, r) => s + r.left, 0) / rows.length,
  };
}

/** "¿Cuánto debería ahorrar?": 20% of income against what is usually left. A suggestion. Pro. */
export const shouldSave: Handler = (ctx) => {
  const { parsed, options, format, t } = ctx;
  if (!parsed.wants.shouldSave) return null;
  if (options.isPro === false) return { text: t('search.answerShouldSavePro'), proFeature: 'advisor' };
  const usual = usualMonths(ctx);
  if (!usual) return { text: t('search.answerShouldSaveNoIncome'), basis: 'hypothesis' };
  const target = usual.income * SAVE_SHARE;
  const assumptions = [t('ask.assumeShouldSave', { percent: pct(SAVE_SHARE) })];
  let text: string;
  if (usual.left >= target) {
    text = t('search.answerShouldSaveTarget', {
      percent: pct(SAVE_SHARE),
      target: format(target),
      perHalf: format(target / 2),
      surplus: format(usual.left),
      free: format(usual.left - target),
    });
  } else if (usual.left > 0) {
    text = t('search.answerShouldSaveSurplus', {
      percent: pct(SAVE_SHARE),
      surplus: format(usual.left),
      target: format(target),
      gap: format(target - usual.left),
    });
  } else {
    text = t('search.answerShouldSaveNone', { short: format(-usual.left) });
  }
  return { text, basis: 'inference', assumptions };
};
