import type {
  Account,
  AccountType,
  Budget,
  Debt,
  PaymentMethod,
  Subscription,
  Transaction,
  TransactionType,
} from '@/src/types/finance';
import type { QuickTemplate, UserSettings } from '@/src/types/settings';

export const BACKUP_FORMAT = 'rumi-backup';
export const LEGACY_BACKUP_FORMAT = 'billingapp-backup';
export const BACKUP_VERSION = 1;

export type BillingBackup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
  debts: Debt[];
  subscriptions: Subscription[];
  settings: UserSettings;
  quickTemplates: QuickTemplate[];
};

const TX_TYPES: readonly TransactionType[] = [
  'expense',
  'income',
  'transfer',
  'debt_payment',
  'investment',
  'withdrawal',
];
const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'debit', 'credit', 'transfer'];
const ACCOUNT_TYPES: readonly AccountType[] = [
  'bank',
  'cash',
  'credit',
  'savings',
  'wallet',
  'investment',
  'other',
];

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || isFiniteNumber(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function isValidTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    TX_TYPES.includes(value.type as TransactionType) &&
    isFiniteNumber(value.amount) &&
    value.amount >= 0 &&
    isIsoDate(value.createdAt) &&
    (value.paymentMethod === undefined ||
      PAYMENT_METHODS.includes(value.paymentMethod as PaymentMethod)) &&
    isOptionalString(value.categoryId) &&
    isOptionalString(value.accountId) &&
    isOptionalString(value.toAccountId) &&
    isOptionalString(value.debtId) &&
    isOptionalString(value.creditDebtId) &&
    isOptionalString(value.note)
  );
}

export function isValidAccount(value: unknown): value is Account {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isOptionalString(value.nameKey) &&
    isOptionalString(value.name) &&
    ACCOUNT_TYPES.includes(value.type as AccountType) &&
    isFiniteNumber(value.balance)
  );
}

export function isValidBudget(value: unknown): value is Budget {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.categoryId) &&
    isFiniteNumber(value.limit) &&
    value.limit >= 0
  );
}

export function isValidDebt(value: unknown): value is Debt {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isFiniteNumber(value.balance) &&
    isOptionalNumber(value.installment) &&
    isOptionalNumber(value.interestRate) &&
    isOptionalNumber(value.termMonths) &&
    isOptionalString(value.nextPaymentDate) &&
    isOptionalNumber(value.paidCapital) &&
    isOptionalNumber(value.paidInterest) &&
    isOptionalNumber(value.otherCharges) &&
    isOptionalString(value.name) &&
    isOptionalString(value.nameKey) &&
    isOptionalNumber(value.creditLimit)
  );
}

export function isValidSubscription(value: unknown): value is Subscription {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isFiniteNumber(value.amount) &&
    value.amount >= 0 &&
    isNonEmptyString(value.categoryId) &&
    (value.frequency === 'monthly' || value.frequency === 'yearly') &&
    typeof value.active === 'boolean'
  );
}

function isValidQuickTemplate(value: unknown): value is QuickTemplate {
  return isRecord(value) && isNonEmptyString(value.id);
}

function requireList<T>(
  value: unknown,
  isValid: (item: unknown) => item is T,
  code: string
): T[] {
  if (!Array.isArray(value) || !value.every(isValid)) throw new Error(code);
  return value;
}

/**
 * Validate every record, not just the containers: a single malformed
 * transaction (no createdAt, amount as text) would otherwise be stored
 * and crash the app on every launch.
 */
export function parseBackupJson(raw: string): BillingBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }
  if (!isRecord(parsed)) throw new Error('INVALID_BACKUP');
  const data = parsed;
  if (data.format !== BACKUP_FORMAT && data.format !== LEGACY_BACKUP_FORMAT) {
    throw new Error('INVALID_FORMAT');
  }
  if (!isFiniteNumber(data.version)) throw new Error('INVALID_VERSION');
  if (data.version > BACKUP_VERSION) throw new Error('UNSUPPORTED_VERSION');
  if (!isRecord(data.settings)) throw new Error('INVALID_SETTINGS');

  return {
    format: BACKUP_FORMAT,
    version: data.version,
    exportedAt: isIsoDate(data.exportedAt) ? data.exportedAt : new Date().toISOString(),
    transactions: requireList(data.transactions, isValidTransaction, 'INVALID_TRANSACTIONS'),
    accounts: requireList(data.accounts, isValidAccount, 'INVALID_ACCOUNTS'),
    budgets: requireList(data.budgets, isValidBudget, 'INVALID_BUDGETS'),
    debts: requireList(data.debts, isValidDebt, 'INVALID_DEBTS'),
    subscriptions: requireList(data.subscriptions, isValidSubscription, 'INVALID_SUBSCRIPTIONS'),
    settings: data.settings as UserSettings,
    quickTemplates: Array.isArray(data.quickTemplates)
      ? data.quickTemplates.filter(isValidQuickTemplate)
      : [],
  };
}
