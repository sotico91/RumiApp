import { router } from 'expo-router';
import { useCallback } from 'react';

import { appAlert } from '@/src/components/AppAlert';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { Transaction, TransactionType } from '@/src/types/finance';
import { applyAccountDelta } from '@/src/utils/ledger';
import { accountDisplayName, fundsShortfall, spendableTotal } from '@/src/utils/accounts';

/**
 * Before a spend or debt payment from your own money: is there money it can
 * come from? If not, say so kindly and offer to log the income first. The add
 * screen for it opens on top, so after saving the income you are back here.
 * Returns true when the movement can be saved.
 */
export function useFundsCheck() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { accounts: liveAccounts } = useFinance();

  return useCallback(
    (input: {
      type: TransactionType;
      amount: number;
      accountId?: string;
      /** Editing: this movement's own effect is undone first (its money is back in the pocket). */
      replacing?: Transaction;
    }): boolean => {
      const accounts = input.replacing ? applyAccountDelta(liveAccounts, input.replacing, -1) : liveAccounts;
      if (fundsShortfall(accounts, input) <= 0) return true;
      const account = accounts.find((a) => a.id === input.accountId);
      const available = account ? Math.max(0, account.balance) : 0;
      appAlert(
        t('funds.title'),
        account && available > 0
          ? t('funds.bodyShort', {
              account: accountDisplayName(account, t),
              available: format(available),
              amount: format(input.amount),
            })
          : spendableTotal(accounts) > 0
            ? t('funds.bodyOther')
            : t('funds.bodyEmpty'),
        [
          { text: t('funds.later'), style: 'cancel' },
          {
            text: t('funds.addIncome'),
            onPress: () => router.push({ pathname: '/agregar', params: { intent: 'earn' } }),
          },
        ]
      );
      return false;
    },
    [liveAccounts, format, t]
  );
}
