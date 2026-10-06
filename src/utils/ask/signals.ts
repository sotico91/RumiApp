import { normalizeAmountDigits } from '@/src/utils/money';
import { LEXICON } from './lexicon';
import { includesAny, normalize } from './text';

export type PaymentMethod = 'cash' | 'debit' | 'credit' | 'transfer';

/** Also "gasté más esta semana que la pasada", where the words are split. */
export function isCompareQuery(q: string): boolean {
  return includesAny(q, LEXICON.compare) || /\b(?:mas|menos|more|less)\b.+\b(?:que|than)\b/.test(q);
}

export function isCardPaymentQuery(q: string): boolean {
  return includesAny(q, [
    'pago de tc',
    'pago tc',
    'pague la tc',
    'pague tc',
    'pague la tarjeta',
    'pague tarjeta',
    'pago de tarjeta',
    'pago tarjeta',
    'pagos de tarjeta',
    'pagos a tarjeta',
    'abono a tarjeta',
    'abono a la tarjeta',
    'abono a la tc',
    'pague la tarjeta de credito',
    'pagar la tarjeta',
    'pagar tarjeta',
    'pague mi tarjeta',
    'card payment',
    'paid my card',
    'paid the card',
    'paid the credit card',
    'credit card payment',
    'pay the card',
    'payment to the card',
  ]);
}

export function isCardTopicQuery(q: string): boolean {
  return (
    isCardPaymentQuery(q) ||
    includesAny(q, [
      'tarjeta de credito',
      'tarjeta de crédito',
      'tarjeta credito',
      'tarjeta crédito',
      'credit card',
      'con tarjeta',
      'tarjeta',
      'tarjetas',
      'tc',
    ])
  );
}

export function detectPaymentMethod(q: string): PaymentMethod | null {
  if (includesAny(q, ['efectivo', 'cash'])) return 'cash';
  if (includesAny(q, ['debito', 'débito', 'debit'])) return 'debit';
  // Paying the card is an obligation, not “spent with credit”.
  if (isCardPaymentQuery(q)) return null;
  // Do NOT treat bare "crédito(s)" as card — that is the Créditos spend concept / installments.
  if (
    includesAny(q, [
      'tarjeta de credito',
      'tarjeta de crédito',
      'tarjeta credito',
      'tarjeta crédito',
      'credit card',
      'con tarjeta',
      'tarjeta',
      'tarjetas',
      'card',
    ])
  ) {
    return 'credit';
  }
  if (includesAny(q, ['transferencia', 'transferencias', 'transfer'])) return 'transfer';
  return null;
}

export function extractNoteNeedle(q: string): string | null {
  const quoted = q.match(/["“']([^"”']+)["”']/);
  if (quoted?.[1]) return normalize(quoted[1]);

  const para = q.match(/\b(?:a|para|por|to)\s+([a-záéíóúñ]{2,})/i);
  if (
    para?.[1] &&
    !includesAny(para[1], [
      'mes',
      'semana',
      'ano',
      'año',
      'hoy',
      'tarjeta',
      'cuenta',
      'mi',
      'la',
      'credito',
      'creditos',
      'cuota',
      'cuotas',
      'deuda',
      'deudas',
    ])
  ) {
    return normalize(para[1]);
  }
  return null;
}

export const AMOUNT_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  mil: 1_000,
  m: 1_000_000,
  mm: 1_000_000,
  millon: 1_000_000,
  millones: 1_000_000,
  palo: 1_000_000,
  palos: 1_000_000,
};

/** "500000", "500.000", "500 mil", "500k", "1,5 millones" → number. */
export function parseQueryAmount(q: string): number | null {
  const re = /(\d[\d.,]*)\s*(k|mil|mm|m|millon|millones|palos?)?(?![a-z])/g;
  let best: number | null = null;
  for (const match of q.matchAll(re)) {
    const digits = normalizeAmountDigits(match[1]);
    const base = Number(digits);
    if (!Number.isFinite(base) || base <= 0) continue;
    const unit = match[2];
    // A bare 4-digit year ("en 2025") is not a price.
    if (!unit && /^(19|20)\d{2}$/.test(match[1])) continue;
    const value = unit ? base * AMOUNT_MULTIPLIERS[unit] : base;
    if (best == null || value > best) best = value;
  }
  return best;
}
