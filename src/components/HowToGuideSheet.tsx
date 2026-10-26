import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { sheetStyles } from '@/src/components/ui';
import { colors } from '@/src/theme';
import { palette } from '@/src/theme/colors';
import { tapFeedback } from '@/src/utils/selectFeedback';

type Section = {
  step?: string;
  title: TranslationKey;
  body: TranslationKey;
};

const SECTIONS: Section[] = [
  { title: 'guide.introTitle', body: 'guide.introBody' },
  { step: '1', title: 'guide.step1Title', body: 'guide.step1Body' },
  { step: '2', title: 'guide.step2Title', body: 'guide.step2Body' },
  { step: '3', title: 'guide.step3Title', body: 'guide.step3Body' },
  { step: '4', title: 'guide.step4Title', body: 'guide.step4Body' },
  { step: '5', title: 'guide.step5Title', body: 'guide.step5Body' },
  { step: '6', title: 'guide.step6Title', body: 'guide.step6Body' },
  { step: '7', title: 'guide.step7Title', body: 'guide.step7Body' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function HowToGuideSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  return (
    <AppModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={sheetStyles.scrim}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View
          style={[
            sheetStyles.sheet,
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}>
          <View style={sheetStyles.grabber} />
          <Text style={styles.kicker}>{t('guide.kicker')}</Text>
          <Text style={styles.title}>{t('guide.title')}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {/* A numbered list on the page, not a stack of cards. */}
            {SECTIONS.map((section, i) => (
              <View key={section.title} style={[styles.item, i > 0 && styles.itemDivider]}>
                {section.step ? <Text style={styles.stepNumber}>{section.step}</Text> : null}
                <View style={styles.itemTexts}>
                  <Text style={styles.cardTitle}>{t(section.title)}</Text>
                  <Text style={styles.cardBody}>{t(section.body)}</Text>
                </View>
              </View>
            ))}
            <Text style={styles.hint}>{t('guide.hint')}</Text>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tapFeedback();
              onClose();
            }}
            style={[sheetStyles.primary, styles.done]}>
            <Text style={sheetStyles.primaryText}>{t('guide.close')}</Text>
          </Pressable>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  dismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
  },
  kicker: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  title: {
    marginTop: 2,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: palette.ink,
    letterSpacing: -0.4,
  },
  scroll: {
    marginTop: 8,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.strong,
  },
  stepNumber: {
    width: 22,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 22,
    color: palette.accentDeep,
  },
  itemTexts: { flex: 1 },
  cardTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  cardBody: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkMuted,
  },
  hint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkMuted,
  },
  done: {
    marginTop: 8,
  },
});
