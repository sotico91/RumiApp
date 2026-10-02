import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseForm, type SavedMovement } from '@/src/components/ExpenseForm';
import { RaisedText } from '@/src/components/RaisedText';
import { FriendlyAddFlow } from '@/src/components/FriendlyAddFlow';
import { QuickSpendForm } from '@/src/components/QuickSpendForm';
import type { FriendlyIntent } from '@/src/data/friendlyTemplates';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';

export default function AgregarScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const params = useLocalSearchParams<{
    categoryId?: string;
    amount?: string;
    note?: string;
    mode?: string;
    intent?: string;
    debtId?: string;
  }>();
  const opensSpecificFlow =
    params.mode === 'advanced' || !!params.categoryId || !!params.intent || !!params.debtId;
  // Plain "Add" opens the one-screen expense; deep links keep the guided flow.
  const [mode, setMode] = useState<'quick' | 'friendly' | 'advanced'>(
    opensSpecificFlow ? 'friendly' : 'quick'
  );
  const [guidedIntent, setGuidedIntent] = useState<FriendlyIntent | undefined>(undefined);
  const prefilledCategoryId =
    typeof params.categoryId === 'string' ? params.categoryId : undefined;
  const prefilledAmount =
    typeof params.amount === 'string' && params.amount.trim()
      ? params.amount.trim()
      : undefined;
  const prefilledNote =
    typeof params.note === 'string' ? params.note : undefined;

  const payDebtId =
    typeof params.debtId === 'string' && params.debtId.trim()
      ? params.debtId.trim()
      : undefined;
  const payIntent =
    params.intent === 'debt'
      ? ('debt' as const)
      : params.intent === 'spend'
        ? ('spend' as const)
        : undefined;

  useEffect(() => {
    if (params.mode === 'advanced' || prefilledCategoryId) {
      setMode('advanced');
    }
  }, [params.mode, prefilledCategoryId]);

  function handleSaved(result: SavedMovement) {
    const messageKey =
      result.kind === 'income'
        ? 'add.savedIncome'
        : result.kind === 'expense'
          ? 'add.savedExpense'
          : 'add.savedOther';
    const title = t('add.savedTitle');
    const message = t(messageKey, { amount: format(result.amount) });

    // Android often fails to show Alert while a RN Modal is still open.
    // Leave the modal first, then confirm (or just go back on failure to alert).
    if (Platform.OS === 'android') {
      router.back();
      setTimeout(() => {
        Alert.alert(title, message);
      }, 350);
      return;
    }

    Alert.alert(title, message, [
      {
        text: t('add.ok'),
        onPress: () => router.back(),
      },
    ]);
  }

  return (
    <ScreenBackground edges="none">
      <View style={styles.content}>
        <RaisedText style={styles.title}>{t('add.title')}</RaisedText>

        {mode === 'quick' ? (
          <QuickSpendForm
            onSaved={handleSaved}
            onOpenGuided={(intent) => {
              setGuidedIntent(intent);
              setMode('friendly');
            }}
          />
        ) : (
          <>
          <View style={styles.modeSwitch}>
            <Pressable
              onPress={() => setMode('friendly')}
              style={[styles.modeBtn, mode === 'friendly' && styles.modeOn]}>
              <Text style={[styles.modeText, mode === 'friendly' && styles.modeTextOn]}>
                {t('flow.friendly')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('advanced')}
              style={[styles.modeBtn, mode === 'advanced' && styles.modeOn]}>
              <Text style={[styles.modeText, mode === 'advanced' && styles.modeTextOn]}>
                {t('flow.advanced')}
              </Text>
            </Pressable>
          </View>

          {mode === 'friendly' ? (
            <FriendlyAddFlow
              onSaved={handleSaved}
              onSwitchAdvanced={() => setMode('advanced')}
              initialIntent={guidedIntent ?? payIntent}
              initialDebtId={payDebtId}
            />
          ) : (
            <KeyboardSafeScroll
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.advancedPad}>
              <ExpenseForm
                onSaved={handleSaved}
                initialCategoryId={prefilledCategoryId}
                initialAmount={prefilledAmount}
                initialNote={prefilledNote}
              />
            </KeyboardSafeScroll>
          )}
          </>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 22,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.brand,
    letterSpacing: -0.8,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  modeOn: {
    backgroundColor: palette.surfaceSolid,
  },
  modeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.brandMuted,
  },
  modeTextOn: {
    color: palette.ink,
    fontFamily: 'DMSans_600SemiBold',
  },
  advancedPad: {
    paddingBottom: 120,
  },
});
