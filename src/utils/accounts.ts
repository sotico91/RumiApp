import { DEFAULT_ACCOUNTS } from '@/src/data/financeDefaults';
import { roundMoney } from '@/src/utils/money';
import type {
  Account,
  AccountType,
  Debt,
  PaymentMethod,
  TransactionType,
} from '@/src/types/finance';
import type { TranslationKey } from '@/src/i18n/translations';
import { isDebtPayAccountId, revolvingAsPayAccounts } from '@/src/utils/debts';

export function isPrincipalLiquid(type: AccountType): boolean {
  return type === 'cash' || type === 'bank';
}

export function isSecondaryLiquid(type: AccountType): boolean {
  return type === 'savings' || type === 'wallet';
}

export function accountRoleKey(
  type: AccountType
): Extract<
  TranslationKey,
  | 'account.role.principal'
  | 'account.role.bank'
  | 'account.role.secondary'
  | 'account.role.wallet'
  | 'account.role.other'
> {
  if (type === 'cash') return 'account.role.principal';
  if (type === 'bank') return 'account.role.bank';
  if (type === 'wallet') return 'account.role.wallet';
  if (type === 'savings') return 'account.role.secondary';
  return 'account.role.other';
}

export function accountDisplayName(
  acc: Pick<Account, 'nameKey' | 'name'>,
  t: (key: TranslationKey) => string
): string {
  const custom = acc.name?.trim();
  if (custom) return custom;
  const label = t(acc.nameKey as TranslationKey);
  return label && label !== acc.nameKey ? label : acc.nameKey;
}

/** Keep the same kinds together: cash, banks, wallets, savings, investments, credit. */
const ACCOUNT_KIND_ORDER: Record<AccountType, number> = {
  cash: 0,
  bank: 1,
  wallet: 2,
  savings: 3,
  investment: 4,
  credit: 5,
  other: 6,
};

const DEFAULT_SLOT_ORDER = [
  'cash',
  'bank-main',
  'wallet',
  'savings',
  'investments',
  'credit-card',
];

function accountSortName(acc: Pick<Account, 'name' | 'nameKey'>): string {
  return (acc.name?.trim() || acc.nameKey || '').toLocaleLowerCase();
}

export function sortAccountsByKind(accounts: Account[]): Account[] {
  return [...accounts].sort((a, b) => {
    const ka = ACCOUNT_KIND_ORDER[a.type] ?? 9;
    const kb = ACCOUNT_KIND_ORDER[b.type] ?? 9;
    if (ka !== kb) return ka - kb;
    const da = DEFAULT_SLOT_ORDER.indexOf(a.id);
    const db = DEFAULT_SLOT_ORDER.indexOf(b.id);
    const ra = da === -1 ? 100 : da;
    const rb = db === -1 ? 100 : db;
    if (ra !== rb) return ra - rb;
    return accountSortName(a).localeCompare(accountSortName(b));
  });
}

export function accountGroupKey(
  type: AccountType
): Extract<
  TranslationKey,
  | 'home.pocketCash'
  | 'home.pocketBanks'
  | 'home.pocketWallets'
  | 'home.pocketSavings'
  | 'wealth.groupInvestments'
  | 'wealth.groupCredit'
  | 'account.role.other'
> {
  if (type === 'cash') return 'home.pocketCash';
  if (type === 'bank') return 'home.pocketBanks';
  if (type === 'wallet') return 'home.pocketWallets';
  if (type === 'savings') return 'home.pocketSavings';
  if (type === 'investment') return 'wealth.groupInvestments';
  if (type === 'credit') return 'wealth.groupCredit';
  return 'account.role.other';
}

/** One-tap shortcuts. Any other name is a separate wallet with its own balance. */
export const WALLET_PRESETS = ['Nequi', 'Daviplata'] as const;

export function slugWalletId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `wallet-${slug || 'custom'}`;
}

export function findWalletByName(accounts: Account[], name: string): Account | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  const id = slugWalletId(name);
  return accounts.find(
    (a) =>
      a.type === 'wallet' &&
      (a.id === id || (a.name ?? '').trim().toLowerCase() === wanted)
  );
}

