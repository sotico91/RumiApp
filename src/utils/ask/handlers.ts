import type { TranslationKey } from '@/src/i18n/translations';
import type { ProFeature } from '@/src/utils/pro';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { findSpendSub } from '@/src/data/spendConcepts';
import { antExpenseBreakdown, filterBetween, sumByType, sumSpendOut } from '@/src/utils/financeMath';
import { isCreditDraw } from '@/src/utils/ledger';
import {
  INCOME_CATEGORY_IDS,
  isCreditsCategoryHit,
  matchTransactionsToCategories,
  noteSearchTokens,
  skipIncomeCategoryMatch,
} from './categories';
import {
  accountSpendDetail,
  cardChargeTxs,
  cardObligationTxs,
  expenseTxs,
  obligationTxs,
  rankingDetail,
  topExpenseCategory,
} from './ledger';
import type { ParsedQuery } from './parse';
import { tryAnswerPercentQuery } from './percent';
import { analogRange, dayLabel, previousLabel } from './period';
import { answerAfford, answerAffordLater, answerAhead, answerCut, answerProjection } from './planning';
import { snapshotAssumptions, type FinanceSnapshot } from './snapshot';
import { budget, overspend, recurring, shouldSave, upcoming, why } from './advisor';
import { isCardTopicQuery, parseQueryAmount } from './signals';
import { accountDisplayName, liquidPocketsForPay } from '@/src/utils/accounts';
import { openDebts } from '@/src/utils/debts';
import { pickUsual, usualSourceAccounts } from '@/src/utils/habits';
import { streakFromLedger } from '@/src/utils/streak';
import { includesAny, normalize } from './text';
import type { AskBasis, AskOptions, TFn } from './types';

export type AskContext = {
  parsed: ParsedQuery;
  /** Every transaction, for comparisons and projections. */
  transactions: Transaction[];
  /** Transactions inside the asked period. */
  list: Transaction[];
  format: (n: number) => string;
  t: TFn;
  options: AskOptions;
  spendConcepts: SpendConcept[];
  categoryLabel: (id: string) => string;
  /** The month's shared numbers (available, bills to come, room, pace); built once, on first use. */
  snapshot: () => FinanceSnapshot;
};

export type AskAnswer = {
  text: string;
  /** The movements behind the answer, when it is about specific ones. */
  txs?: Transaction[];
  /** The time the answer covers, when it is not the asked period (notes search the whole history). */
  period?: string;
  /** The answer is a Pro feature the free plan does not have. */
  proFeature?: ProFeature;
  /** How sure the answer is; missing = fact. */
  basis?: AskBasis;
  /** What an estimate or inference takes for granted, ready to show. */
  assumptions?: string[];
};

export type Handler = (ctx: AskContext) => AskAnswer | null;

const sum = (list: Transaction[]) => list.reduce((s, x) => s + x.amount, 0);

/** How the asked concepts read in an answer ("Café", "Café + Delivery", "Comida / restaurantes"). */
export function conceptLabel(ctx: AskContext): string | null {
  const { cats } = ctx.parsed;
  if (!cats) return null;
  if (cats.label === 'food-group') return ctx.t('search.labelFood');
  if (cats.displayName && !cats.displayName.startsWith('concept-')) return cats.displayName;
  return cats.ids.map(ctx.categoryLabel).join(' + ');
}

const isIncomeHit = (ctx: AskContext) =>
  !!ctx.parsed.cats?.ids.some((id) => INCOME_CATEGORY_IDS.includes(id));

const percent: Handler = (ctx) => {
  const { parsed, list, format, t, spendConcepts, categoryLabel } = ctx;
  const text = tryAnswerPercentQuery(parsed.q, list, parsed.period.label, format, t, spendConcepts, categoryLabel, {
    wantsPercent: parsed.wants.percent,
    wantsTop: parsed.wants.top,
    wantsSavings: parsed.wants.savings,
    wantsAnt: parsed.wants.ant,
    wantsIncome: parsed.wants.income,
    cats: parsed.cats,
    debts: ctx.options.debts,
  });
  return text ? { text } : null;
};

/** "¿Cuántos días llevo de racha?": the streak the header chip shows. */
const streak: Handler = ({ parsed, transactions, options, t }) => {
  if (!parsed.wants.streak) return null;
  const s = streakFromLedger(transactions, options.noSpendDays);
  const parts = [s.current > 0 ? t('ask.streakDays', { count: s.current }) : t('ask.streakZero')];
  if (s.freezes > 0) parts.push(t('ask.streakFreezes', { count: s.freezes }));
  parts.push(t(s.todayDone ? 'ask.streakTodayDone' : 'ask.streakTodayPending'));
  return { text: parts.join(' ') };
};

