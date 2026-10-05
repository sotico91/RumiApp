import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppAlertHost } from '@/src/components/AppAlert';
import { ExpenseForm, type SavedMovement } from '@/src/components/ExpenseForm';
import { FriendlyAddFlow } from '@/src/components/FriendlyAddFlow';
import { QuickSpendForm } from '@/src/components/QuickSpendForm';
import type { FriendlyIntent } from '@/src/data/friendlyTemplates';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { useSaveToast } from '@/src/components/SaveToast';
import { categoryVisual } from '@/src/data/spendConcepts';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, radius, shadow, space, type } from '@/src/theme';
import { categoryLabel } from '@/src/utils/categoryLabel';

export default function AgregarScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const toast = useSaveToast();
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
    const spendConcepts = settings.spendConcepts ?? [];
    const visual = result.categoryId
      ? categoryVisual(result.categoryId, spendConcepts)
      : undefined;
    const label = result.categoryId
      ? categoryLabel(result.categoryId, t, spendConcepts)
      : '';
    const added = result.added ?? result.amount;

    const kicker =
      result.kind === 'income'
        ? t('add.toastIncome')
        : result.kind === 'expense'
          ? t('add.toastExpense')
          : t('add.toastOther');
    const footer =
      result.kind === 'expense'
        ? t('add.savedExpense', { amount: format(result.amount) })
        : result.kind === 'income'
          ? t('add.toastTodayIncome', { amount: format(result.amount) })
          : undefined;

    router.back();
    toast.show({
      tone: result.kind,
      kicker,
      title: label || kicker,
      amount: `${result.kind === 'expense' ? '−' : result.kind === 'income' ? '+' : ''}${format(added)}`,
      footer,
      icon: result.kind === 'expense' ? visual?.icon : undefined,
      color: result.kind === 'expense' ? visual?.color : undefined,
    });
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
      {/* On iOS this screen is a native modal, so its alerts must render inside it. */}
      <AppAlertHost inline />
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