export function ensureWalletAccount(
  accounts: Account[],
  name: string
): { accounts: Account[]; account: Account; created: boolean } {
  const trimmed = name.trim();
  const existing = findWalletByName(accounts, trimmed);
  if (existing) return { accounts, account: existing, created: false };

  // Empty placeholder becomes the first named wallet so we don't leave a duplicate $0 pocket.
  const unnamedDefault = accounts.find(
    (a) =>
      a.id === 'wallet' &&
      a.type === 'wallet' &&
      !(a.name ?? '').trim() &&
      a.balance === 0
  );
  if (unnamedDefault) {
    const account: Account = { ...unnamedDefault, name: trimmed };
    return {
      accounts: accounts.map((a) => (a.id === unnamedDefault.id ? account : a)),
      account,
      created: true,
    };
  }

  let id = slugWalletId(trimmed);
  if (accounts.some((a) => a.id === id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  const account: Account = {
    id,
    nameKey: 'account.wallet',
    name: trimmed,
    type: 'wallet',
    balance: 0,
  };
  return { accounts: sortAccountsByKind([...accounts, account]), account, created: true };
}

export function isRemovableWallet(
  acc: Pick<Account, 'id' | 'type' | 'name'>
): boolean {
  if (acc.type !== 'wallet') return false;
  // Named default slot (e.g. Davivienda) or any extra wallet can be removed.
  return Boolean(acc.name?.trim()) || acc.id !== 'wallet';
}

export function renameWalletAccount(
  accounts: Account[],
  id: string,
  name: string
):
  | { accounts: Account[]; account: Account }
  | { error: 'missing' | 'empty' | 'duplicate' } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'empty' };
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'wallet') return { error: 'missing' };
  const clash = findWalletByName(accounts, trimmed);
  if (clash && clash.id !== id) return { error: 'duplicate' };
  const account = { ...current, name: trimmed };
  return {
    accounts: accounts.map((a) => (a.id === id ? account : a)),
    account,
  };
}

export function removeWalletAccount(
  accounts: Account[],
  id: string
): { accounts: Account[] } | { error: 'missing' | 'protected' | 'hasBalance' } {
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'wallet') return { error: 'missing' };
  if (!isRemovableWallet(current)) return { error: 'protected' };
  if (Math.abs(current.balance) >= 0.01) return { error: 'hasBalance' };
  // Keep the default pocket: dropping it would come back empty on next load.
  if (current.id === 'wallet') {
    const account = { ...current, name: undefined };
    return {
      accounts: accounts.map((a) => (a.id === 'wallet' ? account : a)),
    };
  }
  return { accounts: accounts.filter((a) => a.id !== id) };
}

export const BANK_PRESETS = ['Bancolombia', 'Davivienda'] as const;

export function slugBankId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `bank-${slug || 'extra'}`;
}

export function findBankByName(accounts: Account[], name: string): Account | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  const id = slugBankId(name);
  return accounts.find(
    (a) =>
      a.type === 'bank' &&
      (a.id === id || (a.name ?? '').trim().toLowerCase() === wanted)
  );
}

export function ensureBankAccount(
  accounts: Account[],
  name: string
): { accounts: Account[]; account: Account; created: boolean } {
  const trimmed = name.trim();
  const existing = findBankByName(accounts, trimmed);
  if (existing) return { accounts, account: existing, created: false };

  let id = slugBankId(trimmed);
  if (accounts.some((a) => a.id === id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  const account: Account = {
    id,
    nameKey: 'account.bankMain',
    name: trimmed,
    type: 'bank',
    balance: 0,
  };
  return { accounts: sortAccountsByKind([...accounts, account]), account, created: true };
}

export function isRemovableBank(acc: Pick<Account, 'id' | 'type'>): boolean {
  return acc.type === 'bank' && acc.id !== 'bank-main';
}

export function renameBankAccount(
  accounts: Account[],
  id: string,
  name: string
):
  | { accounts: Account[]; account: Account }
  | { error: 'missing' | 'empty' | 'duplicate' } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'empty' };
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'bank') return { error: 'missing' };
  const clash = findBankByName(accounts, trimmed);
  if (clash && clash.id !== id) return { error: 'duplicate' };
  const account = { ...current, name: trimmed };
  return {
    accounts: accounts.map((a) => (a.id === id ? account : a)),
    account,
  };
}

