import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ExpenseForm, type SavedMovement } from '@/src/components/ExpenseForm';
import { FriendlyAddFlow } from '@/src/components/FriendlyAddFlow';
import { QuickSpendForm } from '@/src/components/QuickSpendForm';
import type { FriendlyIntent } from '@/src/data/friendlyTemplates';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, radius, shadow, space, type } from '@/src/theme';

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
  // "Add" opens the "What happened?" cards; "I spent" goes to the one-screen form.
  const [mode, setMode] = useState<'quick' | 'friendly' | 'advanced'>('friendly');
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
    } else if (params.mode === 'quick') {
      // Home's "first expense" card goes straight to the one-screen form.
      setMode('quick');
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
    <View style={styles.root}>
      <View style={styles.content}>
        {mode === 'quick' ? (
          <QuickSpendForm
            onSaved={handleSaved}
            onBack={() => {
              setGuidedIntent(undefined);
              setMode('friendly');
            }}
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
              key={guidedIntent ?? 'pick'}
              onSaved={handleSaved}
              onSwitchAdvanced={() => setMode('advanced')}
              initialIntent={guidedIntent ?? payIntent}
              initialDebtId={payDebtId}
              onPickSpend={guidedIntent || payIntent ? undefined : () => setMode('quick')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.screen,
  },
  content: {
    flex: 1,
    padding: space.gutter,
    paddingBottom: space.xxl,
    gap: space.sm,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15,28,36,0.06)',
    borderRadius: radius.md,
    padding: space.xxs,
    gap: space.xxs,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  modeOn: {
    backgroundColor: colors.bg.surface,
    ...shadow.e1,
  },
  modeText: {
    ...type.caption,
    fontFamily: type.bodyStrong.fontFamily,
    color: colors.text.secondary,
  },
  modeTextOn: {
    color: colors.text.primary,
    fontFamily: type.label.fontFamily,
  },
  advancedPad: {
    paddingBottom: 120,
  },
});
