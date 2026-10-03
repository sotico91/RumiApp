import type { AccountType } from '@/src/types/finance';

export type AccountColor = {
  /** Badge background. */
  color: string;
  /** Initial drawn on the badge. */
  onColor: string;
  /** Account name on a white card: the brand colour, or ink when too light. */
  text: string;
};

const INK = '#0F1C24';

/** Known Colombian banks and wallets, matched on the account name. */
const BRANDS: { match: RegExp; color: string; light?: boolean }[] = [
  { match: /daviplata/i, color: '#E1251B' },
  { match: /davivienda/i, color: '#ED1C24' },
  { match: /nequi/i, color: '#DA0081' },
  { match: /bancolombia/i, color: '#FDDA24', light: true },
  { match: /\bdale\b/i, color: '#0072CE' },
  { match: /bbva/i, color: '#004481' },
  { match: /\bnu\b|nubank/i, color: '#820AD1' },
];

/** Accounts with no brand get their kind's colour or one of these. */
const BY_TYPE: Partial<Record<AccountType, string>> = {
  cash: '#1F9D6C',
  savings: '#B07D10',
  investment: '#2A6F7A',
};

/** No reds or magentas: those read as Daviplata / Nequi. */
const FALLBACK = ['#3A6EA5', '#7B4FA3', '#C2571A', '#5C6B2E', '#1D6F8B', '#8A5A44', '#2A9D8F'];

type ColorInput = { id: string; type: AccountType; label: string };

function brandColor(label: string): AccountColor | null {
  const brand = BRANDS.find((b) => b.match.test(label));
  if (!brand) return null;
  return brand.light
    ? { color: brand.color, onColor: INK, text: INK }
    : { color: brand.color, onColor: '#FFFFFF', text: brand.color };
}

function plain(color: string): AccountColor {
  return { color, onColor: '#FFFFFF', text: color };
}

/**
 * A colour per account so wallets and banks tell apart at a glance: the
 * brand colour for known names, cash / savings / investments by kind, and
 * the rest take palette colours in list order, never repeating one.
 */
export function accountColors(accounts: ColorInput[]): Map<string, AccountColor> {
  const out = new Map<string, AccountColor>();
  const used = new Set<string>();
  for (const acc of accounts) {
    const fixed =
      brandColor(acc.label) ??
      (acc.type !== 'wallet' && acc.type !== 'bank' && BY_TYPE[acc.type]
        ? plain(BY_TYPE[acc.type]!)
        : null);
    if (fixed) {
      out.set(acc.id, fixed);
      used.add(fixed.color);
    }
  }
  let next = 0;
  for (const acc of accounts) {
    if (out.has(acc.id)) continue;
    const free = FALLBACK.find((c) => !used.has(c));
    const color = free ?? FALLBACK[next++ % FALLBACK.length];
    used.add(color);
    out.set(acc.id, plain(color));
  }
  return out;
}
