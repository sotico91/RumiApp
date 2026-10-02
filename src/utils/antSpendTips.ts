import { CREDITS_CONCEPT_ID, findSpendSub } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { Currency, SpendConcept } from '@/src/types/settings';
import { isAntCategoryId } from '@/src/utils/financeMath';
import { localDateKey } from '@/src/utils/habitPilot';

export type AntSpendTip = {
  categoryId: string;
  /** Spending this calendar month. */
  current: number;
  /** Spending last calendar month. */
  previous: number;
  /** How much higher than last month (at least 0). */
  delta: number;
  /** Friendly “leave a bit on the table” amount. */
  saveHint: number;
  isAnt: boolean;
};

/** Minimum monthly spend and climb worth a tip (~15.000 / 8.000 COP ≈ 4 / 2 USD). */
const THRESHOLDS: Record<Currency, { minCurrent: number; minDelta: number }> = {
  COP: { minCurrent: 15_000, minDelta: 8_000 },
  USD: { minCurrent: 4, minDelta: 2 },
};
const MIN_RATIO = 1.2;
const MIN_COUNT = 2;

/** Monday (local) date key — stable id for “this tip week”. */
export function antTipWeekKey(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return localDateKey(d);
}

function isCreditsCategory(categoryId: string, concepts: SpendConcept[]): boolean {
  const hit = findSpendSub(concepts, categoryId);
  return hit?.concept.id === CREDITS_CONCEPT_ID;
}

function monthBuckets(
  transactions: Transaction[],
  year: number,
  monthIndex: number
): Map<string, { total: number; count: number }> {
  const from = new Date(year, monthIndex, 1, 0, 0, 0, 0).getTime();
  const to = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0).getTime();
  const map = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    if (t.type !== 'expense' || !t.categoryId) continue;
    const ts = new Date(t.createdAt).getTime();
    if (ts < from || ts >= to) continue;
    const cur = map.get(t.categoryId) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    map.set(t.categoryId, cur);
  }
  return map;
}

function saveHintFor(
  current: number,
  delta: number,
  currency: Currency
): number {
  const soft = Math.max(delta * 0.4, current * 0.12);
  const capped = Math.min(soft, delta > 0 ? delta : current * 0.25);
  if (currency === 'USD') {
    // Whole dollars once it is worth it; otherwise keep cents.
    if (capped >= 5) return Math.round(capped);
    return Math.max(0.5, Math.round(capped * 100) / 100);
  }
  // Round to friendly thousands of pesos.
  if (capped >= 5000) return Math.max(1000, Math.round(capped / 1000) * 1000);
  return Math.max(1, Math.round(capped));
}

/**
 * Soft cut suggestions: prefer ant (hormiga) spends that climbed vs last month,
 * then other non-credit concepts. Never debts / debt_payment.
 */
export function buildAntSpendTips(
  transactions: Transaction[],
  spendConcepts: SpendConcept[],
  now = new Date(),
  currency: Currency = 'COP'
): AntSpendTip[] {
  const { minCurrent: MIN_CURRENT, minDelta: MIN_DELTA } = THRESHOLDS[currency];
  const y = now.getFullYear();
  const m = now.getMonth();
  const prev = m === 0 ? { year: y - 1, monthIndex: 11 } : { year: y, monthIndex: m - 1 };

  const currentMap = monthBuckets(transactions, y, m);
  const previousMap = monthBuckets(transactions, prev.year, prev.monthIndex);
  const tips: AntSpendTip[] = [];

  for (const [categoryId, cur] of currentMap) {
    if (isCreditsCategory(categoryId, spendConcepts)) continue;
    if (cur.total < MIN_CURRENT) continue;
    if (cur.count < MIN_COUNT) continue;

    const prevStats = previousMap.get(categoryId) ?? { total: 0, count: 0 };
    const previous = prevStats.total;
    const delta = Math.max(0, cur.total - previous);
    const ratio = previous > 0 ? cur.total / previous : cur.total >= MIN_CURRENT * 1.5 ? 99 : 0;

    const climbed =
      (previous > 0 && ratio >= MIN_RATIO && delta >= MIN_DELTA) ||
      (previous === 0 && cur.total >= MIN_CURRENT * 1.5 && cur.count >= 3);

    if (!climbed) continue;

    tips.push({
      categoryId,
      current: cur.total,
      previous,
      delta,
      saveHint: saveHintFor(cur.total, delta || cur.total * 0.2, currency),
      isAnt: isAntCategoryId(categoryId, spendConcepts),
    });
  }

  return tips.sort((a, b) => {
    if (a.isAnt !== b.isAnt) return a.isAnt ? -1 : 1;
    return b.delta - a.delta || b.current - a.current;
  });
}

export function pickAntSpendTip(
  transactions: Transaction[],
  spendConcepts: SpendConcept[],
  now = new Date(),
  currency: Currency = 'COP'
): AntSpendTip | null {
  return buildAntSpendTips(transactions, spendConcepts, now, currency)[0] ?? null;
}

const TITLE_VARIANT_COUNT = 4;
const BODY_VARIANT_COUNT = 6;

export function antTipTitleKey(variant: number): `antTip.title${number}` {
  const i = ((variant % TITLE_VARIANT_COUNT) + TITLE_VARIANT_COUNT) % TITLE_VARIANT_COUNT;
  return `antTip.title${i}` as `antTip.title${number}`;
}

export function antTipBodyKey(variant: number): `antTip.body${number}` {
  const i = ((variant % BODY_VARIANT_COUNT) + BODY_VARIANT_COUNT) % BODY_VARIANT_COUNT;
  return `antTip.body${i}` as `antTip.body${number}`;
}

/** Random variants; avoids repeating the last title/body pair when possible. */
export function pickAntTipVariants(lastTitle?: number, lastBody?: number): {
  titleVariant: number;
  bodyVariant: number;
} {
  let titleVariant = Math.floor(Math.random() * TITLE_VARIANT_COUNT);
  let bodyVariant = Math.floor(Math.random() * BODY_VARIANT_COUNT);
  if (lastTitle != null && TITLE_VARIANT_COUNT > 1 && titleVariant === lastTitle) {
    titleVariant = (titleVariant + 1 + Math.floor(Math.random() * (TITLE_VARIANT_COUNT - 1))) % TITLE_VARIANT_COUNT;
  }
  if (lastBody != null && BODY_VARIANT_COUNT > 1 && bodyVariant === lastBody) {
    bodyVariant = (bodyVariant + 1 + Math.floor(Math.random() * (BODY_VARIANT_COUNT - 1))) % BODY_VARIANT_COUNT;
  }
  return { titleVariant, bodyVariant };
}

export const ANT_TIP_TITLE_COUNT = TITLE_VARIANT_COUNT;
export const ANT_TIP_BODY_COUNT = BODY_VARIANT_COUNT;
