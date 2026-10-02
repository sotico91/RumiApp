import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { KeyboardSafeOverlay } from '@/src/components/KeyboardSafe';
import { createSpendSub, ONBOARDING_CONCEPTS } from '@/src/data/spendConcepts';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Currency } from '@/src/types/settings';
import { reminderPushCopy } from '@/src/utils/reminderCopy';

const TOTAL_STEPS = 6;

export function OnboardingOverlay() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { settings, ready, completeOnboarding } = useSettings();
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [selected, setSelected] = useState<string[]>(() =>
    ONBOARDING_CONCEPTS.map((c) => c.id)
  );
  const [notifyOnExpense, setNotifyOnExpense] = useState(true);
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const visible = ready && !settings.onboardingDone;

  const stepLabel = useMemo(
    () => t('onboard.step', { current: step + 1, total: TOTAL_STEPS }),
    [step, t]
  );

  function toggleCategory(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleReminder(id: string) {
    setReminderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function finish() {
    const trimmed = userName.trim();
    if (!trimmed) {
      Alert.alert(t('onboard.nameTitle'), t('onboard.nameNeed'));
      setStep(1);
      return;
    }
    if (selected.length === 0) {
      Alert.alert(t('onboard.categoriesTitle'), t('onboard.categoriesNeedOne'));
      return;
    }
    setSaving(true);
    try {
      const spendConcepts = ONBOARDING_CONCEPTS.filter((c) => selected.includes(c.id)).map(
        (c) => ({
          id: c.id,
          name: t(c.nameKey),
          color: c.color,
          subs: [createSpendSub(c.id, t('onboard.concept.general'))],
        })
      );
      const reminderCategoryIds = reminderIds
        .map((conceptId) => spendConcepts.find((c) => c.id === conceptId)?.subs[0]?.id)
        .filter((id): id is string => !!id);
      const reminderLabels = Object.fromEntries(
        reminderCategoryIds.map((categoryId) => [
          categoryId,
          reminderPushCopy(categoryId, spendConcepts, t, language),
        ])
      );
      await completeOnboarding({
        userName: trimmed,
        currency,
        spendConcepts,
        notifyOnExpense,
        reminderCategoryIds,
        reminderHour: 20,
        reminderLabels,
      });
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (step === 1 && !userName.trim()) {
      Alert.alert(t('onboard.nameTitle'), t('onboard.nameNeed'));
      return;
    }
    if (step === 3 && selected.length === 0) {
      Alert.alert(t('onboard.categoriesTitle'), t('onboard.categoriesNeedOne'));
      return;
    }
    if (step >= TOTAL_STEPS - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <AppModal visible={visible} animationType="fade" transparent>
      <KeyboardSafeOverlay>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}>
        <Animated.View entering={FadeIn.duration(280)} style={styles.sheet}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((step + 1) / TOTAL_STEPS) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.dots}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>
          <Text style={styles.step}>{stepLabel}</Text>

          {step === 0 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.kicker}>{t('brand.name')}</Text>
              <Text style={styles.title}>{t('onboard.welcomeTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.welcomeBody')}</Text>
              <Text style={styles.copy}>{t('onboard.welcomeShare')}</Text>
            </Animated.View>
          ) : null}

          {step === 1 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.title}>{t('onboard.nameTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.nameBody')}</Text>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder={t('onboard.namePlaceholder')}
                placeholderTextColor={palette.inkSoft}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
                maxLength={40}
                style={styles.nameInput}
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
            </Animated.View>
          ) : null}

          {step === 2 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.title}>{t('onboard.currencyTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.currencyBody')}</Text>
              <OptionCard
                selected={currency === 'COP'}
                title={t('onboard.currencyCop')}
                onPress={() => setCurrency('COP')}
              />
              <OptionCard
                selected={currency === 'USD'}
                title={t('onboard.currencyUsd')}
                onPress={() => setCurrency('USD')}
              />
            </Animated.View>
          ) : null}

          {step === 3 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.title}>{t('onboard.categoriesTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.categoriesBody')}</Text>
              <ScrollView style={styles.catScroll} contentContainerStyle={styles.catWrap}>
                {ONBOARDING_CONCEPTS.map((concept) => {
                  const active = selected.includes(concept.id);
                  return (
                    <Pressable
                      key={concept.id}
                      onPress={() => toggleCategory(concept.id)}
                      style={[
                        styles.catChip,
                        active && {
                          backgroundColor: concept.color,
                          borderColor: concept.color,
                        },
                      ]}>
                      <Text style={[styles.catText, active && styles.catTextActive]}>
                        {t(concept.nameKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}

          {step === 4 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.title}>{t('onboard.notifyTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.notifyBody')}</Text>
              <OptionCard
                selected={notifyOnExpense}
                title={t('onboard.notifyYes')}
                onPress={() => setNotifyOnExpense(true)}
              />
              <OptionCard
                selected={!notifyOnExpense}
                title={t('onboard.notifyNo')}
                onPress={() => setNotifyOnExpense(false)}
              />
            </Animated.View>
          ) : null}

          {step === 5 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.title}>{t('onboard.reminderTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.reminderBody')}</Text>
              <ScrollView style={styles.catScroll} contentContainerStyle={styles.catWrap}>
                {ONBOARDING_CONCEPTS.filter((c) => selected.includes(c.id)).map((concept) => {
                    const active = reminderIds.includes(concept.id);
                    return (
                      <Pressable
                        key={concept.id}
                        onPress={() => toggleReminder(concept.id)}
                        style={[
                          styles.catChip,
                          active && {
                            backgroundColor: concept.color,
                            borderColor: concept.color,
                          },
                        ]}>
                        <Text style={[styles.catText, active && styles.catTextActive]}>
                          {t(concept.nameKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>
              <Text style={styles.copy}>{t('onboard.reminderHint')}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.actions}>
            {step > 0 ? (
              <Pressable onPress={() => setStep((s) => s - 1)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>{t('onboard.back')}</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable
              onPress={goNext}
              disabled={saving}
              style={[styles.primaryBtn, saving && { opacity: 0.7 }]}>
              <Text style={styles.primaryText}>
                {step === 0
                  ? t('onboard.start')
                  : step === TOTAL_STEPS - 1
                    ? t('onboard.finish')
                    : t('onboard.next')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
      </KeyboardSafeOverlay>
    </AppModal>
  );
}

function OptionCard({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}>
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 22,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF2',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.accent,
    borderRadius: 999,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D5DEE5',
  },
  dotActive: {
    width: 22,
    backgroundColor: palette.accent,
  },
  dotDone: {
    backgroundColor: palette.accentSoft,
  },
  step: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  body: {
    gap: 12,
    marginBottom: 18,
  },
  kicker: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.accent,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.ink,
    letterSpacing: -0.6,
  },
  copy: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.inkMuted,
    lineHeight: 22,
  },
  nameInput: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: palette.accent,
    backgroundColor: '#FFF8F4',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: 14,
    backgroundColor: '#F7FAFC',
  },
  optionSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentSoft,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: palette.inkSoft,
  },
  radioSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accent,
  },
  optionText: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.ink,
  },
  optionTextSelected: {
    fontFamily: 'DMSans_600SemiBold',
  },
  catScroll: {
    maxHeight: 220,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  catChip: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  catTextActive: {
    color: palette.white,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: '#EEF3F6',
  },
  secondaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.inkMuted,
  },
  primaryBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: palette.accent,
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.white,
  },
});
