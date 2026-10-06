import type { Period, Transaction } from '@/src/types/finance';
import {
  calendarMonthRange,
  comparableRange,
  filterBetween,
  previousMonthRange,
  startOfWeek,
} from '@/src/utils/financeMath';
import { isCompareQuery } from './signals';
import { includesAny } from './text';
import type { TFn } from './types';

export const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const MONTHS_EN = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

export const MONTH_INDEX: Record<string, number> = {
  enero: 0,
  january: 0,
  febrero: 1,
  february: 1,
  marzo: 2,
  march: 2,
  abril: 3,
  april: 3,
  mayo: 4,
  may: 4,
  junio: 5,
  june: 5,
  julio: 6,
  july: 6,
  agosto: 7,
  august: 7,
  septiembre: 8,
  setiembre: 8,
  september: 8,
  octubre: 9,
  october: 9,
  noviembre: 10,
  november: 10,
  diciembre: 11,
  december: 11,
};

export function monthsAgoPeriod(
  count: number,
  language: 'en' | 'es',
  now = new Date()
): QueryPeriod {
  const d = new Date(now.getFullYear(), now.getMonth() - count, 1);
  return monthPeriod(d.getFullYear(), d.getMonth(), language);
}

export const MES_AGO_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
};

export function parseMesAgoCount(raw: string): number | null {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 36) return Math.floor(n);
  return MES_AGO_WORDS[raw] ?? null;
}

/** Named month without a year: if that month is still ahead this year, use last year. */
export function yearForBareMonth(monthIndex: number, now: Date): number {
  if (monthIndex > now.getMonth()) return now.getFullYear() - 1;
  return now.getFullYear();
}

export type QueryPeriod = {
  label: string;
  from: Date;
  to: Date;
  analog: 'day' | 'week' | 'month' | 'year' | 'range';
  /** True when the question named a time (last month, August, yesterday…). */
  explicit: boolean;
  /** Window to compare against when "the one before" is not just the same length back. */
  previous?: { from: Date; to: Date };
};

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function monthLabel(monthIndex: number, language: 'en' | 'es'): string {
  const i = ((monthIndex % 12) + 12) % 12;
  const name = language === 'es' ? MONTHS_ES[i] : MONTHS_EN[i];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function parseYearToken(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  if (n < 100) return n >= 70 ? 1900 + n : 2000 + n;
  return n;
}

export function dayPeriod(day: Date, language: 'en' | 'es'): QueryPeriod {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  const label =
    language === 'es'
      ? `${from.getDate()} de ${monthLabel(from.getMonth(), 'es').toLowerCase()} ${from.getFullYear()}`
      : `${monthLabel(from.getMonth(), 'en')} ${from.getDate()}, ${from.getFullYear()}`;
  return { label, from, to, analog: 'day', explicit: true };
}

export function monthPeriod(
  year: number,
  monthIndex: number,
  language: 'en' | 'es'
): QueryPeriod {
  const { from, to } = calendarMonthRange(year, monthIndex);
  return {
    label: `${monthLabel(monthIndex, language)} ${year}`,
    from,
    to,
    analog: 'month',
    explicit: true,
  };
}

export function yearPeriod(year: number, language: 'en' | 'es'): QueryPeriod {
  return {
    label: language === 'es' ? `el año ${year}` : `${year}`,
    from: new Date(year, 0, 1),
    to: new Date(year + 1, 0, 1),
    analog: 'year',
    explicit: true,
  };
}

export function presetPeriod(
  preset: Period | 'anio' | 'mesPasado',
  language: 'en' | 'es',
  t: TFn,
  now = new Date()
): QueryPeriod {
  if (preset === 'mesPasado') {
    const { from, to } = previousMonthRange(now);
    return {
      label: t('search.periodLastMonth'),
      from,
      to,
      analog: 'month',
      explicit: true,
    };
  }
  if (preset === 'anio') {
    return yearPeriod(now.getFullYear(), language);
  }
  if (preset === 'hoy') {
    const from = startOfDay(now);
    return {
      label: t('period.hoy'),
      from,
      to: addDays(from, 1),
      analog: 'day',
      explicit: true,
    };
  }
  if (preset === 'semana') {
    const from = startOfDay(now);
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diff);
    return {
      label: t('period.semana'),
      from,
      to: addDays(startOfDay(now), 1),
      analog: 'week',
      explicit: true,
    };
  }
  const { from, to } = calendarMonthRange(now.getFullYear(), now.getMonth());
  return { label: t('period.mes'), from, to, analog: 'month', explicit: true };
}

/** How to name the window a period is compared against. */
export function previousLabel(
  period: QueryPeriod,
  prev: { from: Date; to: Date },
  language: 'en' | 'es',
  t: TFn
): string {
  if (period.analog === 'month') {
    return `${monthLabel(prev.from.getMonth(), language)} ${prev.from.getFullYear()}`;
  }
  if (period.analog === 'year') {
    return language === 'es' ? `el año ${prev.from.getFullYear()}` : String(prev.from.getFullYear());
  }
  if (period.analog === 'week') return t('search.periodLastWeek');
  if (period.analog === 'day') return dayPeriod(prev.from, language).label;
  return t('search.periodBefore');
}