export function removeBankAccount(
  accounts: Account[],
  id: string
): { accounts: Account[] } | { error: 'missing' | 'protected' | 'hasBalance' } {
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'bank') return { error: 'missing' };
  if (!isRemovableBank(current)) return { error: 'protected' };
  if (Math.abs(current.balance) >= 0.01) return { error: 'hasBalance' };
  return { accounts: accounts.filter((a) => a.id !== id) };
}

/** Add newly introduced default accounts (e.g. virtual wallet) without wiping balances. */
/** Default investments pocket; extra ones are named (CDT, fund, stocks…). */
export const DEFAULT_INVESTMENT_ID = 'investments';

export function slugInvestmentId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `invest-${slug || 'extra'}`;
}

export function findInvestmentByName(accounts: Account[], name: string): Account | undefined {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return undefined;
  const id = slugInvestmentId(name);
  return accounts.find(
    (a) =>
      a.type === 'investment' &&
      (a.id === id || (a.name ?? '').trim().toLowerCase() === wanted)
  );
}

export function ensureInvestmentAccount(
  accounts: Account[],
  name: string
): { accounts: Account[]; account: Account; created: boolean } {
  const trimmed = name.trim();
  const existing = findInvestmentByName(accounts, trimmed);
  if (existing) return { accounts, account: existing, created: false };
  let id = slugInvestmentId(trimmed);
  if (accounts.some((a) => a.id === id)) id = `${id}-${Date.now().toString(36)}`;
  const account: Account = {
    id,
    nameKey: 'account.investments',
    name: trimmed,
    type: 'investment',
    balance: 0,
  };
  return { accounts: sortAccountsByKind([...accounts, account]), account, created: true };
}

export function isRemovableInvestment(acc: Pick<Account, 'id' | 'type'>): boolean {
  return acc.type === 'investment' && acc.id !== DEFAULT_INVESTMENT_ID;
}

export function renameInvestmentAccount(
  accounts: Account[],
  id: string,
  name: string
):
  | { accounts: Account[]; account: Account }
  | { error: 'missing' | 'empty' | 'duplicate' } {
  const trimmed = name.trim();
  if (!trimmed) return { error: 'empty' };
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'investment') return { error: 'missing' };
  const clash = findInvestmentByName(accounts, trimmed);
  if (clash && clash.id !== id) return { error: 'duplicate' };
  const account = { ...current, name: trimmed };
  return { accounts: accounts.map((a) => (a.id === id ? account : a)), account };
}

export function removeInvestmentAccount(
  accounts: Account[],
  id: string
): { accounts: Account[] } | { error: 'missing' | 'protected' | 'hasBalance' } {
  const current = accounts.find((a) => a.id === id);
  if (!current || current.type !== 'investment') return { error: 'missing' };
  if (!isRemovableInvestment(current)) return { error: 'protected' };
  if (Math.abs(current.balance) >= 0.01) return { error: 'hasBalance' };
  return { accounts: accounts.filter((a) => a.id !== id) };
}

export function mergeDefaultAccounts(stored: Account[] | null | undefined): {
  accounts: Account[];
  changed: boolean;
} {
  const list = Array.isArray(stored) ? stored : [];
  const byId = new Map(list.map((a) => [a.id, a]));
  const accounts: Account[] = [];
  let changed = list.length === 0;

  for (const def of DEFAULT_ACCOUNTS) {
    const existing = byId.get(def.id);
    if (existing) {
      accounts.push({
        ...existing,
        nameKey: existing.nameKey || def.nameKey,
        type: existing.type || def.type,
      });
      byId.delete(def.id);
    } else {
      accounts.push({ ...def, balance: 0 });
      changed = true;
    }
  }

  for (const extra of byId.values()) {
    accounts.push(extra);
  }

  const sorted = sortAccountsByKind(accounts);
  const orderChanged = sorted.some((a, i) => a.id !== accounts[i]?.id);
  return { accounts: sorted, changed: changed || orderChanged };
}

export function defaultIncomeAccountId(accounts: Account[]): string {
  return accounts.find((a) => a.type === 'bank')?.id ?? accounts[0]?.id ?? 'bank-main';
}

/**
 * Pockets that match how the money left: cash, debit card, credit, or transfer.
 * For spends, prefer `accountsForExpenseSource` so wallets (Ualá, Nequi…) are always choosable.
 */
