import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { KeyboardSafeOverlay } from '@/src/components/KeyboardSafe';
import { guessConceptIcon } from '@/src/data/conceptIcons';
import { createSpendSub, ONBOARDING_CONCEPTS } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import type { Currency } from '@/src/types/settings';
import { parseAmountInput } from '@/src/utils/money';

/** Name, currency, today's money. Concepts, notifications and reminders
 * have sensible defaults and live in Plan / the ⋯ menu afterwards. */
const TOTAL_STEPS = 3;

export function OnboardingOverlay() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { settings, ready, completeOnboarding } = useSettings();
  const { setAccountBalance } = useFinance();
  const [step, setStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [bank, setBank] = useState('');
  const [cash, setCash] = useState('');
  const [saving, setSaving] = useState(false);

  const visible = ready && !settings.onboardingDone;

  const stepLabel = useMemo(
    () => t('onboard.step', { current: step + 1, total: TOTAL_STEPS }),
    [step, t]
  );

  async function finish() {
    const trimmed = userName.trim();
    if (!trimmed) {
      Alert.alert(t('onboard.nameTitle'), t('onboard.nameNeed'));
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const spendConcepts = ONBOARDING_CONCEPTS.map((c) => ({
        id: c.id,
        name: t(c.nameKey),
        color: c.color,
        icon: guessConceptIcon({ id: c.id, name: t(c.nameKey) }),
        subs: [createSpendSub(c.id, t('onboard.concept.general'))],
      }));
      await completeOnboarding({
        userName: trimmed,
        currency,
        spendConcepts,
        // Asked later, in context (⋯ menu), instead of a permission prompt on day one.
        notifyOnExpense: false,
        reminderCategoryIds: [],
      });
      const bankAmount = parseAmountInput(bank, currency);
      const cashAmount = parseAmountInput(cash, currency);
      if (bankAmount) await setAccountBalance('bank-main', bankAmount);
      if (cashAmount) await setAccountBalance('cash', cashAmount);
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (step === 0 && !userName.trim()) {
      Alert.alert(t('onboard.nameTitle'), t('onboard.nameNeed'));
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
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder={t('onboard.namePlaceholder')}
                placeholderTextColor={palette.inkSoft}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                style={styles.nameInput}
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
            </Animated.View>
          ) : null}

          {step === 1 ? (
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

          {step === 2 ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.body}>
              <Text style={styles.title}>{t('onboard.balanceTitle')}</Text>
              <Text style={styles.copy}>{t('onboard.balanceBody')}</Text>
              <Text style={styles.fieldLabel}>{t('account.bankMain')}</Text>
              <TextInput
                value={bank}
                onChangeText={setBank}
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
              <Text style={styles.fieldLabel}>{t('account.cash')}</Text>
              <TextInput
                value={cash}
                onChangeText={setCash}
                placeholder="0"
                placeholderTextColor={palette.inkSoft}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
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
  fieldLabel: {
    marginTop: 6,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
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