export function analogRange(period: QueryPeriod, now = new Date()): { from: Date; to: Date } {
  return comparableRange(period, fullAnalogRange(period), now);
}

export function fullAnalogRange(period: QueryPeriod): { from: Date; to: Date } {
  if (period.previous) return period.previous;
  if (period.analog === 'month') {
    const prev = new Date(period.from);
    prev.setMonth(prev.getMonth() - 1);
    return calendarMonthRange(prev.getFullYear(), prev.getMonth());
  }
  if (period.analog === 'year') {
    const y = period.from.getFullYear() - 1;
    return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
  }
  if (period.analog === 'week') {
    return { from: addDays(period.from, -7), to: period.from };
  }
  const ms = Math.max(period.to.getTime() - period.from.getTime(), 24 * 60 * 60 * 1000);
  return {
    from: new Date(period.from.getTime() - ms),
    to: new Date(period.from.getTime()),
  };
}

export const DAY_COUNT_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
};

export function parseDayCount(raw: string): number | null {
  const n = DAY_COUNT_WORDS[raw] ?? Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 366 ? n : null;
}

/** Rolling window that ends today: "últimos 7 días". */
export function lastDaysPeriod(count: number, t: TFn, now: Date): QueryPeriod {
  const to = addDays(startOfDay(now), 1);
  const from = addDays(to, -count);
  return {
    label: t('search.periodLastDays', { count }),
    from,
    to,
    analog: 'range',
    explicit: true,
  };
}

/** Saturday + Sunday: this one while it runs, else the most recent; "pasado" steps back one more. */
export function weekendPeriod(past: boolean, t: TFn, now: Date): QueryPeriod {
  const today = startOfDay(now);
  const dow = today.getDay();
  let saturday = addDays(today, -((dow + 1) % 7));
  const inWeekend = dow === 6 || dow === 0;
  if (past && inWeekend) saturday = addDays(saturday, -7);
  const end = addDays(saturday, 2);
  const tomorrow = addDays(today, 1);
  return {
    label: t(past || !inWeekend ? 'search.periodLastWeekend' : 'search.periodWeekend'),
    from: saturday,
    to: end < tomorrow ? end : tomorrow,
    analog: 'range',
    explicit: true,
    previous: { from: addDays(saturday, -7), to: addDays(saturday, -5) },
  };
}

