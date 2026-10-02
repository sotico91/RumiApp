import type { Currency } from '@/src/types/settings';

/**
 * Keep currency symbol, sign and digits on one visual line.
 * RN Text often wraps after `$` even with NBSP; drop that gap and glue the sign.
 */
function keepMoneyOnOneLine(formatted: string): string {
  return formatted
    .replace(/([\-\u2212])[\s\u00A0]*/u, '$1\u2060')
    .replace(/([\$\u00A2\u20AC\u00A3\u20B1])[\s\u00A0]+/u, '$1')
    .replace(/[\s\u00A0]+/g, '\u00A0');
}

/**
 * Round to cents. Float math leaves residues (0.30 - 0.10 - 0.20 is not 0),
 * which show as "-$0.00" and look like overdrafts. COP amounts are whole
 * pesos, so this is a no-op for them.
 */
export function roundMoney(amount: number): number {
  const rounded = Math.round(amount * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    amount = roundMoney(amount);
    return keepMoneyOnOneLine(
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    );
  }

  // Empty / zero tiles should read as money ($0,00), not a bare 0.
  const isZero = !Number.isFinite(amount) || amount === 0;
  return keepMoneyOnOneLine(
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: isZero ? 2 : 0,
      maximumFractionDigits: isZero ? 2 : 0,
    }).format(isZero ? 0 : Math.round(amount))
  );
}

/** Mask used when amounts are hidden for privacy. */
export function maskMoney(currency: Currency): string {
  return currency === 'USD' ? '$*****.**' : '$*****,**';
}

/** @deprecated use formatMoney with currency from settings */
export function formatCOP(amount: number): string {
  return formatMoney(amount, 'COP');
}

/**
 * Accept comma or dot as decimal, and common thousands separators
 * (1.234,56 / 1,234.56 / 15,5 / 15.5 / 15.000).
 */
export function normalizeAmountDigits(value: string): string {
  let s = value.trim().replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (!s) return '';

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      // 1.234,56 → 1234.56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 → 1234.56
      s = s.replace(/,/g, '');
    }
    return s;
  }

  const sepIndex = Math.max(lastComma, lastDot);
  if (sepIndex < 0) return s;

  const frac = s.length - sepIndex - 1;
  const sep = s[sepIndex];
  const left = s.slice(0, sepIndex);
  const right = s.slice(sepIndex + 1);

  // Multiple same separators → thousands (1.234.567 / 1,234,567).
  if ((sep === '.' && left.includes('.')) || (sep === ',' && left.includes(','))) {
    return s.replace(/[.,]/g, '');
  }

  // Exactly 3 digits after a single separator → thousands (15.000 / 15,000).
  if (frac === 3) {
    return left + right;
  }

  // 1–2 fractional digits → decimal.
  return `${left}.${right}`;
}

export function parseAmountInput(value: string, currency: Currency = 'COP'): number | null {
  const cleaned = normalizeAmountDigits(value);
  if (!cleaned) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (currency === 'USD') {
    return Math.round(amount * 100) / 100;
  }
  // COP display has no cents; keep pesos whole.
  return Math.round(amount);
}
