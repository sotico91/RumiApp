import { useEffect, useMemo, useRef } from 'react';

import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { categoryLabel } from '@/src/utils/categoryLabel';
import {
  antTipBodyKey,
  antTipTitleKey,
  antTipWeekKey,
  pickAntSpendTip,
  pickAntTipVariants,
} from '@/src/utils/antSpendTips';
import { useMoney } from '@/src/hooks/useMoney';
import {
  clearAntSpendTipNotification,
  syncAntSpendTipNotification,
} from '@/src/utils/notifications';

/**
 * Keeps one weekly local ant-spend tip in sync (random friendly copy).
 * Skips when dismissed for this week or when there is nothing soft to suggest.
 */
export function AntSpendTipHygiene() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings, ready, rememberAntTipVariants } = useSettings();
  const { transactions, loading } = useFinance();
  const ranKey = useRef('');

  const tip = useMemo(() => {
    if (!ready || loading || !settings.onboardingDone) return null;
    const week = antTipWeekKey();
    if (settings.antTipDismissedWeekKey === week) return null;
    return pickAntSpendTip(transactions, settings.spendConcepts ?? []);
  }, [
    ready,
    loading,
    settings.onboardingDone,
    settings.antTipDismissedWeekKey,
    settings.spendConcepts,
    transactions,
  ]);

  useEffect(() => {
    if (!ready || !settings.onboardingDone || loading) return;

    const week = antTipWeekKey();
    const tipKey = tip
      ? `${tip.categoryId}:${tip.current}:${tip.saveHint}`
      : 'none';
    const key = `${week}|${tipKey}|${settings.notifyOnExpense ? 1 : 0}`;
    if (ranKey.current === key) return;
    ranKey.current = key;

    void (async () => {
      if (!tip) {
        await clearAntSpendTipNotification();
        return;
      }

      const { titleVariant, bodyVariant } = pickAntTipVariants(
        settings.antTipLastTitleVariant,
        settings.antTipLastBodyVariant
      );
      await rememberAntTipVariants(titleVariant, bodyVariant);

      if (!settings.notifyOnExpense) {
        await clearAntSpendTipNotification();
        return;
      }

      const concept = categoryLabel(tip.categoryId, t, settings.spendConcepts ?? []);
      const title = t(antTipTitleKey(titleVariant) as TranslationKey, { concept });
      const body = t(antTipBodyKey(bodyVariant) as TranslationKey, {
        concept,
        amount: format(tip.current),
        save: format(tip.saveHint),
      });

      await syncAntSpendTipNotification({
        title,
        body,
        categoryId: tip.categoryId,
      });
    })();
  }, [
    ready,
    loading,
    settings.onboardingDone,
    settings.notifyOnExpense,
    settings.antTipLastTitleVariant,
    settings.antTipLastBodyVariant,
    settings.spendConcepts,
    tip,
    t,
    format,
    rememberAntTipVariants,
  ]);

  return null;
}