export function resolvePeriod(
  q: string,
  defaultPeriod: Period,
  language: 'en' | 'es',
  t: TFn,
  now = new Date()
): QueryPeriod {
  const yearNow = now.getFullYear();
  const monthAlt = 'septiembre|setiembre';
  const months =
    `enero|febrero|marzo|abril|mayo|junio|julio|agosto|${monthAlt}|octubre|noviembre|diciembre|` +
    'january|february|march|april|may|june|july|august|september|october|november|december';

  const dayMonth = q.match(
    new RegExp(
      `\\b(\\d{1,2})\\s+de\\s+(${months})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`
    )
  );
  if (dayMonth) {
    const monthIndex = MONTH_INDEX[dayMonth[2]];
    const year = dayMonth[3]
      ? parseYearToken(dayMonth[3], yearNow)
      : yearForBareMonth(monthIndex ?? 0, now);
    const day = Number(dayMonth[1]);
    if (monthIndex != null && day >= 1 && day <= 31) {
      return dayPeriod(new Date(year, monthIndex, day), language);
    }
  }

  const isoMonth = q.match(/\b(20\d{2})[\/\-.](\d{1,2})\b/);
  if (isoMonth) {
    const monthIndex = Number(isoMonth[2]) - 1;
    if (monthIndex >= 0 && monthIndex <= 11) {
      return monthPeriod(Number(isoMonth[1]), monthIndex, language);
    }
  }
  const monthYear = q.match(/\b(\d{1,2})[\/\-.](20\d{2})\b/);
  if (monthYear) {
    const monthIndex = Number(monthYear[1]) - 1;
    if (monthIndex >= 0 && monthIndex <= 11) {
      return monthPeriod(Number(monthYear[2]), monthIndex, language);
    }
  }

  const numeric = q.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const year = parseYearToken(numeric[3], yearNow);
    const dayFirst = language === 'es' || a > 12;
    const day = dayFirst ? a : b;
    const monthIndex = (dayFirst ? b : a) - 1;
    if (monthIndex >= 0 && monthIndex <= 11 && day >= 1 && day <= 31) {
      return dayPeriod(new Date(year, monthIndex, day), language);
    }
  }

  const haceMeses = q.match(
    /\bhace\s+(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+mes(?:es)?\b/
  );
  if (haceMeses) {
    const count = parseMesAgoCount(haceMeses[1]);
    if (count) return monthsAgoPeriod(count, language, now);
  }
  const monthsAgoEn = q.match(/\b(\d+)\s+months?\s+ago\b/);
  if (monthsAgoEn) {
    const count = parseMesAgoCount(monthsAgoEn[1]);
    if (count) return monthsAgoPeriod(count, language, now);
  }

  const daysWords =
    '(\\d{1,3}|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta)';
  const lastDays =
    q.match(new RegExp(`\\b(?:ultimos|ultimas)\\s+${daysWords}\\s+dias\\b`)) ??
    q.match(/\b(?:last|past)\s+(\d{1,3})\s+days\b/);
  if (lastDays) {
    const count = parseDayCount(lastDays[1]);
    if (count) return lastDaysPeriod(count, t, now);
  }
  const daysAgo =
    q.match(new RegExp(`\\bhace\\s+${daysWords}\\s+dias?\\b`)) ??
    q.match(/\b(\d{1,3})\s+days?\s+ago\b/);
  if (daysAgo) {
    const count = parseDayCount(daysAgo[1]);
    if (count) return dayPeriod(addDays(now, -count), language);
  }

  if (includesAny(q, ['fin de semana', 'finde', 'weekend'])) {
    return weekendPeriod(includesAny(q, ['pasado', 'anterior', 'last', 'previous']), t, now);
  }

  const hasLastWeek = includesAny(q, [
    'semana pasada',
    'semana anterior',
    'la semana pasada',
    'last week',
    'previous week',
  ]);
  const hasThisWeek = includesAny(q, ['esta semana', 'this week']);
  // "esta semana vs la pasada" is this week compared with the last one.
  if (hasLastWeek && (hasThisWeek || isCompareQuery(q))) {
    return presetPeriod('semana', language, t, now);
  }
  if (hasLastWeek) {
    const to = startOfWeek(now);
    const from = addDays(to, -7);
    return {
      label: t('search.periodLastWeek'),
      from,
      to,
      analog: 'week',
      explicit: true,
    };
  }

  const namedMonth = q.match(
    new RegExp(
      `\\b(?:(?:en|del)\\s+(?:el\\s+)?(?:mes\\s+de\\s+)?)?(${months})(?:\\s+(?:de(?:l)?\\s+)?(\\d{4}))?\\b`
    )
  );

  const hasLastMonth = includesAny(q, [
    'mes pasado',
    'last month',
    'el mes anterior',
    'mes anterior',
    'ultimo mes',
    'último mes',
    'el ultimo mes',
    'el último mes',
    'previous month',
  ]);
  const hasThisMonth = includesAny(q, ['este mes', 'this month']);
  const hasCompare = isCompareQuery(q);
  // "más que el mes pasado" is this month vs last — don't switch the window to last month.
  if (hasLastMonth && (hasThisMonth || hasCompare)) {
    return presetPeriod('mes', language, t, now);
  }
  if (hasLastMonth) {
    return presetPeriod('mesPasado', language, t, now);
  }

  if (namedMonth) {
    const monthIndex = MONTH_INDEX[namedMonth[1]];
    if (monthIndex != null) {
      const year = namedMonth[2]
        ? parseYearToken(namedMonth[2], yearNow)
        : yearForBareMonth(monthIndex, now);
      return monthPeriod(year, monthIndex, language);
    }
  }

  if (includesAny(q, ['anteayer', 'day before yesterday'])) {
    return dayPeriod(addDays(now, -2), language);
  }
  if (includesAny(q, ['ayer', 'yesterday'])) {
    return dayPeriod(addDays(now, -1), language);
  }
  if (includesAny(q, ['ano pasado', 'año pasado', 'el ano pasado', 'el año pasado', 'last year'])) {
    return yearPeriod(yearNow - 1, language);
  }
  if (includesAny(q, ['hoy', 'today', 'esta manana', 'esta mañana'])) {
    return presetPeriod('hoy', language, t, now);
  }
  if (includesAny(q, ['esta semana', 'this week'])) {
    return presetPeriod('semana', language, t, now);
  }
  if (includesAny(q, ['este ano', 'este año', 'this year', 'en el ano', 'en el año'])) {
    return presetPeriod('anio', language, t, now);
  }
  const onlyYear = q.match(/\b(?:en\s+|del\s+|de\s+)?(20\d{2})\b/);
  if (onlyYear) {
    return yearPeriod(Number(onlyYear[1]), language);
  }
  if (hasThisMonth) {
    return presetPeriod('mes', language, t, now);
  }
  if (includesAny(q, ['semana', 'week']) && !includesAny(q, ['fin de semana', 'weekend'])) {
    return presetPeriod('semana', language, t, now);
  }
  if (includesAny(q, ['ano', 'año', 'year', 'anual'])) {
    return presetPeriod('anio', language, t, now);
  }
  if (includesAny(q, ['mes', 'month'])) {
    return presetPeriod('mes', language, t, now);
  }
  return { ...presetPeriod(defaultPeriod, language, t, now), explicit: false };
}

export function txsForPeriod(
  transactions: Transaction[],
  period: QueryPeriod
): Transaction[] {
  return filterBetween(transactions, period.from, period.to);
}

/** The period has started and has not ended yet (this week, this month…). */
export function isInProgress(period: QueryPeriod, now = new Date()): boolean {
  return now.getTime() >= period.from.getTime() && now.getTime() < period.to.getTime();
}

export const DAY_MS = 24 * 60 * 60 * 1000;
