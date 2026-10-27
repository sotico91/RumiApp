import type { Account } from '@/src/types/finance';
import type { Currency } from '@/src/types/settings';
import { normalizeAmountDigits } from '@/src/utils/money';
import { normalize } from '@/src/utils/ask/text';

/**
 * What a spoken (or typed) sentence says about one movement:
 * "gasté veinte mil en almuerzo con Nequi ayer" → expense, 20000,
 * "almuerzo", the Nequi account, 1 day ago. The category is left to
 * suggestCategory, which reads it from `note`. Nothing is saved from this
 * on its own: it prefills the add form for the user to confirm.
 */
export type DictatedMovement = {
  type: 'expense' | 'income';
  /** null = no amount heard; the form asks for it. */
  amount: number | null;
  /** What it was, cleaned of amount, account, date and filler words. */
  note: string;
  accountId?: string;
  /** 0 = today, 1 = yesterday… */
  daysAgo: number;
};

export type DictationOptions = {
  accounts?: Account[];
  currency?: Currency;
  now?: Date;
};

type Token = {
  /** As said, without surrounding punctuation ("café"). */
  raw: string;
  /** Lowercase, no accents ("cafe"). */
  word: string;
  /** Said with a "$" in front. */
  dollarSign?: boolean;
};

// ---------------------------------------------------------------------------
// Tokens

