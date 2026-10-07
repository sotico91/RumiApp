import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SelectPressable } from '@/src/components/SelectPressable';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';

/**
 * In place of the account list when no pocket has money: a spend has to come
 * from somewhere, so offer to log the income first (it opens on top, and
 * saving it brings you back here).
 */
export function NoMoneyHint({ cardsToo = false }: { cardsToo?: boolean }) {
  const { t } = useLanguage();
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Text style={styles.title}>{t('funds.emptyTitle')}</Text>
      <Text style={styles.body}>{t(cardsToo ? 'funds.emptyBodyCards' : 'funds.emptyBody')}</Text>
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