/**
 * "¿De qué cuenta puedo pagar 100 mil?" / "¿con qué cuenta pago la tarjeta?":
 * the pockets that cover the whole amount, the usual one first. Without an
 * amount, a debt named in the question (or the only open one) sets it.
 */
const payFrom: Handler = ({ parsed, transactions, options, format, t }) => {
  if (!parsed.wants.payFrom || !options.accounts) return null;
  const debts = openDebts(options.debts ?? []);
  const q = parsed.q;
  const named =
    debts.find((d) => {
      const name = normalize(d.nameKey ? t(d.nameKey as TranslationKey) : d.name ?? '');
      return name.length > 2 && q.includes(name);
    }) ?? (debts.length === 1 && (parsed.wants.debt || parsed.wants.cardPay || isCardTopicQuery(q)) ? debts[0] : undefined);
  const amount = parseQueryAmount(q) ?? (named ? named.balance : null);
  // "¿Qué cuenta tiene más plata?" has no amount and no payment: other handlers answer it.
  if (!amount || amount <= 0) return /\bpag(?:ar|o|ue)\b|\bpay\b/.test(q) ? { text: t('ask.payFromNeedAmount') } : null;
  const pockets = liquidPocketsForPay(options.accounts, undefined, amount);
  if (pockets.length === 0) {
    const richest = [...liquidPocketsForPay(options.accounts)].sort((a, b) => b.balance - a.balance)[0];
    return {
      text: richest
        ? t('ask.payFromNone', {
            amount: format(amount),
            account: accountDisplayName(richest, t),
            available: format(richest.balance),
          })
        : t('ask.payFromEmpty', { amount: format(amount) }),
    };
  }
  const type = named || parsed.wants.debtPayments ? 'debt_payment' : 'expense';
  const usual = pickUsual(usualSourceAccounts(transactions, { type, debtId: named?.id }), pockets);
  const ordered = usual ? [pockets.find((a) => a.id === usual)!, ...pockets.filter((a) => a.id !== usual)] : pockets;
  const list = ordered.map((a) => `${accountDisplayName(a, t)} (${format(a.balance)})`).join(', ');
  return {
    text: t(usual ? 'ask.payFromUsual' : 'ask.payFromList', {
      amount: format(amount),
      list,
      account: usual ? accountDisplayName(ordered[0], t) : '',
    }),
  };
};

/** An estimate from the shared snapshot, with what it takes for granted. */
const estimate = (ctx: AskContext, text: string): AskAnswer => ({
  text,
  basis: 'estimate',
  assumptions: snapshotAssumptions(ctx.snapshot(), ctx.t),
});

const afford: Handler = (ctx) => {
  if (!ctx.parsed.wants.afford) return null;
  const later = answerAffordLater(ctx.parsed.q, ctx.transactions, ctx.format, ctx.t, ctx.options);
  if (later) {
    if (later.locked) return { text: later.text, proFeature: 'afford' };
    return { text: later.text, basis: 'estimate', assumptions: [ctx.t('ask.assumeSurplus')] };
  }
  const text = answerAfford(ctx.parsed.q, ctx.snapshot(), ctx.format, ctx.t, ctx.options);
  // Without an amount it only asks for one: nothing estimated yet.
  return parseQueryAmount(ctx.parsed.q) == null && ctx.snapshot().room == null ? { text } : estimate(ctx, text);
};

const cut: Handler = (ctx) =>
  ctx.parsed.wants.cut
    ? {
        text: answerCut(ctx.transactions, ctx.format, ctx.t, ctx.options, ctx.categoryLabel),
        basis: 'inference',
        assumptions: [ctx.t('ask.assumeCut')],
      }
    : null;

/**
 * "¿cuánto me queda?" with no month-end words: cash on hand now, what is left
 * once this month's pending bills are paid, then where the month lands.
 */
const leftNow: Handler = (ctx) => {
  const { parsed, options, format, t, snapshot } = ctx;
  if (!parsed.wants.leftNow || parsed.wants.upcoming || options.availableCash == null) return null;
  const s = snapshot();
  const parts = [t('search.answerAvailable', { amount: format(options.availableCash) })];
  if (s.cashRoom != null && s.pendingFixed > 0) {
    parts.push(
      s.cashRoom >= 0
        ? t('search.answerLeftAfterBills', { pending: format(s.pendingFixed), left: format(s.cashRoom) })
        : t('search.answerLeftAfterBillsShort', { pending: format(s.pendingFixed), short: format(-s.cashRoom) })
    );
  }
  const p = s.projection;
  if (p.income > 0) {
    parts.push(
      p.projectedLeft >= 0
        ? t('search.answerProjectionLeft', { income: format(p.income), left: format(p.projectedLeft) })
        : t('search.answerProjectionShort', { income: format(p.income), short: format(-p.projectedLeft) })
    );
  }
  // Cash on hand alone is a fact; bills to come and the month's landing are estimates.
  return parts.length > 1 ? estimate(ctx, parts.join(' ')) : { text: parts.join(' ') };
};

