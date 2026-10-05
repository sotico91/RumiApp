import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import {
  antTipBodyKey,
  antTipTitleKey,
  type AntSpendTip,
} from '@/src/utils/antSpendTips';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Props = {
  tip: AntSpendTip;
  conceptLabel: string;
  titleVariant: number;
  bodyVariant: number;
  onDismiss: () => void;
  onOpen: () => void;
};

export function AntSpendTipCard({
  tip,
  conceptLabel,
  titleVariant,
  bodyVariant,
  onDismiss,
  onOpen,
}: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();

  const title = t(antTipTitleKey(titleVariant) as TranslationKey, {
    concept: conceptLabel,
  });
  const body = t(antTipBodyKey(bodyVariant) as TranslationKey, {
    concept: conceptLabel,
    amount: format(tip.current),
    save: format(tip.saveHint),
  });

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t('antTip.kicker')}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            tapFeedback();
            onDismiss();
          }}
          style={styles.secondaryBtn}
          accessibilityRole="button">
          <Text style={styles.secondaryLabel}>{t('antTip.dismiss')}</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            tapFeedback();
            onOpen();
          }}
          style={styles.primaryBtn}
          accessibilityRole="button">
          <Text style={styles.primaryLabel}>{t('antTip.openGlance')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
  },
  kicker: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkMuted,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: palette.ink,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: palette.inkMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: palette.accent,
    alignItems: 'center',
  },
  primaryLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
});
