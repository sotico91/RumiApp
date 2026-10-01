import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';
import type { InstallmentPayChoices, InstallmentPayScope } from '@/src/utils/debts';

type Props = {
  choices: InstallmentPayChoices;
  scope: InstallmentPayScope | null;
  onChange: (scope: InstallmentPayScope) => void;
};

export function InstallmentPayScopePicker({ choices, scope, onChange }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();

  const options: { id: InstallmentPayScope; label: string; sub: string }[] = [
    ...(choices.hasDistinctMonthPay
      ? [
          {
            id: 'cuota' as const,
            label: choices.revolving ? t('flow.payScopeMonth') : t('flow.payScopeCuota'),
            sub: format(choices.cuota),
          },
        ]
      : []),
    {
      id: 'full',
      label: choices.revolving ? t('flow.payScopeFullRevolving') : t('flow.payScopeFull'),
      sub: format(choices.remaining),
    },
    {
      id: 'other',
      label: t('flow.payScopeOther'),
      sub: t('flow.payScopeOtherSub'),
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('flow.payScopeTitle')}</Text>
      <View style={styles.grid}>
        {options.map((opt) => {
          const on = scope === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => {
                tapFeedback();
                onChange(opt.id);
              }}
              style={[styles.card, on && styles.cardOn]}>
              <Text style={[styles.label, on && styles.labelOn]}>{opt.label}</Text>
              <Text style={[styles.sub, on && styles.labelOn]}>{opt.sub}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14, gap: 8 },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: {
    flexGrow: 1,
    minWidth: '46%',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  label: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  labelOn: { color: palette.white },
  sub: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
  },
});
