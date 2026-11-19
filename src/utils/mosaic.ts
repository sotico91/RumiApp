import type { Debt, Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import {
  comparableRange,
  filterBetween,
  periodEnd,
  periodStart,
  percentOfBase,
  spendByConcept,
} from '@/src/utils/financeMath';

/** One tile: a category (Food, Transport…) and its share of the month's money out. */
export type MosaicTile = {
  id: string;
  concept: SpendConcept | null;
  total: number;
  count: number;
  /** Share of the month's money out, 0–100. */
  percent: number;
  /** Percentage points against the same days of last month; null when last month had no spending. */
  deltaPoints: number | null;
  /** Some of it went to ant spends (small daily ones). */
  hasAnt: boolean;
  /** Small categories folded into one "others" tile. */
  others?: MosaicTile[];
};

export type MosaicRect = { x: number; y: number; w: number; h: number };

/** Below this share a tile is too small to read: it goes into "Others". */
export const MOSAIC_MIN_PERCENT = 4;
/** At most this many tiles before the rest go into "Others". */
export const MOSAIC_MAX_TILES = 7;
export const OTHERS_ID = '__others__';

function antIds(concept: SpendConcept | null): Set<string> {
  return new Set((concept?.subs ?? []).filter((s) => s.isAnt).map((s) => s.id));
}

/**
 * The month's spending by category, biggest first, with the change against
 * the same point of last month. Tiny categories are folded into one tile.
 */
export function buildMosaic(
  transactions: Transaction[],
  spendConcepts: SpendConcept[],
  debts: Pick<Debt, 'id' | 'kind'>[] = [],
  now = new Date()
): { tiles: MosaicTile[]; total: number } {
  const current = { from: periodStart('mes', now), to: periodEnd('mes', now) };
  const prevFrom = new Date(current.from);
  prevFrom.setMonth(prevFrom.getMonth() - 1);
  const previous = comparableRange(current, { from: prevFrom, to: current.from }, now);

  const thisMonth = filterBetween(transactions, current.from, current.to);
  const rows = spendByConcept(thisMonth, spendConcepts, debts);
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  if (total <= 0) return { tiles: [], total: 0 };

  const prevRows = spendByConcept(filterBetween(transactions, previous.from, previous.to), spendConcepts, debts);
  const prevTotal = prevRows.reduce((sum, r) => sum + r.total, 0);
  const prevPercent = new Map(prevRows.map((r) => [r.id, percentOfBase(r.total, prevTotal)] as const));

  const all: MosaicTile[] = rows.map((r) => {
    const ants = antIds(r.concept);
    const percent = percentOfBase(r.total, total);
    return {
      id: r.id,
      concept: r.concept,
      total: r.total,
      count: r.count,
      percent,
      deltaPoints: prevTotal > 0 ? percent - (prevPercent.get(r.id) ?? 0) : null,
      hasAnt: thisMonth.some((t) => t.type === 'expense' && !!t.categoryId && ants.has(t.categoryId)),
    };
  });

  const keep: MosaicTile[] = [];
  const rest: MosaicTile[] = [];
  for (const tile of all) {
    if (keep.length < MOSAIC_MAX_TILES && tile.percent >= MOSAIC_MIN_PERCENT) keep.push(tile);
    else rest.push(tile);
  }
  // One small category alone is shown as itself, not as "Others (1)".
  if (rest.length === 1) keep.push(rest[0]);
  else if (rest.length > 1) {
    const restTotal = rest.reduce((sum, t) => sum + t.total, 0);
    keep.push({
      id: OTHERS_ID,
      concept: null,
      total: restTotal,
      count: rest.reduce((sum, t) => sum + t.count, 0),
      percent: percentOfBase(restTotal, total),
      deltaPoints: null,
      hasAnt: rest.some((t) => t.hasAnt),
      others: rest,
    });
  }
  return { tiles: keep, total };
}

function worstRatio(row: number[], side: number): number {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * max) / sum2, sum2 / (s2 * min));
}

/**
 * Squarified treemap: rectangles with areas proportional to `values`, kept as
 * close to squares as possible so every label has room. Same order as `values`
 * (pass them biggest first).
 */
export function squarify(values: number[], width: number, height: number): MosaicRect[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0 || width <= 0 || height <= 0) return values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const scale = (width * height) / total;
  const areas = values.map((v) => v * scale);
  const rects: MosaicRect[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let i = 0;

  while (i < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worstRatio([...row, areas[j]], side) <= worstRatio(row, side)) {
      row.push(areas[j]);
      j += 1;
    }
    const rowSum = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      // Lay the row as a column on the left.
      const colW = rowSum / h;
      let cy = y;
      for (const a of row) {
        const rh = a / colW;
        rects.push({ x, y: cy, w: colW, h: rh });
        cy += rh;
      }
      x += colW;
      w -= colW;
    } else {
      // Lay the row along the top.
      const rowH = rowSum / w;
      let cx = x;
      for (const a of row) {
        const rw = a / rowH;
        rects.push({ x: cx, y, w: rw, h: rowH });
        cx += rw;
      }
      y += rowH;
      h -= rowH;
    }
    i = j;
  }
  return rects;
}

/** Black or white text, whichever reads better (WCAG contrast) on `hex`. */
export function readableTextOn(hex: string): '#FFFFFF' | '#0F1C24' {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return '#FFFFFF';
  const lin = (c: string) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]);
  const dark = 0.2126 * lin('0F') + 0.7152 * lin('1C') + 0.0722 * lin('24');
  const vsWhite = 1.05 / (lum + 0.05);
  const vsDark = (lum + 0.05) / (dark + 0.05);
  return vsWhite >= vsDark ? '#FFFFFF' : '#0F1C24';
}

/** `hex` mixed toward white (amount > 0) or black (amount < 0), for gradients. */
export function shade(hex: string, amount: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return hex;
  const target = amount > 0 ? 255 : 0;
  const k = Math.min(Math.abs(amount), 1);
  const mix = (c: string) =>
    Math.round(parseInt(c, 16) + (target - parseInt(c, 16)) * k)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(m[1])}${mix(m[2])}${mix(m[3])}`.toUpperCase();
}
