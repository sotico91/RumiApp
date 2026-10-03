import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { addButtonFrame } from '@/src/components/RumiTabBar';
import { useHowToGuide } from '@/src/hooks/useHowToGuide';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';

type Step = {
  id: 'privacy' | 'money' | 'glance' | 'tabs';
  title: TranslationKey;
  body: TranslationKey;
};

// Two marks: where to log, and where everything else is. The eye explains
// itself and Home's ⓘ legend covers "available vs. this month".
const STEPS: Step[] = [
  { id: 'glance', title: 'coach.glanceTitle', body: 'coach.glanceBody' },
  { id: 'tabs', title: 'coach.tabsTitle', body: 'coach.tabsBody' },
];

const STEP_MS = 4200;
const FAB_SIZE = 52;
/** Room between the spotlight ring and the + button. */
const RING = 8;
/** Card side margin; also where the card's arrow is measured from. */
const CARD_SIDE = 18;

export function CoachMarksOverlay() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useLanguage();
  const { settings, ready, coachMarksPending, completeCoachMarks } = useSettings();
  const [step, setStep] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const visible =
    ready &&
    coachMarksPending &&
    settings.onboardingDone &&
    !!settings.userName.trim() &&
    !dismissing;

  async function finish() {
    if (dismissing) return;
    setDismissing(true);
    await completeCoachMarks();
  }

  function goNext() {
    if (step >= STEPS.length - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(goNext, STEP_MS);
    return () => clearTimeout(timer);
    // Restart the timer whenever the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  if (!visible) return null;

  const current = STEPS[step];
  const fabBottom = Math.max(insets.bottom, 12) + 78;
  const tabTop = Math.max(insets.bottom, 12) + 18;
  const add = addButtonFrame(width, insets.bottom);
  const addSpot = add.size + RING * 2;

  return (
    <AppModal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.root} onPress={goNext}>
        <View style={styles.dim} />

        {current.id === 'privacy' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spot,
              {
                width: FAB_SIZE + 16,
                height: FAB_SIZE + 16,
                borderRadius: (FAB_SIZE + 16) / 2,
                left: 8,
                bottom: fabBottom - 8,
              },
            ]}
          />
        ) : null}

        {current.id === 'glance' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spot,
              {
                width: addSpot,
                height: addSpot,
                borderRadius: addSpot / 2,
                left: add.centerX - addSpot / 2,
                bottom: add.bottom - RING,
              },
            ]}
          />
        ) : null}

        {current.id === 'money' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spotBar,
              {
                left: 18,
                right: 18,
                top: insets.top + 168,
                height: 168,
                borderRadius: 22,
              },
            ]}
          />
        ) : null}

        {current.id === 'tabs' ? (
          <View
            pointerEvents="none"
            style={[
              styles.spotBar,
              { left: 10, right: 10, bottom: Math.max(insets.bottom, 8), height: 72 },
            ]}
          />
        ) : null}

        <Animated.View
          key={current.id}
          entering={
            current.id === 'tabs'
              ? FadeInUp.springify()
              : FadeInDown.springify()
          }
          pointerEvents="box-none"
          style={[
            styles.cardWrap,
            current.id === 'privacy' && { left: 16, bottom: fabBottom + FAB_SIZE + 18 },
            current.id === 'money' && { left: 18, right: 18, top: insets.top + 350 },
            current.id === 'glance' && {
              left: CARD_SIDE,
              right: CARD_SIDE,
              bottom: add.bottom + add.size + RING + 18,
            },
            current.id === 'tabs' && { left: 18, right: 18, bottom: tabTop + 86 },
          ]}>
          <View
            style={[
              styles.card,
              current.id === 'privacy' && styles.cardLeft,
              current.id === 'money' && styles.cardCenter,
              current.id === 'glance' && styles.cardCenter,
            ]}>
            <Text style={styles.kicker}>
              {t('coach.step', { current: step + 1, total: STEPS.length })}
            </Text>
            <Text style={styles.title}>{t(current.title)}</Text>
            <Text style={styles.body}>{t(current.body)}</Text>
            <View
              style={[
                styles.arrow,
                current.id === 'privacy' && styles.arrowLeft,
                current.id === 'money' && styles.arrowTop,
                current.id === 'glance' && { left: add.centerX - CARD_SIDE - 6 },
                current.id === 'tabs' && styles.arrowCenter,
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(220)}
          style={[styles.footer, { top: insets.top + 10 }]}
          pointerEvents="box-none">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              void finish();
            }}
            hitSlop={10}
            style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('coach.skip')}</Text>
          </Pressable>
          <Text style={styles.hint}>{t('coach.tapHint')}</Text>
        </Animated.View>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8,20,28,0.62)',
  },
  spot: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  spotBar: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 22,
  },
  cardWrap: {
    position: 'absolute',
    maxWidth: 280,
  },
  card: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardLeft: { alignSelf: 'flex-start' },
  cardCenter: { alignSelf: 'center', maxWidth: 340 },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: palette.ink,
    letterSpacing: -0.3,
  },
  body: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 19,
    color: palette.inkMuted,
  },
  arrow: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: palette.surfaceSolid,
    transform: [{ rotate: '45deg' }],
    bottom: -6,
  },
  arrowLeft: { left: 22 },
  arrowCenter: { alignSelf: 'center', left: '50%', marginLeft: -6 },
  arrowTop: { top: -6, bottom: undefined, alignSelf: 'center', left: '50%', marginLeft: -6 },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  skipText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.white,
  },
  hint: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
});
