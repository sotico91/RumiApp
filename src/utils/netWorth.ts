import type { Account } from '@/src/types/finance';

/** Where income can land — never credit (that would hide money from net worth assets). */
export function isIncomeDestinationAccount(account: Account): boolean {
  return account.type !== 'credit';
}

/** Accounts you can spend from (includes credit). */
export function spendSourceAccounts(accounts: Account[]): Account[] {
  return accounts;
}

export function incomeDestinationAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isIncomeDestinationAccount);
}

/**
 * Net worth from money pockets + debts.
 * Credit-line accounts are ignored (cupo is not cash; used balance lives on the debt).
 * - Assets: positive pocket balances
 * - Liabilities: overdraft on cash/bank/savings/wallet, plus debts list
 */
export function computeNetWorth(
  accounts: Account[],
  debts: { balance: number }[]
): { assets: number; liabilities: number; net: number } {
  let assets = 0;
  let liabilities = 0;

  for (const a of accounts) {
    if (a.type === 'credit') continue;
    if (a.balance >= 0) {
      assets += a.balance;
    } else {
      liabilities += Math.abs(a.balance);
    }
  }

  for (const d of debts) {
    liabilities += Math.max(d.balance, 0);
  }

  return { assets, liabilities, net: assets - liabilities };
}