/** Month and running weeks/fortnights: pace to the end. Windows ahead ("próximos 30 días"): an estimate. */
const projection: Handler = (ctx) => {
  const { parsed } = ctx;
  if (parsed.period.ahead) return estimate(ctx, answerAhead(ctx.snapshot(), parsed.period, ctx.format, ctx.t));
  if (!parsed.wants.projection || !parsed.inProgress || parsed.period.analog === 'day') return null;
  const text = answerProjection(ctx.snapshot(), ctx.list, parsed.period, ctx.format, ctx.t, ctx.options.debts);
  // Weeks and fortnights run at their own daily average; only the month uses the snapshot.
  if (parsed.period.analog === 'month') return estimate(ctx, text);
  return { text, basis: 'estimate', assumptions: [ctx.t('ask.assumeRunRate')] };
};

const savings: Handler = ({ parsed, list, options, format, t }) => {
  if (!parsed.wants.savings) return null;
  const period = parsed.period.label;
  const income = sumByType(list, 'income');
  // Same rule as Home: expenses + loan installments; card payments are not new spend.
  const expense = sumSpendOut(list, options.debts);
  const obligations = sum(cardObligationTxs(list, options.debts));
  const saved = income - expense;
  const cardNote = obligations > 0 ? ` ${t('search.answerCardPayNote', { obligations: format(obligations) })}` : '';
  const amounts = { period, income: format(income), expenses: format(expense) };
  if (saved < 0) {
    const key = parsed.inProgress ? 'search.answerOverspentSoFar' : 'search.answerOverspent';
    return { text: t(key, { ...amounts, amount: format(-saved) }) + cardNote };
  }
  if (parsed.inProgress) {
    return { text: t('search.answerSavingsSoFar', { ...amounts, amount: format(saved) }) + cardNote };
  }
  if (obligations > 0) {
    return {
      text: t('search.answerSavingsWithObligations', {
        ...amounts,
        amount: format(saved),
        obligations: format(obligations),
      }),
    };
  }
  return { text: t('search.answerSavings', { ...amounts, amount: format(saved) }) };
};

const available: Handler = ({ parsed, options, format, t }) =>
  parsed.wants.available && options.availableCash != null
    ? { text: t('search.answerAvailable', { amount: format(options.availableCash) }) }
    : null;

const cardPayments: Handler = ({ parsed, list, options, format, t }) => {
  const { wants, q } = parsed;
  if (!(wants.cardPay || (isCardTopicQuery(q) && !wants.spendVerb && wants.debtPayments))) return null;
  const period = parsed.period.label;
  const payments = cardObligationTxs(list, options.debts);
  const charges = cardChargeTxs(list);
  if (payments.length === 0) {
    if (charges.length > 0 && wants.spendVerb) {
      return {
        text: t('search.answerCardCharges', { amount: format(sum(charges)), period, count: charges.length }),
        txs: charges,
      };
    }
    return { text: t('search.answerCardPayEmpty', { period }) };
  }
  if (wants.count) {
    return {
      text: t('search.answerCount', { count: payments.length, label: t('search.labelCardPay'), period }),
      txs: payments,
    };
  }
  if (charges.length > 0 && wants.spendVerb) {
    return {
      text: t('search.answerCardChargesWithPay', {
        amount: format(sum(charges)),
        period,
        count: charges.length,
        paid: format(sum(payments)),
        paidCount: payments.length,
      }),
      txs: [...charges, ...payments],
    };
  }
  return {
    text: t('search.answerCardPay', { amount: format(sum(payments)), period, count: payments.length }),
    txs: payments,
  };
};

const debtPayments: Handler = (ctx) => {
  const { parsed, list, spendConcepts, format, t } = ctx;
  if (!parsed.wants.debtPayments) return null;
  const { cats } = parsed;
  const period = parsed.period.label;
  let payments = obligationTxs(list);
  if (cats) {
    const matched = matchTransactionsToCategories(list, cats, spendConcepts, 'obligation');
    if (matched.length > 0) payments = matched;
  }
  if (payments.length === 0) return { text: t('search.answerObligationsEmpty', { period }) };
  const label =
    cats?.displayName && !cats.displayName.startsWith('concept-')
      ? cats.displayName
      : t('search.labelObligation');
  if (parsed.wants.count) {
    return { text: t('search.answerCount', { count: payments.length, label, period }), txs: payments };
  }
  return {
    text: t('search.answerObligations', { amount: format(sum(payments)), period, count: payments.length }),
    txs: payments,
  };
};