const EDGE_PUNCT = /^[¿?¡!,.;:"“”'()«»]+|[¿?¡!,.;:"“”'()«»]+$/g;

function tokenizeSpoken(text: string): Token[] {
  const out: Token[] = [];
  for (const piece of text.split(/\s+/)) {
    let raw = piece.replace(EDGE_PUNCT, '');
    if (!raw) continue;
    let dollarSign = false;
    if (raw.startsWith('$')) {
      dollarSign = true;
      raw = raw.slice(1).replace(EDGE_PUNCT, '');
      if (!raw) continue;
    }
    // "20mil", "20k", "1.5k", "20lucas" → number + word.
    const glued = /^(\d[\d.,]*)([a-záéíóúñ]+)$/i.exec(raw);
    if (glued) {
      out.push({ raw: glued[1], word: glued[1], dollarSign });
      out.push({ raw: glued[2], word: normalize(glued[2]) });
      continue;
    }
    out.push({ raw, word: normalize(raw), dollarSign });
  }
  // Thousands split by a space, as dictation writes them: "20 000" → "20000".
  for (let i = 0; i < out.length - 1; i++) {
    if (!/^\d{1,3}$/.test(out[i].word)) continue;
    while (out[i + 1] && /^\d{3}$/.test(out[i + 1].word)) {
      out[i] = { ...out[i], raw: out[i].raw + out[i + 1].raw, word: out[i].word + out[i + 1].word };
      out.splice(i + 1, 1);
    }
  }
  return out;
}

const isDigits = (w: string) => /^\d[\d.,]*$/.test(w);

function digitValue(w: string): number | null {
  const n = Number(normalizeAmountDigits(w));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Numbers said in words (es + en)

const SMALL: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200,
  doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
  cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600,
  seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800,
  ochocientas: 800, novecientos: 900, novecientas: 900,
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

/** Words that multiply what came before. Colombian slang: luca/barra = mil, palo = millón. */
const SCALE: Record<string, number> = {
  mil: 1_000, millon: 1_000_000, millones: 1_000_000,
  luca: 1_000, lucas: 1_000, barra: 1_000, barras: 1_000,
  palo: 1_000_000, palos: 1_000_000, k: 1_000,
  thousand: 1_000, grand: 1_000, million: 1_000_000, millions: 1_000_000,
};

const HALF = new Set(['medio', 'media', 'half']);
const ARTICLES_AS_ONE = new Set(['un', 'una', 'uno', 'a', 'one']);

const MONEY_WORDS = new Set([
  'peso', 'pesos', 'cop', 'dolar', 'dolares', 'dollar', 'dollars', 'usd', 'buck', 'bucks',
]);

function isNumberWord(w: string): boolean {
  return w in SMALL || w in SCALE || w === 'hundred';
}

/**
 * Value of a run of number tokens: "veinticinco mil quinientos" → 25500,
 * "1,5 millones" → 1500000, "un millón doscientos" → 1200000 (said for
 * 1.200.000), "millón y medio" → 1500000, "medio palo" → 500000.
 */
function evaluate(words: string[]): number {
  let total = 0;
  let current = 0;
  let lastScale = 0;
  let pendingHalf = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (isDigits(w)) {
      current += digitValue(w) ?? 0;
    } else if (w === 'a') {
      current += 1;
    } else if (w in SMALL) {
      current += SMALL[w];
    } else if (w === 'hundred') {
      current = (current || 1) * 100;
    } else if (w in SCALE) {
      const s = SCALE[w];
      if (pendingHalf) {
        total += s / 2;
        pendingHalf = false;
      } else if (current === 0 && total > 0 && s > lastScale) {
        total *= s; // "mil millones"
      } else {
        total += (current || 1) * s;
      }
      current = 0;
      lastScale = s;
    } else if (HALF.has(w)) {
      if (lastScale && i > 0 && (words[i - 1] === 'y' || words[i - 1] === 'and' || words[i - 1] in SCALE)) {
        total += lastScale / 2; // "millón y medio", "mil y media"
      } else {
        pendingHalf = true; // "medio palo"
      }
    }
  }
  // "un millón doscientos" means 1.200.000, not 1.000.200.
  if (lastScale >= 1_000_000 && current > 0 && current < 1000) current *= 1000;
  return total + current;
}

type AmountSpan = { start: number; end: number; value: number; tier: number };

/**
 * Every run of number tokens not already taken, with how sure it is money:
 * tier 2 = has a scale word, a currency word or "$"; 1 = digits; 0 = words only.
 */
function amountSpans(tokens: Token[], taken: Set<number>): AmountSpan[] {
  const spans: AmountSpan[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (taken.has(i) || !startsNumber(tokens, i)) {
      i++;
      continue;
    }
    const start = i;
    const words: string[] = [];
    let money = false;
    let digits = false;
    while (i < tokens.length && !taken.has(i)) {
      const w = tokens[i].word;
      const next = tokens[i + 1]?.word;
      if (isDigits(w)) {
        if (words.length && isDigits(words[words.length - 1])) break; // "2 5000"
        digits = true;
        if (tokens[i].dollarSign) money = true;
      } else if (w in SCALE) {
        money = true;
      } else if (w in SMALL || w === 'hundred') {
        if (w === 'una' || w === 'un' || w === 'uno') {
          if (words.length) break; // "veinte mil un café"
        }
      } else if (HALF.has(w)) {
        const prev = words[words.length - 1];
        const prev2 = words[words.length - 2];
        const fits =
          (next !== undefined && next in SCALE) || // "medio palo"
          (prev !== undefined && prev in SCALE) ||
          ((prev === 'y' || prev === 'and') && prev2 !== undefined && prev2 in SCALE); // "millón y medio"
        if (!fits) break;
      } else if (w === 'y' || w === 'and') {
        if (!joinsNumbers(words[words.length - 1], next)) break;
      } else if (w === 'a') {
        if (!(next && (next in SCALE || next === 'hundred'))) break;
      } else {
        break;
      }
      words.push(w);
      i++;
    }
    let end = i;
    // Currency said after the number: "20 mil pesos", "un millón de pesos".
    if (tokens[end] && !taken.has(end) && MONEY_WORDS.has(tokens[end].word)) {
      money = true;
      end++;
    } else if (
      tokens[end]?.word === 'de' &&
      tokens[end + 1] &&
      MONEY_WORDS.has(tokens[end + 1].word) &&
      !taken.has(end) &&
      !taken.has(end + 1)
    ) {
      money = true;
      end += 2;
    }
    if (words[words.length - 1] === 'y' || words[words.length - 1] === 'and') words.pop();
    const value = evaluate(words);
    const loneArticle = words.length === 1 && ARTICLES_AS_ONE.has(words[0]) && !money;
    if (value > 0 && !loneArticle) {
      spans.push({ start, end, value, tier: money ? 2 : digits ? 1 : 0 });
    }
    i = Math.max(end, start + 1);
  }
  return spans;
}

function startsNumber(tokens: Token[], i: number): boolean {
  const w = tokens[i].word;
  const next = tokens[i + 1]?.word;
  if (isDigits(w) || w in SMALL || w in SCALE) return true;
  if (w === 'a') return !!next && (next in SCALE || next === 'hundred');
  if (HALF.has(w)) return !!next && next in SCALE;
  return false;
}

/** "treinta y cinco", "millón y medio", "hundred and fifty". */
function joinsNumbers(prev: string | undefined, next: string | undefined): boolean {
  if (!prev || !next) return false;
  if (prev in SCALE || prev === 'hundred') return next in SMALL || HALF.has(next);
  const p = SMALL[prev];
  const n = SMALL[next];
  return p !== undefined && n !== undefined && p >= 20 && p < 100 && p % 10 === 0 && n >= 1 && n <= 9;
}

function pickAmount(spans: AmountSpan[], currency: Currency): AmountSpan | null {
  const usable = spans.filter((s) => s.tier > 0 || currency === 'USD' || s.value >= 100);
  if (!usable.length) return null;
  return usable.reduce((best, s) =>
    s.tier > best.tier || (s.tier === best.tier && s.value > best.value) ? s : best
  );
}

function roundAmount(value: number, currency: Currency): number {
  return currency === 'USD' ? Math.round(value * 100) / 100 : Math.round(value);
}

// ---------------------------------------------------------------------------
// Phrases: matched on the normalized token words

/** Find `phrase` (space-separated words) among untaken tokens; returns its start index. */
function findPhrase(tokens: Token[], taken: Set<number>, phrase: string, from = 0): number {
  const parts = phrase.split(' ');
  outer: for (let i = from; i <= tokens.length - parts.length; i++) {
    for (let j = 0; j < parts.length; j++) {
      if (taken.has(i + j) || tokens[i + j].word !== parts[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function take(taken: Set<number>, start: number, length: number) {
  for (let k = start; k < start + length; k++) taken.add(k);
}

/** Take the first of `phrases` found (longest first); true if any matched. */
function takeAny(tokens: Token[], taken: Set<number>, phrases: string[]): boolean {
  const sorted = [...phrases].sort((a, b) => b.split(' ').length - a.split(' ').length);
  for (const p of sorted) {
    const at = findPhrase(tokens, taken, p);
    if (at >= 0) {
      take(taken, at, p.split(' ').length);
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Kind of movement

const INCOME_PHRASES = [
  'me pagaron', 'me consignaron', 'me transfirieron', 'me giraron', 'me llego', 'me llegaron',
  'me entro', 'me entraron', 'me dieron', 'me devolvieron',
  'recibi', 'gane', 'cobre', 'ingrese', 'vendi',
  'got paid', 'i got paid', 'i received', 'received', 'i earned', 'earned', 'i made', 'i sold', 'sold',
];

const EXPENSE_PHRASES = [
  'me gaste', 'gaste', 'gasto', 'pague', 'compre', 'me compre', 'invite', 'di', 'puse', 'meti',
  'i spent', 'spent', 'i paid', 'paid', 'i bought', 'bought', 'i spend', 'spend',
];

/** Said about money coming in, without a verb: "sueldo de octubre 3 millones". */
const INCOME_NOUNS = [
  'sueldo', 'salario', 'quincena', 'nomina', 'ingreso', 'prima', 'honorarios',
  'salary', 'paycheck', 'income', 'wage', 'wages', 'payday',
];

// ---------------------------------------------------------------------------
// Date

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const DAY_PHRASES: [string, number][] = [
  ['antes de ayer', 2], ['antes de anoche', 2], ['anteayer', 2], ['antier', 2],
  ['day before yesterday', 2], ['the day before yesterday', 2],
  ['ayer', 1], ['anoche', 1], ['yesterday', 1], ['last night', 1],
  ['hoy', 0], ['today', 0], ['esta manana', 0], ['esta tarde', 0], ['esta noche', 0],
  ['en la manana', 0], ['this morning', 0], ['this afternoon', 0], ['tonight', 0],
];

function readDaysAgo(tokens: Token[], taken: Set<number>, now: Date): number {
  let daysAgo = 0;
  let found = false;
  const sorted = [...DAY_PHRASES].sort((a, b) => b[0].split(' ').length - a[0].split(' ').length);
  for (const [phrase, days] of sorted) {
    const at = findPhrase(tokens, taken, phrase);
    if (at < 0) continue;
    take(taken, at, phrase.split(' ').length);
    // "ayer en la mañana": keep the day, drop the time of day too.
    if (!found) daysAgo = days;
    found = true;
  }
  if (found) return daysAgo;

  // "hace 3 días", "hace dos días", "3 days ago".
  for (let i = 0; i < tokens.length; i++) {
    if (taken.has(i)) continue;
    const w = tokens[i].word;
    if (w === 'hace' && tokens[i + 2] && /^dias?$/.test(tokens[i + 2].word)) {
      const n = smallCount(tokens[i + 1].word);
      if (n !== null) {
        take(taken, i, 3);
        return n;
      }
    }
    if (tokens[i + 2]?.word === 'ago' && /^days?$/.test(tokens[i + 1]?.word ?? '')) {
      const n = smallCount(w);
      if (n !== null) {
        take(taken, i, 3);
        return n;
      }
    }
  }

  // "el sábado", "el lunes pasado", "on friday", "last monday".
  for (let i = 0; i < tokens.length; i++) {
    if (taken.has(i)) continue;
    const wd = WEEKDAYS[tokens[i].word];
    if (wd === undefined) continue;
    let start = i;
    let end = i + 1;
    const before = tokens[i - 1]?.word;
    if (before && ['el', 'este', 'on', 'last', 'this'].includes(before) && !taken.has(i - 1)) start--;
    if (tokens[end]?.word === 'pasado' && !taken.has(end)) end++;
    take(taken, start, end - start);
    return (now.getDay() - wd + 7) % 7 || 7;
  }
  return 0;
}

function smallCount(w: string): number | null {
  if (/^\d{1,2}$/.test(w)) return Number(w);
  if (w === 'un' || w === 'una' || w === 'a') return 1;
  const n = SMALL[w];
  return n !== undefined && n <= 31 ? n : null;
}

// ---------------------------------------------------------------------------
// Account

type Alias = { phrase: string; accountId: string; /** Needs "con/en/a…" before it to count. */ needsPrep?: boolean };

const TYPE_ALIASES: Partial<Record<Account['type'], { phrase: string; needsPrep?: boolean }[]>> = {
  cash: [{ phrase: 'efectivo' }, { phrase: 'cash' }, { phrase: 'billetes', needsPrep: true }],
  credit: [
    { phrase: 'tarjeta de credito' }, { phrase: 'tarjeta credito' }, { phrase: 'credit card' },
    { phrase: 'credito', needsPrep: true }, { phrase: 'tarjeta', needsPrep: true }, { phrase: 'card', needsPrep: true },
  ],
  bank: [
    { phrase: 'tarjeta debito' }, { phrase: 'tarjeta de debito' }, { phrase: 'debit card' },
    { phrase: 'debito', needsPrep: true }, { phrase: 'debit', needsPrep: true },
    { phrase: 'banco', needsPrep: true }, { phrase: 'bank', needsPrep: true },
    { phrase: 'cuenta', needsPrep: true },
  ],
  wallet: [{ phrase: 'billetera virtual' }, { phrase: 'billetera', needsPrep: true }, { phrase: 'wallet', needsPrep: true }],
  savings: [{ phrase: 'ahorros', needsPrep: true }, { phrase: 'savings', needsPrep: true }],
};

const ACCOUNT_PREPS = new Set(['con', 'en', 'a', 'por', 'de', 'desde', 'del', 'with', 'on', 'by', 'from', 'in', 'using']);
/** Preps that make a kind word an account ("con la tarjeta"), unlike "la cuota del crédito". */
const PAY_PREPS = new Set(['con', 'en', 'a', 'por', 'desde', 'with', 'on', 'by', 'from', 'using']);
const ACCOUNT_ARTICLES = new Set(['la', 'el', 'mi', 'my', 'the', 'una', 'un', 'a']);

function accountAliases(accounts: Account[]): Alias[] {
  const out: Alias[] = [];
  for (const acc of accounts) {
    const name = acc.name?.trim();
    if (name) out.push({ phrase: normalize(name).split(/\s+/).join(' '), accountId: acc.id });
  }
  // A kind word goes to the first account of that kind, after named ones.
  const seen = new Set<string>();
  for (const acc of accounts) {
    if (seen.has(acc.type)) continue;
    seen.add(acc.type);
    // "la tarjeta" with no credit card on file means the debit one.
    for (const a of TYPE_ALIASES[acc.type] ?? []) out.push({ ...a, accountId: acc.id });
  }
  if (!seen.has('credit')) {
    const bank = accounts.find((a) => a.type === 'bank');
    if (bank) out.push({ phrase: 'tarjeta', accountId: bank.id, needsPrep: true });
  }
  return out;
}

function readAccount(tokens: Token[], taken: Set<number>, accounts: Account[]): string | undefined {
  const aliases = accountAliases(accounts).sort(
    (a, b) => b.phrase.split(' ').length - a.phrase.split(' ').length
  );
  for (const alias of aliases) {
    let from = 0;
    while (from < tokens.length) {
      const at = findPhrase(tokens, taken, alias.phrase, from);
      if (at < 0) break;
      // Walk back over "la", "mi" and one "con/en".
      let start = at;
      while (start > 0 && !taken.has(start - 1) && ACCOUNT_ARTICLES.has(tokens[start - 1].word)) start--;
      const prep = start > 0 && !taken.has(start - 1) ? tokens[start - 1].word : '';
      const hasPrep = ACCOUNT_PREPS.has(prep);
      if (alias.needsPrep && !PAY_PREPS.has(prep)) {
        from = at + 1;
        continue;
      }
      if (hasPrep) start--;
      take(taken, start, at + alias.phrase.split(' ').length - start);
      return alias.accountId;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Note

const FILLER = new Set([
  'en', 'de', 'del', 'por', 'para', 'con', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las',
  'al', 'y', 'que', 'me', 'se', 'lo', 'le', 'mi', 'mis', 'fue', 'fueron', 'eso', 'esto', 'como',
  'costo', 'costaron', 'valio', 'vale', 'salio', 'total', 'aproximadamente', 'pues', 'bueno',
  'eh', 'ok', 'okay', 'listo', 'rumi', 'oye', 'hola', 'anota', 'anotar', 'registra', 'registrar',
  'apunta', 'pon', 'agrega', 'agregar', 'hice', 'tuve', 'tengo', 'gasto', 'gastos',
  'i', 'on', 'for', 'the', 'a', 'an', 'at', 'of', 'with', 'and', 'to', 'in', 'my', 'was', 'were',
  'cost', 'costs', 'about', 'around', 'like', 'just', 'hey', 'add', 'log', 'record', 'some',
  'expense', 'it',
]);

function buildNote(tokens: Token[], taken: Set<number>): string {
  const runs: Token[][] = [];
  let run: Token[] = [];
  tokens.forEach((tok, i) => {
    if (taken.has(i)) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push(tok);
    }
  });
  if (run.length) runs.push(run);
  const parts = runs
    .map((r) => {
      let s = 0;
      let e = r.length;
      while (s < e && FILLER.has(r[s].word)) s++;
      while (e > s && FILLER.has(r[e - 1].word)) e--;
      return r.slice(s, e).map((t) => t.raw).join(' ');
    })
    .filter(Boolean);
  const note = parts.join(' ').trim();
  if (!note) return '';
  return note.charAt(0).toLocaleUpperCase() + note.slice(1);
}

// ---------------------------------------------------------------------------

export function parseDictation(text: string, options: DictationOptions = {}): DictatedMovement {
  const { accounts = [], currency = 'COP', now = new Date() } = options;
  const tokens = tokenizeSpoken(text);
  const taken = new Set<number>();

  let type: DictatedMovement['type'] = 'expense';
  if (takeAny(tokens, taken, INCOME_PHRASES)) {
    type = 'income';
  } else if (!takeAny(tokens, taken, EXPENSE_PHRASES)) {
    if (tokens.some((t) => INCOME_NOUNS.includes(t.word))) type = 'income';
  }
  // Repeated verbs ("gasté… y pagué…"): drop the rest too.
  while (takeAny(tokens, taken, type === 'income' ? INCOME_PHRASES : EXPENSE_PHRASES));

  const daysAgo = readDaysAgo(tokens, taken, now);
  const accountId = readAccount(tokens, taken, accounts);

  const span = pickAmount(amountSpans(tokens, taken), currency);
  if (span) take(taken, span.start, span.end - span.start);

  return {
    type,
    amount: span ? roundAmount(span.value, currency) : null,
    note: buildNote(tokens, taken),
    accountId,
    daysAgo,
  };
}

/**
 * The day it happened, counted back from `now` and keeping the time of day:
 * said on Monday 26 Oct, "ayer" is Sunday 25 Oct and "el sábado" Saturday 24.
 */
export function dictatedDate(daysAgo: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - Math.max(0, Math.floor(daysAgo)));
  return d;
}

export type HeardAlternative = { transcript: string; confidence?: number };

/**
 * Recognizers return a few guesses; with noise around, the first one is not
 * always the one that makes sense as a movement. Prefer the guess that has an
 * amount, then a description and an account, then the recognizer's confidence;
 * on a tie keep the recognizer's order.
 */
export function bestDictation(
  alternatives: HeardAlternative[],
  options: DictationOptions = {}
): { text: string; movement: DictatedMovement } | null {
  let best: { text: string; movement: DictatedMovement; score: number } | null = null;
  for (const alt of alternatives) {
    const text = alt.transcript?.trim();
    if (!text) continue;
    const movement = parseDictation(text, options);
    const confidence = alt.confidence !== undefined && alt.confidence > 0 ? alt.confidence : 0;
    const score =
      (movement.amount !== null ? 4 : 0) +
      (movement.note ? 2 : 0) +
      (movement.accountId ? 1 : 0) +
      confidence;
    if (!best || score > best.score) best = { text, movement, score };
  }
  return best && { text: best.text, movement: best.movement };
}

/**
 * Words Rumi expects to hear (account and category names, money slang), given
 * to the recognizer so it leans toward them instead of similar-sounding words.
 */
export function dictationVocabulary(names: string[]): string[] {
  const base = ['mil', 'millones', 'lucas', 'pesos', 'efectivo', 'tarjeta de crédito', 'débito', 'Nequi', 'Daviplata'];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...names, ...base]) {
    const v = w.trim();
    const key = normalize(v);
    if (!v || seen.has(key) || /^general$/i.test(v)) continue;
    seen.add(key);
    out.push(v);
  }
  // Recognizers take a short list; keep the user's own names first.
  return out.slice(0, 100);
}
