import { BACKUP_FORMAT, LEGACY_BACKUP_FORMAT, parseBackupJson } from '@/src/utils/backupParse';

function validBackup(overrides: Record<string, unknown> = {}) {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: '2026-09-01T10:00:00.000Z',
    transactions: [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 15000,
        categoryId: 'food',
        paymentMethod: 'cash',
        accountId: 'cash',
        createdAt: '2026-09-01T09:00:00.000Z',
      },
    ],
    accounts: [{ id: 'cash', nameKey: 'account.cash', type: 'cash', balance: 85000 }],
    budgets: [{ id: 'b-1', categoryId: 'food', limit: 300000 }],
    debts: [
      {
        id: 'debt-card',
        balance: 120000,
        installment: 40000,
        interestRate: 0,
        termMonths: 0,
        nextPaymentDate: '2026-10-01T00:00:00.000Z',
        paidCapital: 0,
        paidInterest: 0,
        otherCharges: 0,
      },
    ],
    subscriptions: [
      { id: 'sub-1', amount: 30000, categoryId: 'fun', frequency: 'monthly', active: true },
    ],
    settings: { userName: 'Ana' },
    quickTemplates: [],
    ...overrides,
  };
}

const parse = (data: unknown) => parseBackupJson(JSON.stringify(data));

describe('parseBackupJson', () => {
  it('accepts a well-formed backup', () => {
    const backup = parse(validBackup());
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.transactions).toHaveLength(1);
    expect(backup.accounts[0].balance).toBe(85000);
  });

  it('accepts the legacy format and normalizes it', () => {
    const backup = parse(validBackup({ format: LEGACY_BACKUP_FORMAT }));
    expect(backup.format).toBe(BACKUP_FORMAT);
  });

  it('accepts older debts missing optional counters', () => {
    const backup = parse(validBackup({ debts: [{ id: 'old', balance: 5000 }] }));
    expect(backup.debts[0].id).toBe('old');
  });

  it('rejects text that is not JSON', () => {
    expect(() => parseBackupJson('not json')).toThrow('INVALID_JSON');
  });

  it('rejects an unknown format', () => {
    expect(() => parse(validBackup({ format: 'other-app' }))).toThrow('INVALID_FORMAT');
  });

  it('rejects backups from a newer app version', () => {
    expect(() => parse(validBackup({ version: 99 }))).toThrow('UNSUPPORTED_VERSION');
  });

  it.each([
    ['missing createdAt', { id: 'x', type: 'expense', amount: 1 }],
    ['amount as text', { id: 'x', type: 'expense', amount: 'abc', createdAt: '2026-09-01' }],
    ['negative amount', { id: 'x', type: 'expense', amount: -5, createdAt: '2026-09-01' }],
    ['unknown type', { id: 'x', type: 'gift', amount: 5, createdAt: '2026-09-01' }],
    ['bad date', { id: 'x', type: 'income', amount: 5, createdAt: 'yesterday' }],
    ['not an object', null],
  ])('rejects a transaction with %s', (_label, tx) => {
    expect(() => parse(validBackup({ transactions: [tx] }))).toThrow('INVALID_TRANSACTIONS');
  });

  it('rejects an account whose balance is not a number', () => {
    const accounts = [{ id: 'cash', nameKey: 'account.cash', type: 'cash', balance: '10' }];
    expect(() => parse(validBackup({ accounts }))).toThrow('INVALID_ACCOUNTS');
  });

  it('rejects a debt without a numeric balance', () => {
    expect(() => parse(validBackup({ debts: [{ id: 'd' }] }))).toThrow('INVALID_DEBTS');
  });

  it('rejects missing settings', () => {
    expect(() => parse(validBackup({ settings: null }))).toThrow('INVALID_SETTINGS');
  });

  it('drops malformed quick templates instead of failing', () => {
    const backup = parse(
      validBackup({ quickTemplates: [{ id: 'q1', categoryId: 'food', amount: 1 }, 'junk'] })
    );
    expect(backup.quickTemplates).toHaveLength(1);
  });
});