const debtBalance: Handler = ({ parsed, options, format, t }) =>
  parsed.wants.debt && options.debtsTotal != null && !parsed.cats
    ? { text: t('search.answerDebt', { amount: format(options.debtsTotal) }) }
    : null;

const top: Handler = (ctx) => {
  const { parsed, list, spendConcepts, format, t, categoryLabel } = ctx;
  if (!parsed.wants.top || parsed.cats) return null;
  const period = parsed.period.label;
  const best = topExpenseCategory(list, spendConcepts);
  if (!best) return { text: t('search.answerEmptyPeriod', { period }) };
  const hit = findSpendSub(spendConcepts, best.categoryId);
  const label = hit ? `${hit.concept.name}/${hit.sub.name}` : categoryLabel(best.categoryId);
  const conceptIds = new Set(hit ? hit.concept.subs.map((s) => s.id) : [best.categoryId]);
  const txs = expenseTxs(list).filter((x) => x.categoryId && conceptIds.has(x.categoryId));
  const income = sumByType(list, 'income');
  const base = { label, amount: format(best.amount), period, count: best.count };
  if (income > 0) {
    return {
      text: t('search.answerTopWithIncome', {
        ...base,
        percent: Math.round((best.amount / income) * 100),
        income: format(income),
      }),
      txs,
    };
  }
  return { text: t('search.answerTop', base), txs };
};

/** One or more concepts, optionally by payment method, compared, counted or averaged. */
const concept: Handler = (ctx) => {
  const { parsed, list, transactions, spendConcepts, options, format, t } = ctx;
  const { cats, method, wants } = parsed;
  if (!cats || isIncomeHit(ctx)) return null;
  const period = parsed.period.label;
  const mode = isCreditsCategoryHit(cats, spendConcepts) ? 'obligation' : 'expense';
  const pick = (source: Transaction[]) => {
    const matched = matchTransactionsToCategories(source, cats, spendConcepts, mode);
    return method ? matched.filter((x) => x.paymentMethod === method) : matched;
  };
  const matched = pick(list);
  const amount = sum(matched);
  const label = conceptLabel(ctx) ?? '';

  if (wants.compare) {
    const prevRange = analogRange(parsed.period);
    const prevAmount = sum(pick(filterBetween(transactions, prevRange.from, prevRange.to)));
    const diff = amount - prevAmount;
    return {
      text: t('search.answerCompareCategory', {
        label,
        period,
        compare: previousLabel(parsed.period, prevRange, parsed.language, t),
        amount: format(Math.abs(diff)),
        direction: diff >= 0 ? t('search.more') : t('search.less'),
        now: format(amount),
        prev: format(prevAmount),
      }),
      txs: matched,
    };
  }
  if (matched.length === 0) return { text: t('search.answerCategoryEmpty', { label, period }) };

  const base = { label, amount: format(amount), period, count: matched.length };
  if (mode === 'obligation') return { text: t('search.answerObligationsNamed', base), txs: matched };
  if (wants.average) {
    return {
      text: t('search.answerAverage', { ...base, amount: format(amount / matched.length) }),
      txs: matched,
    };
  }
  if (wants.count) {
    return { text: t('search.answerCount', { count: matched.length, label, period }), txs: matched };
  }
  if (method) {
    return {
      text: t('search.answerCategoryMethod', {
        label,
        method: t(`method.${method}` as TranslationKey),
        amount: format(amount),
        period,
      }),
      txs: matched,
    };
  }
  if (wants.origin) {
    const detail = accountSpendDetail(matched, options.accounts, t, format);
    if (detail) return { text: t('search.answerByAccount', { ...base, detail }), txs: matched };
  }
  return { text: t('search.answerCategory', base), txs: matched };
};

const ant: Handler = ({ parsed, list, spendConcepts, format, t, categoryLabel }) => {
  if (!parsed.wants.ant) return null;
  const period = parsed.period.label;
  const breakdown = antExpenseBreakdown(list, spendConcepts);
  if (breakdown.items.length === 0) return { text: t('search.answerAntEmpty', { period }) };
  const ids = new Set(breakdown.items.map((i) => i.categoryId));
  return {
    text: t('search.answerAntDetail', {
      amount: format(breakdown.total),
      period,
      detail: breakdown.items
        .slice(0, 3)
        .map((i) => `${categoryLabel(i.categoryId)} ${format(i.amount)}`)
        .join(' · '),
    }),
    txs: expenseTxs(list).filter((x) => x.categoryId && ids.has(x.categoryId)),
  };
};

