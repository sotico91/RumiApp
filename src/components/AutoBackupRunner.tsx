import { useEffect } from 'react';
import { AppState } from 'react-native';

import { runAutoBackup } from '@/src/data/autoBackup';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';

/**
 * No UI: once data is loaded, and whenever the app comes back to the front,
 * save today's silent copy if it is not there yet (see autoBackup).
 */
export function AutoBackupRunner() {
  const { settings, ready, quickTemplates } = useSettings();
  const { loading, transactions, accounts, budgets, debts, subscriptions } = useFinance();

  useEffect(() => {
    if (!ready || loading) return;
    const save = () =>
      void runAutoBackup({ transactions, accounts, budgets, debts, subscriptions, settings, quickTemplates });
    save();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') save();
    });
    return () => sub.remove();
  }, [ready, loading, transactions, accounts, budgets, debts, subscriptions, settings, quickTemplates]);

  return null;
}
