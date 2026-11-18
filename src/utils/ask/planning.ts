import type { Debt, Transaction } from '@/src/types/finance';
import { buildAntSpendTips } from '@/src/utils/antSpendTips';
import {
  budgetMonthOf,
  filterByCalendarMonth,
  filterByPeriod,
  isMonthOutflow,
  shiftMonth,
  predictMonthlySpends,
  revolvingDebtIds,
  sumByType,
  sumSpendOut,
} from '@/src/utils/financeMath';
import { currencyCopyKey } from '@/src/i18n/translations';
import { DAY_MS, MES_AGO_WORDS, MONTH_INDEX, monthLabel, type QueryPeriod } from './period';
import { parseQueryAmount } from './signals';
import { fixedDueBetween, type FinanceSnapshot } from './snapshot';
import { includesAny } from './text';
import type { AskOptions, TFn } from './types';

/** Full months behind this one that set what usually is left over. */
const SURPLUS_MONTHS = 3;

/**
 * A purchase planned for a later month: "en diciembre", "para marzo", "en 3
 * meses", "in May". Null when the question is about this month.
 */
export function affordTarget(
  q: string,
  now = new Date()
): { months: number; year: number; monthIndex: number } | null {
  const cur = budgetMonthOf(now);
  const inMonths = q.match(
    /\b(?:en|dentro de|in|within)\s+(\d{1,2}|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:mes|meses|month|months)\b/
  );
  const EN_WORDS: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  };
  if (inMonths) {
    const raw = inMonths[1];
    const n = /^\d+$/.test(raw) ? Number(raw) : MES_AGO_WORDS[raw] ?? EN_WORDS[raw];
    if (!n || n < 1 || n > 36) return null;
    const d = new Date(cur.year, cur.monthIndex + n, 1);
    return { months: n, year: d.getFullYear(), monthIndex: d.getMonth() };
  }
  const names = Object.keys(MONTH_INDEX).join('|');
  const named = q.match(
    new RegExp(`\\b(?:en|para|hasta|antes de|in|by|for|before)\\s+(?:el mes de\\s+)?(${names})\\b`)
  );
  if (!named) return null;
  const target = MONTH_INDEX[named[1]];
  const diff = (target - cur.monthIndex + 12) % 12;
  if (diff === 0) return null;
  const d = new Date(cur.year, cur.monthIndex + diff, 1);
  return { months: diff, year: d.getFullYear(), monthIndex: d.getMonth() };
}

/** What is usually left each month (income − money out), from the last full months with income. */
export function usualSurplus(transactions: Transaction[], debts: Debt[] = [], now = new Date()): number | null {
  const cur = budgetMonthOf(now);
  const revolving = revolvingDebtIds(debts);
  const left: number[] = [];
  for (let back = 1; back <= SURPLUS_MONTHS; back += 1) {
    const m = shiftMonth(cur.year, cur.monthIndex, -back);
    const txs = filterByCalendarMonth(transactions, m.year, m.monthIndex);
    const income = sumByType(txs, 'income');
    if (income <= 0) continue;
    const out = txs.filter((t) => isMonthOutflow(t, revolving)).reduce((s, t) => s + t.amount, 0);
    left.push(income - out);
  }
  if (left.length === 0) return null;
  return left.reduce((s, n) => s + n, 0) / left.length;
}

/**
 * "¿Me alcanza para un viaje de 2 millones en diciembre?": how much to put
 * aside each month and each fortnight, against what is usually left over.
 * Null when the question is about this month (answerAfford covers it).
 */
export function answerAffordLater(
  q: string,
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions,
  now = new Date()
): { text: string; locked: boolean } | null {
  const amount = parseQueryAmount(q);
  const target = affordTarget(q, now);
  if (amount == null || !target) return null;
  const language = options.language ?? 'es';
  const label = `${monthLabel(target.monthIndex, language)}${
    target.year !== budgetMonthOf(now).year ? ` ${target.year}` : ''
  }`;
  if (options.isPro === false) {
    return { text: t('search.answerAffordLaterPro', { amount: format(amount), label }), locked: true };
  }
  const perMonth = amount / target.months;
  const base = {
    amount: format(amount),
    label,
    perMonth: format(perMonth),
    perHalf: format(perMonth / 2),
    months: target.months,
  };
  const plan =
    target.months === 1 ? t('search.answerAffordLaterPlanOne', base) : t('search.answerAffordLaterPlan', base);
  const surplus = usualSurplus(transactions, options.debts, now);
  if (surplus == null) return { text: `${plan} ${t('search.answerAffordLaterNoIncome')}`, locked: false };
  if (surplus >= perMonth) {
    return {
      text: `${t('search.answerAffordLaterYes', { surplus: format(surplus), free: format(surplus - perMonth) })} ${plan}`,
      locked: false,
    };
  }
  if (surplus <= 0) {
    return {
      text: `${t('search.answerAffordLaterNone', { perMonth: format(perMonth) })} ${plan}`,
      locked: false,
    };
  }
  const needed = Math.ceil(amount / surplus);
  const cur = budgetMonthOf(now);
  const reach = new Date(cur.year, cur.monthIndex + needed, 1);
  return {
    text: `${t('search.answerAffordLaterNo', {
      surplus: format(surplus),
      gap: format(perMonth - surplus),
      label,
    })} ${t('search.answerAffordLaterReach', {
      surplus: format(surplus),
      date: `${monthLabel(reach.getMonth(), language)} ${reach.getFullYear()}`,
    })}`,
    locked: false,
  };
}