const comparePeriods: Handler = ({ parsed, list, transactions, options, format, t }) => {
  if (!parsed.wants.compare) return null;
  const prevRange = analogRange(parsed.period);
  // Same money-out rule as Home and Activity, so both months read like the totals there.
  const nowSpend = sumSpendOut(list, options.debts);
  const prevSpend = sumSpendOut(filterBetween(transactions, prevRange.from, prevRange.to), options.debts);
  const diff = nowSpend - prevSpend;
  return {
    text: t('search.answerComparePeriods', {
      period: parsed.period.label,
      compare: previousLabel(parsed.period, prevRange, parsed.language, t),
      amount: format(Math.abs(diff)),
      direction: diff >= 0 ? t('search.more') : t('search.less'),
      now: format(nowSpend),
      prev: format(prevSpend),
    }),
    txs: expenseTxs(list),
  };
};

const income: Handler = (ctx) => {
  const { parsed, list, format, t } = ctx;
  if (!parsed.wants.income && !(isIncomeHit(ctx) && !skipIncomeCategoryMatch(parsed.q))) return null;
  const period = parsed.period.label;
  const txs = list.filter((x) => x.type === 'income');
  if (parsed.wants.count) {
    return { text: t('search.answerCount', { count: txs.length, label: t('home.income'), period }), txs };
  }
  return { text: t('search.answerIncome', { amount: format(sum(txs)), period }), txs };
};

/** Cash advances and cupo drawn into a pocket (card, credicheque, rotativo). */
const creditDraws: Handler = ({ parsed, list, format, t }) => {
  if (!parsed.wants.creditDraw) return null;
  const period = parsed.period.label;
  const txs = list.filter(isCreditDraw);
  if (txs.length === 0) return { text: t('search.answerCreditDrawsEmpty', { period }) };
  return {
    text: t('search.answerCreditDraws', { amount: format(sum(txs)), period, count: txs.length }),
    txs,
  };
};

const transfers: Handler = ({ parsed, list, format, t }) => {
  const { wants, method, q, noteNeedle } = parsed;
  if (!wants.transfer && !(method === 'transfer' && includesAny(q, ['envie', 'envié', 'mande', 'mandé']))) {
    return null;
  }
  const period = parsed.period.label;
  // Your own money moving; advances drawn on credit have their own answer.
  let txs = list.filter((x) => x.type === 'transfer' && !isCreditDraw(x));
  if (noteNeedle) {
    txs = txs.filter((x) => normalize(x.note ?? '').includes(noteNeedle));
    return {
      text: t('search.answerNote', { label: noteNeedle, amount: format(sum(txs)), period, count: txs.length }),
      txs,
    };
  }
  return { text: t('search.answerTransferPeriod', { amount: format(sum(txs)), period }), txs };
};

const paymentMethod: Handler = ({ parsed, list, options, format, t }) => {
  const { method, q, wants } = parsed;
  if (!method) return null;
  const period = parsed.period.label;
  if (method === 'credit' || isCardTopicQuery(q)) {
    const charges = cardChargeTxs(list);
    const payments = cardObligationTxs(list, options.debts);
    if (charges.length === 0 && payments.length === 0) {
      return { text: t('search.answerCardPayEmpty', { period }) };
    }
    if (payments.length > 0) {
      return {
        text: t('search.answerCardChargesWithPay', {
          amount: format(sum(charges)),
          period,
          count: charges.length,
          paid: format(sum(payments)),
          paidCount: payments.length,
        }),
        txs: [...charges, ...payments],
      };
    }
    return {
      text: t('search.answerCardCharges', { amount: format(sum(charges)), period, count: charges.length }),
      txs: charges,
    };
  }
  const txs = expenseTxs(list).filter((x) => x.paymentMethod === method);
  const methodLabel = t(`method.${method}` as TranslationKey);
  if (wants.count) {
    return { text: t('search.answerCount', { count: txs.length, label: methodLabel, period }), txs };
  }
  return { text: t('search.answerMethod', { method: methodLabel, amount: format(sum(txs)), period }), txs };
};

/** Notes are looked up in the asked period, or in the whole history when the question named none. */
function noteScope({ parsed, list, transactions, t }: AskContext) {
  return parsed.period.explicit
    ? { pool: list, period: parsed.period.label }
    : { pool: transactions, period: t('search.periodAllTime') };
}

