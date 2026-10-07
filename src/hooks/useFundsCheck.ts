import { router } from 'expo-router';
import { useCallback } from 'react';

import { appAlert } from '@/src/components/AppAlert';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TransactionType } from '@/src/types/finance';
import { fundsShortfall, spendableTotal } from '@/src/utils/accounts';

/**
 * Before a spend or debt payment from your own money: is there money it can
 * come from? If not, say so kindly and offer to log the income first. The add
 * screen for it opens on top, so after saving the income you are back here.
 * Returns true when the movement can be saved.
 */
export function useFundsCheck() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { accounts } = useFinance();

  return useCallback(
    (input: { type: TransactionType; amount: number; accountId?: string }): boolean => {
      if (fundsShortfall(accounts, input) <= 0) return true;
      const available = spendableTotal(accounts);
      appAlert(
        t('funds.title'),
        available > 0
          ? t('funds.bodyShort', { available: format(available), amount: format(input.amount) })
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
    [accounts, format, t]
  );
}
