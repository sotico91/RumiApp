import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SelectPressable } from '@/src/components/SelectPressable';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { accountDisplayName, isSpendableLiquid } from '@/src/utils/accounts';

/**
 * In place of the account list when no pocket has money: a spend has to come
 * from somewhere, so offer to log the income first (it opens on top, and
 * saving it brings you back here). With the amount typed (`need`) and money
 * somewhere, it says no single pocket covers it and which one has the most.
 */
export function NoMoneyHint({
  cardsToo = false,
  move = false,
  need,
}: {
  cardsToo?: boolean;
  move?: boolean;
  need?: number;
}) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { accounts } = useFinance();
  const richest =
    need && need > 0
      ? accounts
          .filter((a) => isSpendableLiquid(a.type) && a.balance > 0.005)
          .sort((a, b) => b.balance - a.balance)[0]
      : undefined;
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={styles.title}>
        {richest ? t('funds.shortAllTitle', { amount: format(need ?? 0) }) : t('funds.emptyTitle')}
      </Text>
      <Text style={styles.body}>
        {richest
          ? t(cardsToo ? 'funds.shortAllBodyCards' : 'funds.shortAllBody', {
              account: accountDisplayName(richest, t),
              available: format(richest.balance),
            })
          : t(move ? 'funds.emptyBodyMove' : cardsToo ? 'funds.emptyBodyCards' : 'funds.emptyBody')}
      </Text>
      <SelectPressable
        onPress={() => router.push({ pathname: '/agregar', params: { intent: 'earn' } })}
        style={styles.btn}>
        <Text style={styles.btnText}>{t('funds.addIncome')}</Text>
      </SelectPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceSolid,
    gap: 6,
  },
  title: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkMuted,
  },
  btn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  btnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
});