/** A word in a note, also in singular: "recargas" finds "Recarga Movistar", "didis" finds "Didi". */
function noteHas(note: string, tok: string): boolean {
  if (note.includes(tok)) return true;
  if (tok.length > 4 && tok.endsWith('es') && note.includes(tok.slice(0, -2))) return true;
  return tok.length > 3 && tok.endsWith('s') && note.includes(tok.slice(0, -1));
}

type NoteMatch = { txs: Transaction[]; label: string; full: boolean };

/**
 * Movements whose note has every word. Failing that, the ones with the most of
 * them ("recarga movistar" still finds "Movistar"), labelled with the words found.
 */
function matchNotes(pool: Transaction[], tokens: string[]): NoteMatch {
  const scored = pool.map((x) => {
    const note = normalize(x.note ?? '');
    return { x, hits: note ? tokens.filter((tok) => noteHas(note, tok)) : [] };
  });
  const best = scored.reduce((m, s) => Math.max(m, s.hits.length), 0);
  if (best === 0) return { txs: [], label: tokens.join(' '), full: false };
  const top = scored.filter((s) => s.hits.length === best);
  const found = tokens.filter((tok) => top.some((s) => s.hits.includes(tok)));
  return { txs: top.map((s) => s.x), label: found.join(' '), full: best === tokens.length };
}

/** The words a note search uses: the quoted or "para/por X" word, else what is left of the question. */
function noteTokens(parsed: ParsedQuery): string[] {
  return parsed.noteNeedle ? [parsed.noteNeedle] : noteSearchTokens(parsed.q);
}

/** Notes for a question; "didi y uber" adds both up when each one is found on its own. */
function findNotes(pool: Transaction[], parsed: ParsedQuery): NoteMatch {
  if (parsed.noteNeedle) return matchNotes(pool, [parsed.noteNeedle]);
  const groups = parsed.q
    .split(/\s(?:y|o|e|and|or)\s/)
    .map(noteSearchTokens)
    .filter((g) => g.length > 0);
  if (groups.length > 1) {
    const parts = groups.map((g) => matchNotes(pool, g));
    if (parts.every((p) => p.full)) {
      return {
        txs: [...new Set(parts.flatMap((p) => p.txs))],
        label: parts.map((p) => p.label).join(' + '),
        full: true,
      };
    }
  }
  return matchNotes(pool, groups.flat());
}

