import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { PaymentMethod } from '@/src/types/finance';
import { tapFeedback } from '@/src/utils/selectFeedback';

export type SpendSource = 'pocket' | 'card';

export function spendSourceFromMethod(method: PaymentMethod): SpendSource {
  return method === 'credit' ? 'card' : 'pocket';
}

type Props = {
  value: SpendSource;
  onChange: (source: SpendSource) => void;
  /** Show the empty-card hint under the picker. */
  showNoCards?: boolean;
};

/** Pocket money vs credit-line charge — not mixed with Nequi. */
export function SpendSourcePicker({ value, onChange, showNoCards }: Props) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'pocket' }}
          onPress={() => {
            tapFeedback();
            onChange('pocket');
          }}
          style={[styles.opt, value === 'pocket' && styles.optOn]}>
          <Text style={[styles.title, value === 'pocket' && styles.onText]}>
            {t('flow.paidWithMoney')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'card' }}
          onPress={() => {
            tapFeedback();
            onChange('card');
          }}
          style={[styles.opt, value === 'card' && styles.optOn]}>
          <Text style={[styles.title, value === 'card' && styles.onText]}>
            {t('flow.paidWithCard')}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {value === 'card' ? t('flow.paidWithCardHint') : t('flow.paidWithMoneyHint')}
      </Text>
      {value === 'card' && showNoCards ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{t('flow.noCardsBody')}</Text>
          <Pressable
            onPress={() => {
              tapFeedback();
              router.replace('/(tabs)/wealth');
            }}
            style={styles.linkBtn}>
            <Text style={styles.linkText}>{t('flow.goToWealth')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  opt: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: palette.ink,
    textAlign: 'center',
  },
  onText: { color: palette.white },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  empty: { gap: 8, paddingTop: 2 },
  emptyBody: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: palette.accent,
  },
  linkText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.white,
  },
});