export function accountsForPaymentMethod(
  accounts: Account[],
  method: PaymentMethod,
  opts?: {
    debts?: Debt[];
    debtLabel?: (debt: Debt) => string;
  }
): Account[] {
  switch (method) {
    case 'cash':
      return accounts.filter((a) => a.type === 'cash');
    case 'debit':
      // Banks and digital wallets — money already in a spendable pocket.
      return sortAccountsByKind(
        accounts.filter(
          (a) => a.type === 'bank' || a.type === 'wallet' || a.type === 'savings'
        )
      );
    case 'credit': {
      return revolvingAsPayAccounts(
        opts?.debts ?? [],
        opts?.debtLabel ?? ((d) => d.name?.trim() || '')
      );
    }
    case 'transfer':
      return sortAccountsByKind(
        accounts.filter(
          (a) => a.type === 'bank' || a.type === 'wallet' || a.type === 'savings'
        )
      );
  }
}

/**
 * Where an expense / debt payment actually left.
 * Credit → card cupos. Otherwise every liquid pocket (cash, bank, wallet, savings)
 * so spending from Ualá does not require picking “Transferencia”.
 */
export function accountsForExpenseSource(
  accounts: Account[],
  method: PaymentMethod,
  opts?: {
    debts?: Debt[];
    debtLabel?: (debt: Debt) => string;
    /** Shown even when empty: the account a movement being edited already uses. */
    keepId?: string;
  }
): Account[] {
  if (method === 'credit') {
    return accountsForPaymentMethod(accounts, 'credit', opts);
  }
  return liquidPocketsForPay(accounts, opts?.keepId);
}

/** Below half a cent nothing is really there / missing (float residue). */
const HALF_CENT_FUNDS = 0.005;

/** Keep payment-method metadata aligned with the pocket the user picked. */
export function paymentMethodForAccount(
  acc: Pick<Account, 'type'> | undefined,
  fallback: PaymentMethod = 'debit'
): PaymentMethod {
  if (!acc) return fallback;
  if (acc.type === 'cash') return 'cash';
  if (acc.type === 'credit') return 'credit';
  if (acc.type === 'wallet' || acc.type === 'savings') return 'transfer';
  return 'debit';
}

export function firstAccountId(list: Account[], preferredId?: string): string | undefined {
  if (preferredId && list.some((a) => a.id === preferredId)) return preferredId;
  return list[0]?.id;
}

/**
 * Pockets a spend or payment can come from: only those with money in them.
 * Paying from an empty one would leave it below zero.
 */
export function liquidPocketsForPay(accounts: Account[], keepId?: string): Account[] {
  return sortAccountsByKind(
    accounts.filter(
      (a) => isSpendableLiquid(a.type) && (a.balance > HALF_CENT_FUNDS || a.id === keepId)
    )
  );
}

/** Cash, banks, wallets, savings, investments — not credit lines. */
export function moneyPockets(accounts: Account[]): Account[] {
  return sortAccountsByKind(accounts.filter((a) => a.type !== 'credit'));
}

/** Cash, savings, virtual wallets, or the main bank — wherever this spend actually left. */
export function isSpendableLiquid(type: AccountType): boolean {
  return (
    type === 'cash' ||
    type === 'bank' ||
    type === 'savings' ||
    type === 'wallet'
  );
}

/** Pockets you can move money between (not a spend). */
export function pocketMoveAccounts(
  accounts: Account[],
  kind: 'transfer' | 'investment' = 'transfer'
): Account[] {
  if (kind === 'investment') {
    return accounts.filter(
      (a) => isSpendableLiquid(a.type) || a.type === 'investment'
    );
  }
  return accounts.filter((a) => isSpendableLiquid(a.type));
}

function liquidWithFunds(accounts: Account[], minBalance: number): Account[] {
  return accounts
    .filter((a) => isSpendableLiquid(a.type) && a.balance >= minBalance)
    .sort((a, b) => b.balance - a.balance);
}

function accountCovers(acc: Account | undefined, amount?: number): boolean {
  if (!acc || !isSpendableLiquid(acc.type)) return false;
  if (amount != null && amount > 0) return acc.balance >= amount;
  return acc.balance > 0;
}

/**
 * Prefer the pocket the user last used only if it can pay. Otherwise use leftover
 * in wallets/savings (or any liquid pocket that still has money).
 */