/** "¿Cuánto puedo gastar (hoy)?": the room left spread over the days left, from the shared snapshot. */
export function answerDailyAllowance(s: FinanceSnapshot, format: (n: number) => string, t: TFn): string | null {
  if (s.room == null) return null;
  const p = s.projection;
  const days = s.daysLeft;
  if (s.limitedBy === 'cash') {
    // Cash on hand is tighter than what the month's income still covers: say both.
    const available = format(s.available ?? 0);
    const intro =
      s.incomeRoom != null
        ? t('search.answerDailyCashIntro', { room: format(s.incomeRoom), available })
        : t('search.answerDailyCashIntroNoIncome', { available });
    if (s.room <= 0) {
      return `${intro} ${
        s.pendingFixed > 0
          ? t('search.answerDailyBudgetCashNone', { pending: format(s.pendingFixed) })
          : t('search.answerDailyBudgetCashEmpty')
      }`;
    }
    const params = { pending: format(s.pendingFixed), perDay: format(s.room / days), days, room: format(s.room) };
    return `${intro} ${t(s.pendingFixed > 0 ? 'search.answerDailyBudgetCash' : 'search.answerDailyBudgetCashPlain', params)}`;
  }
  if (s.room <= 0) return t('search.answerDailyBudgetNone', { short: format(-s.room) });
  const parts = [t('search.answerDailyBudget', { perDay: format(s.room / days), days, left: format(s.room) })];
  // Same chain as the projection: room − day-to-day spend still to come = where the month lands.
  if (s.projectedLeft != null && p.dailyPace > 0) {
    parts.push(
      s.projectedLeft >= 0
        ? t('search.answerDailyPace', { pace: format(p.dailyPace), left: format(s.projectedLeft) })
        : t('search.answerDailyPaceShort', { pace: format(p.dailyPace), short: format(-s.projectedLeft) })
    );
  }
  if (p.early) parts.push(t('search.answerProjectionEarly'));
  return parts.join(' ');
}

export function answerAfford(
  q: string,
  s: FinanceSnapshot,
  format: (n: number) => string,
  t: TFn,
  options: AskOptions
): string {
  const amount = parseQueryAmount(q);
  const needAmount = currencyCopyKey('search.answerAffordNeedAmount', options.currency ?? 'COP');
  const p = s.projection;
  if (amount == null) {
    // "¿Cuánto puedo gastar?" → a daily budget for the rest of the month.
    if (includesAny(q, ['cuanto', 'how much'])) return answerDailyAllowance(s, format, t) ?? t(needAmount);
    return t(needAmount);
  }

  const available = s.available;
  if (p.income <= 0) {
    if (available == null) return t(needAmount);
    const parts = [
      available >= amount
        ? t('search.answerAffordCash', {
            amount: format(amount),
            available: format(available),
            left: format(available - amount),
          })
        : t('search.answerAffordCashNo', {
            amount: format(amount),
            available: format(available),
            short: format(amount - available),
          }),
    ];
    if (s.pendingFixed > 0) parts.push(t('search.answerAffordPendingNote', { pending: format(s.pendingFixed) }));
    return parts.join(' ');
  }

  // The month's plan (income − spent − bills to come), so it chains with the pace line below.
  const parts: string[] = [];
  if (s.incomeRoom != null) {
    const after = s.incomeRoom - amount;
    parts.push(
      after >= 0
        ? t('search.answerAffordRoom', { room: format(s.incomeRoom), amount: format(amount), after: format(after) })
        : t('search.answerAffordRoomOver', { room: format(s.incomeRoom), amount: format(amount), short: format(-after) })
    );
  }
  const leftAfter = p.projectedLeft - amount;
  parts.push(
    leftAfter >= 0
      ? t('search.answerAffordYes', { amount: format(amount), left: format(leftAfter) })
      : t('search.answerAffordNo', { amount: format(amount), short: format(-leftAfter) })
  );
  // Cash today is a separate limit: the month can cover it while the accounts cannot yet.
  if (available != null && s.cashRoom != null && amount > s.cashRoom) {
    parts.push(
      s.pendingFixed > 0
        ? t('search.answerAffordCashWarnPending', { available: format(available), pending: format(s.pendingFixed) })
        : t('search.answerAffordCashWarn', { available: format(available) })
    );
  }
  if (p.early) parts.push(t('search.answerProjectionEarly'));
  return parts.join(' ');
}

