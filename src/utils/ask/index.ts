import type { Transaction } from '@/src/types/finance';
import { categoryLabel as resolveCategoryLabel } from '@/src/utils/categoryLabel';
import { conceptLabel, HANDLERS, type AskContext, type AskIntent, type Handler } from './handlers';
import { parseQuery, type ParsedQuery } from './parse';
import { txsForPeriod } from './period';
import { normalize } from './text';
import type { AskOptions, TFn } from './types';

export { buildSearchSuggestions, type SearchSuggestion } from './suggestions';
export { parseQueryAmount } from './signals';
export { parseQuery, type ParsedQuery } from './parse';
export type { AskOptions } from './types';

export type { AskIntent } from './handlers';

export type AskResult = {
  text: string;
  /** Which handler answered (null = the question was not understood). */
  intent: AskIntent | null;
  /** How the question was read, to show back: "Café · Septiembre 2026". */
  understood: { period: string; concept?: string } | null;
  /** Movements behind the answer, newest first (empty when it is a summary). */
  txs: Transaction[];
  /** Next questions worth one tap. */
  followUps: string[];
};

const MAX_FOLLOW_UPS = 3;

function followUpsFor(ctx: AskContext, concept: string | null, query: string): string[] {
  const { parsed, t } = ctx;
  const { wants, period } = parsed;
  const out: string[] = [];
  if (concept && !wants.income) {
    if (!wants.compare && period.analog === 'month') out.push(t('ask.followCompareMonth', { label: concept }));
    if (!wants.count) out.push(t('ask.followCount', { label: concept }));
    if (period.analog !== 'week') out.push(t('ask.followLastWeek', { label: concept }));
  } else {
    if (!wants.compare && period.analog === 'month') out.push(t('ask.followCompareTotal'));
    if (!wants.projection && parsed.inProgress && period.analog === 'month') out.push(t('ask.followProjection'));
    if (!wants.cut) out.push(t('ask.followCut'));
    if (!wants.top) out.push(t('ask.followTop'));
  }
  const asked = normalize(query);
  return out.filter((f) => normalize(f) !== asked).slice(0, MAX_FOLLOW_UPS);
}

/** Answers a question from the user's own data, with what it understood and what backs the answer. */
export function askRumi(
  query: string,
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions = {}
): AskResult {
  if (!query.trim()) {
    return { text: t('search.needQuestion'), intent: null, understood: null, txs: [], followUps: [] };
  }
  const spendConcepts = options.spendConcepts ?? [];
  const parsed: ParsedQuery = parseQuery(query, {
    language: options.language ?? 'es',
    defaultPeriod: options.defaultPeriod ?? 'mes',
    spendConcepts,
    t,
  });
  const ctx: AskContext = {
    parsed,
    transactions,
    list: txsForPeriod(transactions, parsed.period),
    format,
    t,
    options,
    spendConcepts,
    categoryLabel: (id) => resolveCategoryLabel(id, t, spendConcepts),
  };

  for (const [intent, handler] of Object.entries(HANDLERS) as [AskIntent, Handler][]) {
    const answer = handler(ctx);
    if (!answer) continue;
    const concept = conceptLabel(ctx);
    return {
      text: answer.text,
      intent,
      understood: { period: parsed.period.label, concept: concept ?? undefined },
      txs: [...(answer.txs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      followUps: followUpsFor(ctx, concept, query),
    };
  }
  return {
    text: t('search.answerUnclear', { examples: t('search.examples') }),
    intent: null,
    understood: null,
    txs: [],
    followUps: [],
  };
}

/** Text-only answer (tests, cards and older callers). */
export function answerFinanceQuery(
  query: string,
  transactions: Transaction[],
  format: (n: number) => string,
  t: TFn,
  options: AskOptions = {}
): string {
  return askRumi(query, transactions, format, t, options).text;
}