export function resolveSpendAccountId(
  accounts: Account[],
  preferredId: string | undefined,
  amount?: number
): string {
  const preferred = preferredId
    ? accounts.find((a) => a.id === preferredId)
    : undefined;
  if (preferred && accountCovers(preferred, amount)) return preferred.id;

  const need = amount != null && amount > 0 ? amount : 0.01;
  const enough = liquidWithFunds(accounts, need);
  if (enough[0]) return enough[0].id;
  const any = liquidWithFunds(accounts, 0.01);
  if (any[0]) return any[0].id;
  return preferred?.id ?? defaultIncomeAccountId(accounts);
}

export function defaultSpendAccountId(
  accounts: Account[],
  opts?: { lastAccountId?: string; amount?: number }
): string {
  return resolveSpendAccountId(accounts, opts?.lastAccountId, opts?.amount);
}


/** Money in cash, bank, wallets and savings together (never below zero). */
export function spendableTotal(accounts: Account[]): number {
  const total = accounts
    .filter((a) => isSpendableLiquid(a.type))
    .reduce((sum, a) => sum + a.balance, 0);
  return Math.max(0, roundMoney(total));
}

/**
 * How much is missing in the pocket a spend or debt payment comes from (it
 * would go below zero otherwise). Credit cards / cupos are not your money,
 * so they never fall short here.
 */
export function fundsShortfall(
  accounts: Account[],
  input: { type: TransactionType; amount: number; accountId?: string }
): number {
  if (input.type !== 'expense' && input.type !== 'debt_payment') return 0;
  if (isDebtPayAccountId(input.accountId)) return 0;
  const account = accounts.find((a) => a.id === input.accountId);
  if (account?.type === 'credit') return 0;
  const available = account ? Math.max(0, account.balance) : 0;
  const missing = roundMoney(input.amount - available);
  return missing > HALF_CENT_FUNDS ? missing : 0;
}

/**
 * Don't leave cash/bank in the red while wallets or savings still have leftover.
 * Covers overdrafts from secondary pockets first, then other liquid accounts.
 */
/** Float residues below half a cent are not real overdrafts. */
const HALF_CENT = 0.005;

export function settleLiquidOverdrafts(accounts: Account[]): {
  accounts: Account[];
  changed: boolean;
} {
  const next = accounts.map((a) => ({ ...a }));
  const liquid = next.filter((a) => isSpendableLiquid(a.type));
  let changed = false;

  const overs = liquid
    .filter((a) => a.balance < -HALF_CENT)
    .sort((a, b) => {
      const pa = isPrincipalLiquid(a.type) ? 0 : 1;
      const pb = isPrincipalLiquid(b.type) ? 0 : 1;
      return pa - pb;
    });

  for (const over of overs) {
    let need = -over.balance;
    const donors = liquid
      .filter((a) => a.id !== over.id && a.balance > HALF_CENT)
      .sort((a, b) => {
        const sa = isSecondaryLiquid(a.type) ? 1 : 0;
        const sb = isSecondaryLiquid(b.type) ? 1 : 0;
        if (sa !== sb) return sb - sa;
        return b.balance - a.balance;
      });
    for (const donor of donors) {
      if (need <= HALF_CENT) break;
      const give = Math.min(donor.balance, need);
      if (give <= 0) continue;
      donor.balance = roundMoney(donor.balance - give);
      over.balance = roundMoney(over.balance + give);
      need -= give;
      changed = true;
    }
  }

  return { accounts: next, changed };
}

export function defaultTransferDestinationId(
  accounts: Account[],
  fromId?: string
): string {
  const savings = accounts.find((a) => a.type === 'savings' && a.id !== fromId);
  if (savings) return savings.id;
  const wallet = accounts.find((a) => a.type === 'wallet' && a.id !== fromId);
  if (wallet) return wallet.id;
  return accounts.find((a) => a.id !== fromId)?.id ?? 'savings';
}

export function mapLiquidAccounts(
  accounts: Account[],
  kind: 'principal' | 'secondary'
) {
  const match =
    kind === 'principal' ? isPrincipalLiquid : isSecondaryLiquid;
  return accounts.filter((a) => match(a.type)).map((a) => ({
    id: a.id,
    type: a.type,
    balance: a.balance,
    nameKey: a.nameKey,
    name: a.name,
  }));
}
