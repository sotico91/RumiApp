import { findSpendSub, flattenSpendSubs } from '@/src/data/spendConcepts';
import type { Debt, Period, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { filterByPeriod, revolvingDebtIds } from '@/src/utils/financeMath';
import { cardObligationTxs, isExpenseTx, obligationTxs } from './ledger';

export type SearchSuggestion = {
  id: string;
  /** Translation key or raw prompt text. */
  prompt: string;
};

/** Quick prompts tailored to the user's concepts, recent spend, and selected period. */
export function buildSearchSuggestions(
  spendConcepts: SpendConcept[],
  language: 'en' | 'es',
  period: Period = 'mes',
  options: { transactions?: Transaction[]; debts?: Debt[] } = {}
): string[] {
  const prompts: string[] = [];
  const when =
    language === 'es'
      ? period === 'hoy'
        ? 'hoy'
        : period === 'semana'
          ? 'esta semana'
          : 'este mes'
      : period === 'hoy'
        ? 'today'
        : period === 'semana'
          ? 'this week'
          : 'this month';

  const allTxs = options.transactions ?? [];
  const periodTxs = filterByPeriod(allTxs, period);
  const spentBySub = new Map<string, number>();
  for (const tx of periodTxs) {
    if (!isExpenseTx(tx) || !tx.categoryId) continue;
    spentBySub.set(tx.categoryId, (spentBySub.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const topSub = flattenSpendSubs(spendConcepts)
    .map((sub) => ({ sub, spent: spentBySub.get(sub.id) ?? 0 }))
    .sort((a, b) => b.spent - a.spent || a.sub.name.localeCompare(b.sub.name))[0]?.sub;
  const topHit = topSub ? findSpendSub(spendConcepts, topSub.id) : undefined;
  const topName = topHit ? `${topHit.concept.name}/${topSub.name}` : topSub?.name;

  const cardPays = cardObligationTxs(periodTxs, options.debts);
  const anyObligations = obligationTxs(periodTxs);
  const hasCardTopic = cardPays.length > 0 || revolvingDebtIds(options.debts).size > 0;

  if (language === 'es') {
    prompts.push(`¿Cuánto gasté ${when}?`);
    if (hasCardTopic) {
      prompts.push(`¿Cuánto pagué de tarjeta ${when}?`);
    } else if (anyObligations.length > 0) {
      prompts.push(`¿Cuánto pagué en obligaciones ${when}?`);
    } else if (topName) {
      prompts.push(`¿Cuánto gasté en ${topName} ${when}?`);
    }
    if (period === 'mes') prompts.push('¿Cuánto voy a gastar este mes?');
    prompts.push('¿En qué puedo recortar?');
    prompts.push(
      period === 'mes'
        ? '¿Cuáles son mis gastos hormiga?'
        : `¿Cuáles son mis gastos hormiga ${when}?`
    );
    prompts.push('¿Cuánto tengo disponible?');
  } else {
    prompts.push(`How much did I spend ${when}?`);
    if (hasCardTopic) {
      prompts.push(`How much did I pay on the card ${when}?`);
    } else if (anyObligations.length > 0) {
      prompts.push(`How much did I pay in obligations ${when}?`);
    } else if (topName) {
      prompts.push(`How much on ${topName} ${when}?`);
    }
    if (period === 'mes') prompts.push('How much will I spend this month?');
    prompts.push('Where can I cut back?');
    prompts.push(
      period === 'mes'
        ? 'What are my small spends?'
        : `What are my small spends ${when}?`
    );
    prompts.push('How much available cash do I have?');
  }
  return prompts;
}
