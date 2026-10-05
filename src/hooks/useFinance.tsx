import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DEFAULT_ACCOUNTS,
  DEFAULT_SUBSCRIPTIONS,
  getCategoryById,
} from '@/src/data/financeDefaults';
import {
  findSpendSub,
  flattenSpendSubs,
  pruneBudgetsToSpendSubs,
  resolveConceptColor,
} from '@/src/data/spendConcepts';
import {
  loadAccounts,
  loadBudgets,
  loadDebts,
  loadSubscriptions,
  loadTransactions,
  saveAccounts,
  saveBudgets,
  saveDebts,
  saveFinanceState,
  saveTransactions,
} from '@/src/data/financeStorage';
import type {
  Account,
  Budget,
  Debt,
  Period,
  Subscription,
  Transaction,
  TransactionType,
  PaymentMethod,
} from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';
import { useSettings } from '@/src/hooks/useSettings';
import { useCalendarClock } from '@/src/hooks/useCalendarClock';
import {
  antExpenseBreakdown,
  detectRecurring,
  filterByCalendarMonth,
  filterByPeriod,
  percentOfBase,
  predictMonthlySpends,
  sumByType,
  sumSpendOut,
  type PredictedSpend,
} from '@/src/utils/financeMath';
import { mapLiquidAccounts, mergeDefaultAccounts, ensureWalletAccount, renameWalletAccount, removeWalletAccount, ensureBankAccount, renameBankAccount, removeBankAccount, ensureInvestmentAccount, renameInvestmentAccount, removeInvestmentAccount, resolveSpendAccountId, settleLiquidOverdrafts } from '@/src/utils/accounts';
import {
  closePaidInstallments,
  closedAtAfterBalance,
  debtIdFromPayAccountId,
} from '@/src/utils/debts';
import {
  applyAccountDelta,
  applyTxDebts,
  isEditablePocketBalance,
  pocketMoveAccountsReady,
} from '@/src/utils/ledger';
import { computeNetWorth } from '@/src/utils/netWorth';
import {
  filterByPersonScope,
  isRegisteredByMe,
} from '@/src/utils/personScope';
import type { PersonScope } from '@/src/types/finance';

type NewTxInput = {
  type: TransactionType;
  amount: number;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  toAccountId?: string;
  debtId?: string;
  creditDebtId?: string;
  note?: string;
  createdAt?: string;
  isRecurring?: boolean;
};

type CategoryInsight = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percent: number;
  count: number;
};

