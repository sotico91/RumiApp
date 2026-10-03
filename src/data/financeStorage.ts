import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_BUDGETS,
  DEFAULT_DEBTS,
  DEFAULT_SUBSCRIPTIONS,
} from '@/src/data/financeDefaults';
import { encryptJson, readSecureJson, writeSecureJson } from '@/src/data/secureStorage';
import { loadShardedTransactions, planShardWrites } from '@/src/data/transactionShards';
import { mergeDefaultAccounts, settleLiquidOverdrafts } from '@/src/utils/accounts';
import type {
  Account,
  Budget,
  Debt,
  Expense,
  Subscription,
  Transaction,
} from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';

const ACCOUNTS_KEY = 'rumi:accounts:v2';
const BUDGETS_KEY = 'rumi:budgets:v2';
const DEBTS_KEY = 'rumi:debts:v2';
const SUBS_KEY = 'rumi:subscriptions:v2';
const LEGACY_EXPENSES = 'gastos-hormiga:expenses:v1';

/**
 * Everything here is stored encrypted (see secureStorage); movements as one
 * entry per month (see transactionShards).
 */
async function loadJson<T>(key: string, fallback: T): Promise<T> {
  return (await readSecureJson<T>(key)) ?? fallback;
}

/** One write at a time, so a slower earlier save never lands after a newer one. */
let writeQueue: Promise<unknown> = Promise.resolve();
function serial(task: () => Promise<void>): Promise<void> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Records without these fields would crash sorting on every launch. */
function isLoadableTransaction(tx: unknown): tx is Transaction {
  if (!tx || typeof tx !== 'object') return false;
  const rec = tx as Partial<Transaction>;
  return typeof rec.id === 'string' && typeof rec.createdAt === 'string';
}

export async function loadTransactions(): Promise<Transaction[]> {
  const existing = await loadShardedTransactions();
  if (existing) {
    const loadable = existing.filter(isLoadableTransaction);
    let changed = loadable.length !== existing.length;
    const cleaned = loadable.map((tx) => {
      if (!isPocketMove(tx.type)) return tx;
      if (!tx.categoryId && !tx.paymentMethod && !tx.creditDebtId && !tx.debtId) {
        return tx;
      }
      changed = true;
      return {
        ...tx,
        categoryId: undefined,
        paymentMethod: undefined,
        creditDebtId: undefined,
        debtId: undefined,
      };
    });
    const sorted = cleaned.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (changed) await saveTransactions(sorted);
    return sorted;
  }

  const legacy = await loadJson<Expense[]>(LEGACY_EXPENSES, []);
  const migrated: Transaction[] = legacy.map((e) => ({
    id: e.id,
    type: 'expense' as const,
    amount: e.amount,
    categoryId: e.categoryId,
    paymentMethod: 'cash' as const,
    accountId: 'cash',
    note: e.note,
    createdAt: e.createdAt,
  }));
  if (migrated.length > 0) await saveTransactions(migrated);
  await AsyncStorage.removeItem(LEGACY_EXPENSES);
  return migrated;
}

export function saveTransactions(items: Transaction[]): Promise<void> {
  return serial(async () => {
    const plan = await planShardWrites(items);
    if (plan.set.length > 0) await AsyncStorage.multiSet(plan.set);
    if (plan.remove.length > 0) await AsyncStorage.multiRemove(plan.remove);
    plan.commit();
  });
}

export async function loadAccounts(): Promise<Account[]> {
  const stored = await loadJson<Account[] | null>(ACCOUNTS_KEY, null);
  const { accounts, changed } = mergeDefaultAccounts(stored);
  const settled = settleLiquidOverdrafts(accounts);
  if (changed || settled.changed) {
    await saveAccounts(settled.accounts);
  }
  return settled.accounts;
}

export function saveAccounts(items: Account[]): Promise<void> {
  return serial(() => writeSecureJson(ACCOUNTS_KEY, items));
}

export async function loadBudgets(): Promise<Budget[]> {
  const stored = await loadJson<Budget[] | null>(BUDGETS_KEY, null);
  if (!stored || !Array.isArray(stored)) return [...DEFAULT_BUDGETS];
  return stored;
}

export function saveBudgets(items: Budget[]): Promise<void> {
  return serial(() => writeSecureJson(BUDGETS_KEY, items));
}

export async function loadDebts(): Promise<Debt[]> {
  const stored = await loadJson<Debt[] | null>(DEBTS_KEY, null);
  if (!stored || !Array.isArray(stored)) return [...DEFAULT_DEBTS];
  return stored.map((d) => {
    if (d.nameKey) return d;
    if (d.id === 'debt-card') return { ...d, nameKey: 'debt.mainCard', name: undefined };
    return d;
  });
}

export function saveDebts(items: Debt[]): Promise<void> {
  return serial(() => writeSecureJson(DEBTS_KEY, items));
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  const stored = await loadJson<Subscription[] | null>(SUBS_KEY, null);
  if (!stored || !Array.isArray(stored)) return [...DEFAULT_SUBSCRIPTIONS];
  return stored.map((s) => {
    if (s.nameKey) return s;
    if (s.id === 'sub-gym') return { ...s, nameKey: 'sub.gym', name: undefined };
    if (s.id === 'sub-stream') return { ...s, nameKey: 'sub.streaming', name: undefined };
    return s;
  });
}

export function saveSubscriptions(items: Subscription[]): Promise<void> {
  return serial(() => writeSecureJson(SUBS_KEY, items));
}

export type FinanceSnapshot = {
  transactions?: Transaction[];
  accounts?: Account[];
  budgets?: Budget[];
  debts?: Debt[];
  subscriptions?: Subscription[];
};

/**
 * Persist related lists in one multiSet so a crash mid-save cannot leave
 * balances out of sync with the transaction history.
 */
export function saveFinanceState(snapshot: FinanceSnapshot): Promise<void> {
  return serial(async () => {
    const pairs: [string, string][] = [];
    const plan = snapshot.transactions ? await planShardWrites(snapshot.transactions) : null;
    if (plan) pairs.push(...plan.set);
    if (snapshot.accounts) pairs.push([ACCOUNTS_KEY, await encryptJson(snapshot.accounts)]);
    if (snapshot.budgets) pairs.push([BUDGETS_KEY, await encryptJson(snapshot.budgets)]);
    if (snapshot.debts) pairs.push([DEBTS_KEY, await encryptJson(snapshot.debts)]);
    if (snapshot.subscriptions) {
      pairs.push([SUBS_KEY, await encryptJson(snapshot.subscriptions)]);
    }
    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);
    if (plan && plan.remove.length > 0) await AsyncStorage.multiRemove(plan.remove);
    plan?.commit();
  });
}
