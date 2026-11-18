import type { Period } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import {
  detectCategoryList,
  isIncomeUsedAsReference,
  skipIncomeCategoryMatch,
  type CategoryHit,
} from './categories';
import { LEXICON } from './lexicon';
import { isInProgress, resolvePeriod, type QueryPeriod } from './period';
import {
  detectPaymentMethod,
  extractNoteNeedle,
  isCardPaymentQuery,
  isCardTopicQuery,
  isCompareQuery,
  type PaymentMethod,
} from './signals';
import { hasStem, includesAny, normalize } from './text';
import type { TFn } from './types';

/** What the question asks for. Several can be on at once; handlers decide who answers. */
export type QueryWants = {
  streak: boolean;
  payFrom: boolean;
  count: boolean;
  income: boolean;
  savings: boolean;
  projection: boolean;
  cut: boolean;
  afford: boolean;
  ant: boolean;
  spendVerb: boolean;
  payVerb: boolean;
  cardPay: boolean;
  debt: boolean;
  debtPayments: boolean;
  available: boolean;
  leftNow: boolean;
  compare: boolean;
  origin: boolean;
  transfer: boolean;
  creditDraw: boolean;
  top: boolean;
  average: boolean;
  budget: boolean;
  percent: boolean;
  when: boolean;
  confirm: boolean;
  list: boolean;
  biggest: boolean;
  latest: boolean;
  totals: boolean;
  /** "¿por qué…?": asks for a reason, not an amount. */
  why: boolean;
  overspend: boolean;
  recurring: boolean;
  upcoming: boolean;
  shouldSave: boolean;
  pastVerb: boolean;
};

export type ParsedQuery = {
  /** Normalized text: lower case, no accents. */
  q: string;
  language: 'en' | 'es';
  period: QueryPeriod;
  /** The period has started and not ended yet. */
  inProgress: boolean;
  wants: QueryWants;
  cats: CategoryHit | null;
  method: PaymentMethod | null;
  /** Quoted text or "para Ana": a word to look for in notes. */
  noteNeedle: string | null;
  /** The needle came in quotes: the person asked for that exact word. */
  noteQuoted: boolean;
};

/** Turns a question into a structured request. Pure: no amounts, no answers. */
export function parseQuery(
  query: string,
  options: {
    language: 'en' | 'es';
    defaultPeriod: Period;
    spendConcepts: SpendConcept[];
    t: TFn;
    now?: Date;
  }
): ParsedQuery {
  // "top-up" is a phone top-up, not the "top" spending category.
  const q = normalize(query).replace(/\btop[- ]?ups?\b/g, 'recarga');
  const now = options.now ?? new Date();
  const L = LEXICON;
  const period = resolvePeriod(q, options.defaultPeriod, options.language, options.t, now);

  const spendVerb = includesAny(q, L.spendVerb);
  const payVerb = includesAny(q, L.payVerb);
  const cardPay = isCardPaymentQuery(q) || (isCardTopicQuery(q) && payVerb && !spendVerb);
  const income =
    includesAny(q, L.earnedIncome) ||
    (includesAny(q, L.incomeWord) && !skipIncomeCategoryMatch(q) && !isIncomeUsedAsReference(q));

  const wants: QueryWants = {
    streak: includesAny(q, L.streak),
    payFrom: includesAny(q, L.payFrom),
    count: includesAny(q, L.count),
    income,
    savings: L.savingsStems.some((stem) => hasStem(q, stem)) || includesAny(q, L.savings),
    projection: includesAny(q, L.projection),
    cut: includesAny(q, L.cut),
    afford: includesAny(q, L.afford),
    ant: includesAny(q, L.ant),
    spendVerb,
    payVerb,
    cardPay,
    debt: includesAny(q, L.debt),
    debtPayments: cardPay || includesAny(q, L.debtPayment),
    available: includesAny(q, L.available),
    leftNow: includesAny(q, L.leftNow) && !includesAny(q, L.monthEnd),
    compare: isCompareQuery(q),
    origin: includesAny(q, L.origin),
    transfer: includesAny(q, L.transfer),
    creditDraw: includesAny(q, L.creditDraw),
    top: includesAny(q, L.top),
    average: includesAny(q, L.average),
    budget: includesAny(q, L.budget),
    percent: includesAny(q, L.percent),
    when: includesAny(q, L.when),
    // "¿pagué el arriendo?" only as the opening words: "¿cuánto pagué…?" is an amount.
    confirm:
      !includesAny(q, ['cuanto', 'cuanta', 'cuantas', 'cuantos', 'how much', 'how many']) &&
      (includesAny(q, L.confirm) || /^[¿\s]*(?:ya\s+)?(?:pague|compre|pagamos)\b/.test(q)),
    list: includesAny(q, L.list),
    biggest: includesAny(q, L.biggest),
    latest: includesAny(q, L.latest),
    totals: includesAny(q, L.totals),
    why: includesAny(q, L.why),
    overspend: includesAny(q, L.overspend),
    recurring: includesAny(q, L.recurring),
    upcoming: includesAny(q, L.upcoming),
    shouldSave: includesAny(q, L.shouldSave),
    pastVerb: includesAny(q, L.pastVerb),
  };

  return {
    q,
    language: options.language,
    period,
    inProgress: isInProgress(period, now),
    wants,
    cats: detectCategoryList(q, options.spendConcepts),
    method: detectPaymentMethod(q),
    noteNeedle: extractNoteNeedle(q),
    noteQuoted: /["“'][^"”']+["”']/.test(q),
  };
}