const newestFirst = (txs: Transaction[]) => [...txs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const dateOf = (ctx: AskContext, x: Transaction) => dayLabel(new Date(x.createdAt), ctx.parsed.language);

/** What a movement was, in a few words: its note, else its category. */
const describe = (ctx: AskContext, x: Transaction) =>
  x.note?.trim() || (x.categoryId ? ctx.categoryLabel(x.categoryId) : ctx.t('home.expenses'));

/** "How much" on a note (or how many times, or the average), with the days when there are one or two. */
function noteAnswer(ctx: AskContext, label: string, period: string, txs: Transaction[]): AskAnswer {
  const { wants } = ctx.parsed;
  const params = { label, amount: ctx.format(sum(txs)), period, count: txs.length };
  if (txs.length > 0 && wants.average) {
    return {
      text: ctx.t('search.answerNoteAverage', { ...params, average: ctx.format(sum(txs) / txs.length) }),
      txs,
      period,
    };
  }
  if (txs.length > 0 && wants.count) return { text: ctx.t('search.answerNoteCount', params), txs, period };
  if (txs.length === 0 || txs.length > 2) return { text: ctx.t('search.answerNote', params), txs, period };
  const dates = newestFirst(txs)
    .map((x) => dateOf(ctx, x))
    .join(' · ');
  return { text: ctx.t('search.answerNoteDated', { ...params, dates }), txs, period };
}

/**
 * Notes with every word, else the named concept ("café"), else the notes with
 * most of the words. `partial: false` drops that last step.
 */
function notesOrConcept(ctx: AskContext, pool: Transaction[], partial = true): NoteMatch {
  const { parsed, spendConcepts } = ctx;
  const notes = findNotes(pool, parsed);
  if (notes.full || !parsed.cats) {
    return partial || notes.full ? notes : { txs: [], label: noteTokens(parsed).join(' '), full: false };
  }
  const ids = parsed.cats.ids;
  const txs = isIncomeHit(ctx)
    ? pool.filter((x) => x.type === 'income' && !!x.categoryId && ids.includes(x.categoryId))
    : matchTransactionsToCategories(pool, parsed.cats, spendConcepts, 'spendOut');
  return { txs, label: conceptLabel(ctx) ?? notes.label, full: true };
}

/** Whether the asked words exist anywhere at all, so "not found" is an answer and not a misread. */
const knownWords = (ctx: AskContext) =>
  !!ctx.parsed.cats || findNotes(ctx.transactions, ctx.parsed).txs.length > 0;

/** "¿cuál fue mi gasto más grande?", "¿cuál fue mi último gasto?": one movement, not a total. */
const single: Handler = (ctx) => {
  const { parsed, format, t } = ctx;
  const { biggest, latest } = parsed.wants;
  if (!biggest && !latest) return null;
  // "Last" means the last one ever unless a period is named; "biggest" is within the period.
  const wide = latest && !parsed.period.explicit;
  const pool = expenseTxs(wide ? ctx.transactions : ctx.list);
  const period = wide ? t('search.periodAllTime') : parsed.period.label;
  if (pool.length === 0) return { text: t('search.answerEmptyPeriod', { period }) };
  const x = latest ? newestFirst(pool)[0] : pool.reduce((m, y) => (y.amount > m.amount ? y : m));
  const params = { label: describe(ctx, x), amount: format(x.amount), date: dateOf(ctx, x), period };
  return { text: t(latest ? 'search.answerLatest' : 'search.answerBiggest', params), txs: [x], period };
};

const MAX_LISTED = 5;

/** "¿en qué gasté el 19 de octubre?", "¿qué compré ayer?": the movements themselves. */
const listed: Handler = (ctx) => {
  const { parsed, list, format, t } = ctx;
  if (!parsed.wants.list || includesAny(parsed.q, ['mas', 'more', 'most'])) return null;
  // "muéstrame los gastos de didi" is a note search; "en qué gasté en café" is the concept.
  if (parsed.cats || (noteTokens(parsed).length > 0 && knownWords(ctx))) return null;
  const period = parsed.period.label;
  const txs = newestFirst(expenseTxs(list));
  if (txs.length === 0) return { text: t('search.answerEmptyPeriod', { period }) };
  const items = txs
    .slice(0, MAX_LISTED)
    .map((x) => `${describe(ctx, x)} ${format(x.amount)}`)
    .join(' · ');
  const more = txs.length - MAX_LISTED;
  return {
    text: t(more > 0 ? 'search.answerListMore' : 'search.answerList', { period, items, more, total: format(sum(txs)) }),
    txs,
  };
};

/** "¿ya pagué netflix?", "¿pagué el arriendo este mes?": yes and when, or no and the last time. */
const confirm: Handler = (ctx) => {
  const { parsed, list, format, t } = ctx;
  if (!parsed.wants.confirm || noteTokens(parsed).length === 0 || !knownWords(ctx)) return null;
  const period = parsed.period.label;
  // A partial note match would say "yes" to the wrong thing ("Recarga Claro" for "recarga movistar").
  const { txs, label } = notesOrConcept(ctx, list, false);
  if (txs.length > 0) {
    const [last] = newestFirst(txs);
    return {
      text: t('search.answerConfirmYes', { label, date: dateOf(ctx, last), amount: format(last.amount) }),
      txs,
    };
  }
  const [before] = newestFirst(notesOrConcept(ctx, ctx.transactions, false).txs);
  if (!before) return { text: t('search.answerConfirmNo', { label, period }) };
  return {
    text: t('search.answerConfirmNoLast', { label, period, date: dateOf(ctx, before), amount: format(before.amount) }),
    txs: [before],
  };
};

/** "¿qué día tomé didi?", "¿cuándo compré café?": the day it happened, not just the amount. */
const when: Handler = (ctx) => {
  const { parsed, format, t } = ctx;
  if (!parsed.wants.when) return null;
  const { pool, period } = noteScope(ctx);
  if (noteTokens(parsed).length === 0 && !parsed.cats) return null;
  const { txs, label } = notesOrConcept(ctx, pool);
  if (txs.length === 0) {
    // "¿qué día gasté más?" has no note to find: leave it to the other handlers.
    return knownWords(ctx) ? { text: t('search.answerWhenNone', { label, period }), period } : null;
  }
  const [last] = newestFirst(txs);
  const params = { label, period, date: dateOf(ctx, last), amount: format(last.amount) };
  if (txs.length === 1) return { text: t('search.answerWhenOne', params), txs, period };
  // "¿En qué fecha…?" with several: every date (newest first), what it was and how much.
  const newest = newestFirst(txs);
  const shown = newest
    .slice(0, MAX_LISTED)
    .map((x) => `${dateOf(ctx, x)}: ${describe(ctx, x)} ${format(x.amount)}`)
    .join(' · ');
  const more = txs.length - MAX_LISTED;
  const items = more > 0 ? t('search.whenMore', { items: shown, more }) : shown;
  return {
    text: t('search.answerWhenMany', { ...params, count: txs.length, total: format(sum(txs)), items }),
    txs,
    period,
  };
};

/**
 * A note with every word beats a concept reached through a keyword: "almuerzo
 * con Ana" is that lunch, not all food; "netflix" is Netflix, not every
 * subscription. Naming the category itself ("café", "transporte") stays a concept.
 */
const noteFirst: Handler = (ctx) => {
  const { parsed } = ctx;
  if (!parsed.cats) return null;
  const tokens = noteTokens(parsed);
  const name = normalize(conceptLabel(ctx) ?? '');
  if (tokens.length === 0 || tokens.some((tok) => noteHas(name, tok))) return null;
  const { pool, period } = noteScope(ctx);
  const notes = findNotes(pool, parsed);
  return notes.full ? noteAnswer(ctx, notes.label, period, notes.txs) : null;
};

/** Nothing else matched: maybe the words live in a note ("pizza", "cine con Ana"). */
const looseNote: Handler = (ctx) => {
  const { parsed } = ctx;
  if (parsed.noteNeedle || noteSearchTokens(parsed.q).length === 0) return null;
  const { pool, period } = noteScope(ctx);
  const { txs, label, full } = findNotes(pool, parsed);
  if (txs.length === 0) return null;
  const answer = noteAnswer(ctx, label, period, txs);
  // Only some of the words matched: a likely hit, not a certain one.
  return full ? answer : { ...answer, basis: 'inference', assumptions: [ctx.t('ask.assumePartialNote', { label })] };
};

const noteNeedle: Handler = (ctx) => {
  const { noteNeedle: needle, noteQuoted } = ctx.parsed;
  if (!needle) return null;
  // "para Ana" read from free text: if no note ever had it, it was a misread, not a $0 answer.
  if (!noteQuoted && matchNotes(ctx.transactions, [needle]).txs.length === 0) return null;
  const { pool, period } = noteScope(ctx);
  return noteAnswer(ctx, needle, period, matchNotes(pool, [needle]).txs);
};

const totals: Handler = ({ parsed, list, spendConcepts, format, t, categoryLabel }) => {
  if (!parsed.period.explicit && (parsed.wants.savings || !parsed.wants.totals)) return null;
  // "¿Por qué tengo menos plata?" asks for a reason; a bare total would read as one.
  if (parsed.wants.why) return null;
  const period = parsed.period.label;
  const expenses = expenseTxs(list);
  const obligations = obligationTxs(list);
  const amount = sum(expenses);
  const count = expenses.length;
  if (count === 0 && obligations.length === 0) return { text: t('search.answerEmptyPeriod', { period }) };
  if (count === 0) {
    return {
      text: t('search.answerObligations', { amount: format(sum(obligations)), period, count: obligations.length }),
      txs: obligations,
    };
  }
  if (parsed.wants.average) {
    return {
      text: t('search.answerAverage', { label: t('home.expenses'), amount: format(amount / count), period, count }),
      txs: expenses,
    };
  }
  if (parsed.wants.count) {
    return { text: t('search.answerCount', { count, label: t('home.expenses'), period }), txs: expenses };
  }
  const detail = rankingDetail(expenses, spendConcepts, format, categoryLabel);
  if (obligations.length > 0) {
    return {
      text: t('search.answerExpensesVsObligations', {
        expenses: format(amount),
        expenseCount: count,
        obligations: format(sum(obligations)),
        obligationCount: obligations.length,
        period,
        detail: detail || t('insights.emptyPeriod'),
      }),
      txs: [...expenses, ...obligations],
    };
  }
  if (detail) {
    return { text: t('search.answerExpensesDetail', { amount: format(amount), period, count, detail }), txs: expenses };
  }
  return { text: t('search.answerExpenses', { amount: format(amount), period, count }), txs: expenses };
};

/**
 * First match answers. The order is the engine's precedence: specific asks
 * ("% of my salary", "can I afford") before broad ones ("how much this month").
 * Concepts come before "hormiga" so "café" wins over the ant-spend summary.
 */
export const HANDLERS = {
  streak,
  payFrom,
  percent,
  afford,
  cut,
  shouldSave,
  upcoming,
  leftNow,
  projection,
  why,
  overspend,
  savings,
  available,
  creditDraws,
  cardPayments,
  debtPayments,
  debtBalance,
  single,
  listed,
  top,
  budget,
  recurring,
  confirm,
  when,
  noteFirst,
  concept,
  ant,
  comparePeriods,
  income,
  transfers,
  paymentMethod,
  looseNote,
  noteNeedle,
  totals,
} satisfies Record<string, Handler>;

export type AskIntent = keyof typeof HANDLERS;