type FinanceContextValue = {
  loading: boolean;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  addTransaction: (input: NewTxInput) => Promise<Transaction>;
  addDebt: (input: {
    name: string;
    balance: number;
    installment: number;
    interestRate?: number;
    nextPaymentDate?: string;
    categoryId?: string;
    kind?: Debt['kind'];
    revolvingProduct?: Debt['revolvingProduct'];
    creditLimit?: number;
  }) => Promise<Debt>;
  updateDebt: (
    id: string,
    patch: Partial<
      Pick<
        Debt,
        | 'name'
        | 'balance'
        | 'installment'
        | 'interestRate'
        | 'nextPaymentDate'
        | 'categoryId'
        | 'kind'
        | 'revolvingProduct'
        | 'creditLimit'
      >
    >
  ) => Promise<Debt | null>;
  removeDebt: (id: string) => Promise<void>;
  updateTransaction: (
    id: string,
    patch: Partial<
      Pick<
        Transaction,
        | 'type'
        | 'amount'
        | 'categoryId'
        | 'paymentMethod'
        | 'accountId'
        | 'toAccountId'
        | 'note'
        | 'createdAt'
        | 'creditDebtId'
        | 'debtId'
      >
    >
  ) => Promise<Transaction | null>;
  removeTransaction: (id: string) => Promise<void>;
  /** Puts a just-deleted transaction back (Undo), with its balances. */
  restoreTransaction: (tx: Transaction) => Promise<void>;
  canEditTransaction: (tx: Transaction) => boolean;
  resetFinance: () => Promise<void>;
  restoreFromBackup: (backup: {
    transactions: Transaction[];
    accounts: Account[];
    budgets: Budget[];
    debts: Debt[];
    subscriptions: Subscription[];
  }) => Promise<void>;
  addWallet: (name: string) => Promise<Account | null>;
  addBank: (name: string) => Promise<Account | null>;
  addInvestment: (name: string) => Promise<Account | null>;
  renameInvestment: (
    id: string,
    name: string
  ) => Promise<{ account: Account } | { error: 'missing' | 'empty' | 'duplicate' }>;
  removeInvestment: (
    id: string
  ) => Promise<{ ok: true } | { error: 'missing' | 'protected' | 'hasBalance' }>;
  renameWallet: (
    id: string,
    name: string
  ) => Promise<{ account: Account } | { error: 'missing' | 'empty' | 'duplicate' }>;
  renameBank: (
    id: string,
    name: string
  ) => Promise<{ account: Account } | { error: 'missing' | 'empty' | 'duplicate' }>;
  removeWallet: (
    id: string
  ) => Promise<{ ok: true } | { error: 'missing' | 'protected' | 'hasBalance' }>;
  removeBank: (
    id: string
  ) => Promise<{ ok: true } | { error: 'missing' | 'protected' | 'hasBalance' }>;
  setAccountBalance: (
    id: string,
    balance: number
  ) => Promise<{ account: Account } | { error: 'missing' | 'forbidden' | 'invalid' }>;
  updateBudget: (categoryId: string, limit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  transactionsForPeriod: (period: Period, scope?: PersonScope) => Transaction[];
  transactionsForMonth: (
    year: number,
    monthIndex: number,
    scope?: PersonScope
  ) => Transaction[];
  totalForPeriod: (
    period: Period,
    type?: TransactionType,
    scope?: PersonScope
  ) => number;
  insightsForPeriod: (period: Period, kind?: 'expense' | 'income') => CategoryInsight[];
  antForPeriod: (period: Period) => ReturnType<typeof antExpenseBreakdown>;
  recurringTransactions: Transaction[];
  predictedThisMonth: PredictedSpend[];
  availableCash: number;
  /** Principal liquid accounts (cash / main bank). */
  availableByAccount: Array<{
    id: string;
    type: Account['type'];
    balance: number;
    nameKey: string;
    name?: string;
  }>;
  /** Secondary pockets (virtual wallets / savings) — also spendable, not the main bank. */
  secondaryCash: number;
  secondaryByAccount: Array<{
    id: string;
    type: Account['type'];
    balance: number;
    nameKey: string;
    name?: string;
  }>;
  netWorth: { assets: number; liabilities: number; net: number };
  budgetStatus: Array<{
    categoryId: string;
    limit: number;
    spent: number;
    remaining: number;
    ratio: number;
  }>;
  // legacy compatibility for older components
  expenses: Transaction[];
  addExpense: (input: {
    amount: number;
    categoryId: string;
    note?: string;
    createdAt?: string;
  }) => Promise<Transaction>;
  removeExpense: (id: string) => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { settings, ready: settingsReady, pruneQuickTemplatesToExistingExpenses } =
    useSettings();
  const { now, monthKey } = useCalendarClock();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [attributed, setAttributed] = useState(false);

  // Keep latest snapshots for mutations — addWallet then save transfer must not
  // apply against a stale accounts list (destination missing → phantom wallet).
  const accountsRef = useRef(accounts);
  const transactionsRef = useRef(transactions);
  const debtsRef = useRef(debts);
  accountsRef.current = accounts;
  transactionsRef.current = transactions;
  debtsRef.current = debts;

  useEffect(() => {
    if (!settingsReady) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [tx, acc, bud, deb, sub] = await Promise.all([
        loadTransactions(),
        loadAccounts(),
        loadBudgets(),
        loadDebts(),
        loadSubscriptions(),
      ]);
      if (!mounted) return;
      const settled = closePaidInstallments(deb, tx);
      // Keep stored pocket balances (opening stock + prior deltas). Never wipe
      // them by replaying the ledger — that invents a fake bank total.
      setTransactions(tx);
      setAccounts(acc);
      accountsRef.current = acc;
      transactionsRef.current = tx;
      setBudgets(bud);
      setDebts(settled.debts);
      debtsRef.current = settled.debts;
      setSubscriptions(sub);
      setLoading(false);
      if (settled.changed) void saveDebts(settled.debts);
    })();
    return () => {
      mounted = false;
    };
  }, [settingsReady]);

  // Drop budget caps for deleted or legacy subcategories.
  useEffect(() => {
    if (!settingsReady || loading) return;
    const spendConcepts = settings.spendConcepts ?? [];
    setBudgets((current) => {
      const next = pruneBudgetsToSpendSubs(current, spendConcepts);
      if (next.length === current.length) return current;
      void saveBudgets(next);
      return next;
    });
  }, [settingsReady, loading, settings.spendConcepts]);

  // Backfill ownership so legacy rows belong to this singular person.
  useEffect(() => {
    if (loading || !settingsReady || !settings.personId || attributed) return;
    const needs = transactions.some((t) => !t.registeredById);
    if (!needs) {
      setAttributed(true);
      return;
    }
    const ownerName = settings.userName.trim() || 'Me';
    const next = transactions.map((t) =>
      t.registeredById
        ? t
        : {
            ...t,
            registeredById: settings.personId,
            registeredByName: ownerName,
          }
    );
    setTransactions(next);
    setAttributed(true);
    void saveTransactions(next);
  }, [
    loading,
    settingsReady,
    settings.personId,
    settings.userName,
    transactions,
    attributed,
  ]);

  const addTransaction = useCallback(
    async (input: NewTxInput) => {
      const baseAccounts = accountsRef.current;
      const baseTx = transactionsRef.current;
      const baseDebts = debtsRef.current;

      const chargedFromPicker = isPocketMove(input.type)
        ? undefined
        : debtIdFromPayAccountId(input.accountId);
      const creditDebtId = isPocketMove(input.type)
        ? undefined
        : (input.creditDebtId ?? chargedFromPicker);
      const tx: Transaction = {
        id: createId(),
        type: input.type,
        amount: input.amount,
        categoryId: isPocketMove(input.type) ? undefined : input.categoryId,
        paymentMethod: isPocketMove(input.type) ? undefined : input.paymentMethod,
        accountId: creditDebtId
          ? baseAccounts.find((a) => a.type === 'credit')?.id ?? 'credit-card'
          : input.accountId ?? 'cash',
        toAccountId: input.toAccountId,
        debtId: isPocketMove(input.type) ? undefined : input.debtId,
        creditDebtId,
        note: input.note?.trim() || undefined,
        createdAt: input.createdAt ?? new Date().toISOString(),
        isRecurring: input.isRecurring,
        registeredById: settings.personId || undefined,
        registeredByName: settings.userName.trim() || undefined,
      };

      if (isPocketMove(tx.type) && !pocketMoveAccountsReady(baseAccounts, tx)) {
        throw new Error('pocket_move_accounts');
      }

      const chosenExists = baseAccounts.some((a) => a.id === tx.accountId);
      if (
        !creditDebtId &&
        !chosenExists &&
        (tx.type === 'expense' ||
          tx.type === 'withdrawal' ||
          tx.type === 'debt_payment')
      ) {
        tx.accountId = resolveSpendAccountId(
          baseAccounts,
          tx.accountId,
          tx.amount
        );
      }
      const nextTx = [tx, ...baseTx].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      let nextAccounts = applyAccountDelta(baseAccounts, tx, 1);
      if (!tx.creditDebtId && !tx.paymentMethod && !isPocketMove(tx.type)) {
        nextAccounts = settleLiquidOverdrafts(nextAccounts).accounts;
      }
      const nextDebts = applyTxDebts(baseDebts, tx, 1);
      transactionsRef.current = nextTx;
      accountsRef.current = nextAccounts;
      debtsRef.current = nextDebts;
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      setDebts(nextDebts);
      await saveFinanceState({
        transactions: nextTx,
        accounts: nextAccounts,
        debts: nextDebts,
      });
      return tx;
    },
    [settings.personId, settings.userName]
  );

  const addDebt = useCallback(
    async (input: {
      name: string;
      balance: number;
      installment: number;
      interestRate?: number;
      nextPaymentDate?: string;
      categoryId?: string;
      kind?: Debt['kind'];
      revolvingProduct?: Debt['revolvingProduct'];
      creditLimit?: number;
    }) => {
      const nextDate =
        input.nextPaymentDate ??
        (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d.toISOString();
        })();
      const kind = input.kind === 'revolving' ? 'revolving' : 'installment';
      const debt: Debt = {
        id: createId(),
        name: input.name.trim(),
        balance: input.balance,
        installment: input.installment,
        interestRate: input.interestRate ?? 0,
        termMonths: 0,
        nextPaymentDate: nextDate,
        paidCapital: 0,
        paidInterest: 0,
        otherCharges: 0,
        categoryId: input.categoryId,
        isPermanent: true,
        kind,
        revolvingProduct: kind === 'revolving' ? (input.revolvingProduct ?? 'card') : undefined,
        creditLimit: kind === 'revolving' ? input.creditLimit : undefined,
      };
      const next = [debt, ...debts];
      setDebts(next);
      await saveDebts(next);
      return debt;
    },
    [debts]
  );

  const updateDebt = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          Debt,
          | 'name'
          | 'balance'
          | 'installment'
          | 'interestRate'
          | 'nextPaymentDate'
          | 'categoryId'
          | 'kind'
          | 'revolvingProduct'
          | 'creditLimit'
        >
      >
    ) => {
      const existing = debts.find((d) => d.id === id);
      if (!existing) return null;
      const kind =
        patch.kind === 'revolving' || patch.kind === 'installment'
          ? patch.kind
          : existing.kind === 'revolving'
            ? 'revolving'
            : 'installment';
      const updated: Debt = {
        ...existing,
        ...patch,
        name: patch.name !== undefined ? patch.name.trim() : existing.name,
        kind,
        revolvingProduct:
          kind === 'revolving'
            ? (patch.revolvingProduct ?? existing.revolvingProduct ?? 'card')
            : undefined,
        creditLimit: kind === 'revolving' ? (patch.creditLimit ?? existing.creditLimit) : undefined,
        closedAt: closedAtAfterBalance(
          { kind, closedAt: existing.closedAt },
          patch.balance !== undefined ? patch.balance : existing.balance,
          existing.closedAt ?? new Date().toISOString()
        ),
      };
      const next = debts.map((d) => (d.id === id ? updated : d));
      setDebts(next);
      await saveDebts(next);
      return updated;
    },
    [debts]
  );

  const removeDebt = useCallback(
    async (id: string) => {
      const next = debts.filter((d) => d.id !== id);
      setDebts(next);
      await saveDebts(next);
    },
    [debts]
  );

  const addWallet = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const current = accountsRef.current;
    const { accounts: next, account } = ensureWalletAccount(current, trimmed);
    if (next !== current) {
      accountsRef.current = next;
      setAccounts(next);
      await saveAccounts(next);
    }
    return account;
  }, []);

  const addBank = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const current = accountsRef.current;
    const { accounts: next, account } = ensureBankAccount(current, trimmed);
    if (next !== current) {
      accountsRef.current = next;
      setAccounts(next);
      await saveAccounts(next);
    }
    return account;
  }, []);

  const renameWallet = useCallback(async (id: string, name: string) => {
    const result = renameWalletAccount(accountsRef.current, id, name);
    if ('error' in result) return result;
    accountsRef.current = result.accounts;
    setAccounts(result.accounts);
    await saveAccounts(result.accounts);
    return { account: result.account };
  }, []);

  const renameBank = useCallback(async (id: string, name: string) => {
    const result = renameBankAccount(accountsRef.current, id, name);
    if ('error' in result) return result;
    accountsRef.current = result.accounts;
    setAccounts(result.accounts);
    await saveAccounts(result.accounts);
    return { account: result.account };
  }, []);

  const removeWallet = useCallback(async (id: string) => {
    const result = removeWalletAccount(accountsRef.current, id);
    if ('error' in result) return result;
    accountsRef.current = result.accounts;
    setAccounts(result.accounts);
    await saveAccounts(result.accounts);
    return { ok: true as const };
  }, []);

  const removeBank = useCallback(async (id: string) => {
    const result = removeBankAccount(accountsRef.current, id);
    if ('error' in result) return result;
    accountsRef.current = result.accounts;
    setAccounts(result.accounts);
    await saveAccounts(result.accounts);
    return { ok: true as const };
  }, []);

  const addInvestment = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const current = accountsRef.current;
    const { accounts: next, account } = ensureInvestmentAccount(current, trimmed);
    if (next !== current) {
      accountsRef.current = next;
      setAccounts(next);
      await saveAccounts(next);
    }
    return account;
  }, []);

  const renameInvestment = useCallback(async (id: string, name: string) => {
    const result = renameInvestmentAccount(accountsRef.current, id, name);
    if ('error' in result) return result;
    accountsRef.current = result.accounts;
    setAccounts(result.accounts);
    await saveAccounts(result.accounts);
    return { account: result.account };
  }, []);

  const removeInvestment = useCallback(async (id: string) => {
    const result = removeInvestmentAccount(accountsRef.current, id);
    if ('error' in result) return result;
    accountsRef.current = result.accounts;
    setAccounts(result.accounts);
    await saveAccounts(result.accounts);
    return { ok: true as const };
  }, []);

  const setAccountBalance = useCallback(async (id: string, balance: number) => {
    if (!Number.isFinite(balance)) return { error: 'invalid' as const };
    const current = accountsRef.current.find((a) => a.id === id);
    if (!current) return { error: 'missing' as const };
    if (!isEditablePocketBalance(current.type)) return { error: 'forbidden' as const };
    const next = accountsRef.current.map((a) =>
      a.id === id ? { ...a, balance } : a
    );
    accountsRef.current = next;
    setAccounts(next);
    await saveAccounts(next);
    return { account: next.find((a) => a.id === id)! };
  }, []);

  const canEditTransaction = useCallback(
    (tx: Transaction) => isRegisteredByMe(tx, settings.personId),
    [settings.personId]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      const existing = transactionsRef.current.find((t) => t.id === id);
      if (!existing) return;
      if (!isRegisteredByMe(existing, settings.personId)) return;
      const nextTx = transactionsRef.current.filter((t) => t.id !== id);
      // Reverse both legs of the movement (bank ← wallet on deleted transfers).
      const nextAccounts = applyAccountDelta(accountsRef.current, existing, -1);
      const nextDebts = applyTxDebts(debtsRef.current, existing, -1);
      transactionsRef.current = nextTx;
      accountsRef.current = nextAccounts;
      debtsRef.current = nextDebts;
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      setDebts(nextDebts);
      await saveFinanceState({
        transactions: nextTx,
        accounts: nextAccounts,
        debts: nextDebts,
      });
      // One-tap = repeat an existing spend; drop chips when nothing remains to repeat.
      if (existing.type === 'expense') {
        await pruneQuickTemplatesToExistingExpenses(
          nextTx
            .filter((t) => t.type === 'expense' && t.categoryId)
            .map((t) => ({ categoryId: t.categoryId! }))
        );
      }
    },
    [settings.personId, pruneQuickTemplatesToExistingExpenses]
  );

  const restoreTransaction = useCallback(async (tx: Transaction) => {
    if (transactionsRef.current.some((t) => t.id === tx.id)) return;
    // Exact inverse of removeTransaction: same id and date, deltas re-applied.
    const nextTx = [tx, ...transactionsRef.current].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    const nextAccounts = applyAccountDelta(accountsRef.current, tx, 1);
    const nextDebts = applyTxDebts(debtsRef.current, tx, 1);
    transactionsRef.current = nextTx;
    accountsRef.current = nextAccounts;
    debtsRef.current = nextDebts;
    setTransactions(nextTx);
    setAccounts(nextAccounts);
    setDebts(nextDebts);
    await saveFinanceState({
      transactions: nextTx,
      accounts: nextAccounts,
      debts: nextDebts,
    });
  }, []);

  const updateTransaction = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          Transaction,
          | 'type'
          | 'amount'
          | 'categoryId'
          | 'paymentMethod'
          | 'accountId'
          | 'toAccountId'
          | 'note'
          | 'createdAt'
          | 'creditDebtId'
          | 'debtId'
        >
      >
    ) => {
      const baseAccounts = accountsRef.current;
      const baseTx = transactionsRef.current;
      const baseDebts = debtsRef.current;
      const existing = baseTx.find((t) => t.id === id);
      if (!existing) return null;
      if (!isRegisteredByMe(existing, settings.personId)) return null;

      const updated: Transaction = {
        ...existing,
        ...patch,
        registeredById: existing.registeredById,
        registeredByName: existing.registeredByName,
        note:
          patch.note !== undefined
            ? patch.note.trim() || undefined
            : existing.note,
      };
      if (isPocketMove(updated.type)) {
        updated.categoryId = undefined;
        updated.paymentMethod = undefined;
        updated.creditDebtId = undefined;
        updated.debtId = undefined;
        if (!pocketMoveAccountsReady(baseAccounts, updated)) {
          return null;
        }
      } else {
        const chargedFromPicker = debtIdFromPayAccountId(updated.accountId);
        if (chargedFromPicker) {
          updated.creditDebtId = chargedFromPicker;
          updated.accountId =
            baseAccounts.find((a) => a.type === 'credit')?.id ?? 'credit-card';
        } else if (patch.accountId !== undefined && patch.creditDebtId === undefined) {
          updated.creditDebtId = undefined;
        }
      }

      const chosenExists = baseAccounts.some((a) => a.id === updated.accountId);
      if (
        !updated.creditDebtId &&
        !chosenExists &&
        (updated.type === 'expense' ||
          updated.type === 'withdrawal' ||
          updated.type === 'debt_payment')
      ) {
        updated.accountId = resolveSpendAccountId(
          baseAccounts,
          updated.accountId,
          updated.amount
        );
      }

      const nextTx = baseTx
        .map((t) => (t.id === id ? updated : t))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      let nextAccounts = applyAccountDelta(baseAccounts, existing, -1);
      nextAccounts = applyAccountDelta(nextAccounts, updated, 1);
      if (
        !updated.creditDebtId &&
        !updated.paymentMethod &&
        !isPocketMove(updated.type)
      ) {
        nextAccounts = settleLiquidOverdrafts(nextAccounts).accounts;
      }
      let nextDebts = applyTxDebts(baseDebts, existing, -1);
      nextDebts = applyTxDebts(nextDebts, updated, 1);

      transactionsRef.current = nextTx;
      accountsRef.current = nextAccounts;
      debtsRef.current = nextDebts;
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      setDebts(nextDebts);
      await saveFinanceState({
        transactions: nextTx,
        accounts: nextAccounts,
        debts: nextDebts,
      });
      return updated;
    },
    [settings.personId]
  );

  const resetFinance = useCallback(async () => {
    const blankAccounts = DEFAULT_ACCOUNTS.map((a) => ({
      ...a,
      balance: 0,
    }));
    const nextBudgets: Budget[] = [];
    const nextDebts: Debt[] = [];
    const nextSubs = [...DEFAULT_SUBSCRIPTIONS];
    const nextTx: Transaction[] = [];

    transactionsRef.current = nextTx;
    accountsRef.current = blankAccounts;
    debtsRef.current = nextDebts;
    setTransactions(nextTx);
    setAccounts(blankAccounts);
    setBudgets(nextBudgets);
    setDebts(nextDebts);
    setSubscriptions(nextSubs);

    await saveFinanceState({
      transactions: nextTx,
      accounts: blankAccounts,
      budgets: nextBudgets,
      debts: nextDebts,
      subscriptions: nextSubs,
    });
  }, []);

  const restoreFromBackup = useCallback(
    async (backup: {
      transactions: Transaction[];
      accounts: Account[];
      budgets: Budget[];
      debts: Debt[];
      subscriptions: Subscription[];
    }) => {
      const nextTx = [...backup.transactions].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      const { accounts: nextAccounts } = settleLiquidOverdrafts(
        mergeDefaultAccounts(backup.accounts).accounts
      );
      transactionsRef.current = nextTx;
      accountsRef.current = nextAccounts;
      debtsRef.current = backup.debts;
      setTransactions(nextTx);
      setAccounts(nextAccounts);
      setBudgets(backup.budgets);
      setDebts(backup.debts);
      setSubscriptions(backup.subscriptions);
      setAttributed(true);
      await saveFinanceState({
        transactions: nextTx,
        accounts: nextAccounts,
        budgets: backup.budgets,
        debts: backup.debts,
        subscriptions: backup.subscriptions,
      });
    },
    []
  );

  const updateBudget = useCallback(
    async (categoryId: string, limit: number) => {
      const exists = budgets.find((b) => b.categoryId === categoryId);
      const next = exists
        ? budgets.map((b) => (b.categoryId === categoryId ? { ...b, limit } : b))
        : [...budgets, { id: createId(), categoryId, limit }];
      setBudgets(next);
      await saveBudgets(next);
    },
    [budgets]
  );

  const removeBudget = useCallback(
    async (categoryId: string) => {
      const next = budgets.filter((b) => b.categoryId !== categoryId);
      setBudgets(next);
      await saveBudgets(next);
    },
    [budgets]
  );

  const scopedTransactions = useCallback(
    (scope: PersonScope = 'mine') =>
      filterByPersonScope(transactions, scope, settings.personId),
    [transactions, settings.personId]
  );

  const transactionsForPeriod = useCallback(
    (period: Period, scope: PersonScope = 'mine') =>
      filterByPeriod(scopedTransactions(scope), period, now),
    [scopedTransactions, now, monthKey]
  );

  const transactionsForMonth = useCallback(
    (year: number, monthIndex: number, scope: PersonScope = 'mine') =>
      filterByCalendarMonth(scopedTransactions(scope), year, monthIndex),
    [scopedTransactions]
  );

  const totalForPeriod = useCallback(
    (
      period: Period,
      type: TransactionType = 'expense',
      scope: PersonScope = 'mine'
    ) => {
      const list = transactionsForPeriod(period, scope);
      if (type === 'expense') {
        // Only real logged spend — unpaid Wealth installments are reminders, not expenses.
        return sumSpendOut(list, debts);
      }
      return sumByType(list, type);
    },
    [transactionsForPeriod, debts]
  );

  const insightsForPeriod = useCallback(
    (period: Period, kind: 'expense' | 'income' = 'expense'): CategoryInsight[] => {
      const list = transactionsForPeriod(period, 'mine').filter((t) =>
        kind === 'income'
          ? t.type === 'income'
          : t.type === 'expense' || t.type === 'debt_payment'
      );
      const concepts = settings.spendConcepts ?? [];
      const map = new Map<string, { total: number; count: number }>();
      for (const e of list) {
        // Key by subcategory so glance/insights can expand into real subs, not repeat the concept name.
        const key = e.categoryId ?? '__none__';
        const cur = map.get(key) ?? { total: 0, count: 0 };
        cur.total += e.amount;
        cur.count += 1;
        map.set(key, cur);
      }
      const total = list.reduce((sum, e) => sum + e.amount, 0);
      return Array.from(map.entries())
        .map(([categoryId, stats]) => ({
          categoryId,
          name: categoryId,
          color: resolveConceptColor(categoryId, concepts),
          total: stats.total,
          count: stats.count,
          // Share of this period's money out — never of a single row.
          percent: percentOfBase(stats.total, total),
        }))
        .sort((a, b) => b.total - a.total);
    },
    [transactionsForPeriod, settings.spendConcepts]
  );

  const antForPeriod = useCallback(
    (period: Period) =>
      antExpenseBreakdown(
        transactionsForPeriod(period, 'mine'),
        settings.spendConcepts ?? []
      ),
    [transactionsForPeriod, settings.spendConcepts]
  );

  const recurringTransactions = useMemo(
    () => detectRecurring(transactions, settings.currency),
    [transactions, settings.currency]
  );

  const predictedThisMonth = useMemo(() => {
    const mine = filterByPersonScope(transactions, 'mine', settings.personId);
    return predictMonthlySpends(mine, debts, now, settings.spendConcepts ?? []);
  }, [transactions, debts, now, monthKey, settings.personId, settings.spendConcepts]);

  const availableByAccount = useMemo(
    () => mapLiquidAccounts(accounts, 'principal'),
    [accounts]
  );

  const secondaryByAccount = useMemo(
    () => mapLiquidAccounts(accounts, 'secondary'),
    [accounts]
  );

  const availableCash = useMemo(
    () =>
      [...availableByAccount, ...secondaryByAccount].reduce(
        (s, a) => s + a.balance,
        0
      ),
    [availableByAccount, secondaryByAccount]
  );

  const secondaryCash = useMemo(
    () => secondaryByAccount.reduce((s, a) => s + a.balance, 0),
    [secondaryByAccount]
  );

  const netWorth = useMemo(
    () => computeNetWorth(accounts, debts),
    [accounts, debts]
  );

  const validBudgetSubIds = useMemo(
    () => new Set(flattenSpendSubs(settings.spendConcepts ?? []).map((s) => s.id)),
    [settings.spendConcepts]
  );

  const budgetStatus = useMemo(() => {
    const month = transactionsForPeriod('mes', 'mine').filter(
      (t) => t.type === 'expense' || t.type === 'debt_payment'
    );
    return budgets.filter((b) => validBudgetSubIds.has(b.categoryId)).map((b) => {
      const spent = month
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const remaining = b.limit - spent;
      return {
        categoryId: b.categoryId,
        limit: b.limit,
        spent,
        remaining,
        ratio: b.limit > 0 ? spent / b.limit : 0,
      };
    });
  }, [budgets, transactionsForPeriod, validBudgetSubIds]);

  const addExpense = useCallback(
    async (input: {
      amount: number;
      categoryId: string;
      note?: string;
      createdAt?: string;
    }) =>
      addTransaction({
        type: 'expense',
        amount: input.amount,
        categoryId: input.categoryId,
        note: input.note,
        createdAt: input.createdAt,
        paymentMethod: 'cash',
        accountId: resolveSpendAccountId(accounts, undefined, input.amount),
      }),
    [addTransaction, accounts]
  );

  const value = useMemo(
    () => ({
      loading,
      transactions,
      accounts,
      budgets,
      debts,
      subscriptions,
      addTransaction,
      addDebt,
      updateDebt,
      removeDebt,
      addWallet,
      addBank,
      addInvestment,
      renameInvestment,
      removeInvestment,
      renameWallet,
      renameBank,
      removeWallet,
      removeBank,
      setAccountBalance,
      updateTransaction,
      removeTransaction,
      restoreTransaction,
      canEditTransaction,
      resetFinance,
      restoreFromBackup,
      updateBudget,
      removeBudget,
      transactionsForPeriod,
      transactionsForMonth,
      totalForPeriod,
      insightsForPeriod,
      antForPeriod,
      recurringTransactions,
      predictedThisMonth,
      availableCash,
      availableByAccount,
      secondaryCash,
      secondaryByAccount,
      netWorth,
      budgetStatus,
      expenses: filterByPersonScope(transactions, 'mine', settings.personId).filter(
        (t) => t.type === 'expense'
      ),
      addExpense,
      removeExpense: removeTransaction,
    }),
    [
      loading,
      transactions,
      accounts,
      budgets,
      debts,
      subscriptions,
      addTransaction,
      addDebt,
      updateDebt,
      removeDebt,
      addWallet,
      addBank,
      addInvestment,
      renameInvestment,
      removeInvestment,
      renameWallet,
      renameBank,
      removeWallet,
      removeBank,
      setAccountBalance,
      updateTransaction,
      removeTransaction,
      restoreTransaction,
      canEditTransaction,
      resetFinance,
      restoreFromBackup,
      updateBudget,
      removeBudget,
      transactionsForPeriod,
      transactionsForMonth,
      totalForPeriod,
      insightsForPeriod,
      antForPeriod,
      recurringTransactions,
      predictedThisMonth,
      availableCash,
      availableByAccount,
      secondaryCash,
      secondaryByAccount,
      netWorth,
      budgetStatus,
      addExpense,
      settings.personId,
    ]
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}

/** Back-compat alias while screens migrate */
export function useExpenses(): FinanceContextValue {
  return useFinance();
}

export { FinanceProvider as ExpensesProvider };
