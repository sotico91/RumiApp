import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
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
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}>
          <View style={styles.handle} />
          <Text style={styles.kicker}>{t('guide.kicker')}</Text>
          <Text style={styles.title}>{t('guide.title')}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={styles.card}>
                <View style={styles.cardHead}>
                  {section.step ? (
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{section.step}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.cardTitle}>{t(section.title)}</Text>
                </View>
                <Text style={styles.cardBody}>{t(section.body)}</Text>
              </View>
            ))}
            <Text style={styles.hint}>{t('guide.hint')}</Text>
          </ScrollView>
          <Pressable
            onPress={() => {
              tapFeedback();
              onClose();
            }}
            style={styles.done}>
            <Text style={styles.doneText}>{t('guide.close')}</Text>
          </Pressable>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.55)',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.border,
    marginBottom: 12,
  },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 4,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.ink,
    letterSpacing: -0.6,
  },
  scroll: {
    marginTop: 14,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: '#F3F7F9',
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.white,
  },
  cardTitle: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  cardBody: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: palette.inkMuted,
  },
  hint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSoft,
  },
  done: {
    marginTop: 8,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.white,
  },
});