/** Concepts climbing vs last month first; otherwise trim the biggest day-to-day spend. */
export function answerCut(
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions,
  labelFor: (id: string) => string,
  now = new Date()
): string {
  const tips = buildAntSpendTips(
    transactions,
    options.spendConcepts ?? [],
    now,
    options.currency ?? 'COP'
  ).slice(0, 3);
  if (tips.length > 0) {
    const detail = tips
      .map((tip) =>
        t('search.answerCutItem', {
          label: labelFor(tip.categoryId),
          amount: format(tip.current),
          save: format(tip.saveHint),
        })
      )
      .join(' · ');
    const total = tips.reduce((s, tip) => s + tip.saveHint, 0);
    return t('search.answerCut', { detail, total: format(total) });
  }

  const revolving = revolvingDebtIds(options.debts);
  const fixed = new Set(
    predictMonthlySpends(transactions, options.debts ?? [], now, options.spendConcepts).map(
      (p) => p.categoryId
    )
  );
  const byCategory = new Map<string, number>();
  for (const tx of filterByPeriod(transactions, 'mes', now)) {
    if (tx.type !== 'expense' || !tx.categoryId || fixed.has(tx.categoryId)) continue;
    if (!isMonthOutflow(tx, revolving)) continue;
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return t('search.answerCutEmpty');
  return t('search.answerCutTop', {
    label: labelFor(top[0]),
    amount: format(top[1]),
    save: format(top[1] * 0.1),
  });
}

/**
 * Month: fixed payments once + day-to-day spend at its current pace (see
 * projectMonth). Week and fortnight: plain run-rate over the window, since
 * fixed bills are monthly.
 */
export function answerProjection(
  snapshot: FinanceSnapshot,
  list: Transaction[],
  period: QueryPeriod,
  format: (n: number) => string,
  t: TFn,
  debts?: Debt[],
  now = new Date()
): string {
  let projected: number;
  let spent: number;
  let income: number;
  let days: number;
  let totalDays: number;
  let pending = 0;
  let oneOffs = 0;
  let early: boolean;
  if (period.analog === 'month') {
    const p = snapshot.projection;
    ({ spent, income, days, totalDays, early, oneOffs } = p);
    projected = p.projectedSpend;
    pending = p.pendingFixed;
  } else {
    spent = sumSpendOut(list, debts);
    income = sumByType(list, 'income');
    // A week ends today in its range; other windows (a fortnight) carry their real end.
    totalDays =
      period.analog === 'week' ? 7 : Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / DAY_MS));
    days = Math.min(totalDays, Math.max(1, Math.ceil((now.getTime() - period.from.getTime()) / DAY_MS)));
    projected = (spent / days) * totalDays;
    early = days < 3;
  }
  const unit = t(
    period.analog === 'week'
      ? 'search.unitWeek'
      : period.analog === 'month'
        ? 'search.unitMonth'
        : period.fortnight
          ? 'search.unitFortnight'
          : 'search.unitPeriod'
  );
  const parts = [
    t('search.answerProjection', {
      projected: format(projected),
      unit,
      spent: format(spent),
      days,
      total: totalDays,
    }),
  ];
  if (pending > 0) {
    parts.push(t('search.answerProjectionPending', { pending: format(pending) }));
  }
  if (oneOffs > 0) {
    parts.push(t('search.answerProjectionOneOff', { amount: format(oneOffs) }));
  }
  if (income > 0) {
    const left = income - projected;
    parts.push(
      left >= 0
        ? t('search.answerProjectionLeft', { income: format(income), left: format(left) })
        : t('search.answerProjectionShort', { income: format(income), short: format(-left) })
    );
  }
  if (early) parts.push(t('search.answerProjectionEarly'));
  return parts.join(' ');
}

/**
 * "¿Cuánto voy a gastar los próximos 30 días?": repeating bills due in the
 * window plus day-to-day spend at the usual pace. Always an estimate.
 */
export function answerAhead(
  snapshot: FinanceSnapshot,
  period: QueryPeriod,
  format: (n: number) => string,
  t: TFn,
  now = new Date()
): string {
  const days = Math.max(1, Math.round((period.to.getTime() - period.from.getTime()) / DAY_MS));
  const perDay = snapshot.projection.dailyPace;
  const variable = perDay * days;
  const fixed = fixedDueBetween(snapshot, period.from, period.to, now);
  if (variable <= 0 && fixed.total <= 0) return t('search.answerAheadNoData', { label: period.label });
  const params = {
    label: period.label,
    total: format(variable + fixed.total),
    variable: format(variable),
    perDay: format(perDay),
    fixed: format(fixed.total),
    count: fixed.count,
  };
  const parts = [t(fixed.total > 0 ? 'search.answerAhead' : 'search.answerAheadNoFixed', params)];
  if (snapshot.projection.early) parts.push(t('search.answerProjectionEarly'));
  return parts.join(' ');
}
