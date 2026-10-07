import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getCategoryById } from '@/src/data/categories';
import { flattenSpendSubs } from '@/src/data/spendConcepts';
import { QuickRepeatSheet } from '@/src/components/QuickRepeatSheet';
import { useFundsCheck } from '@/src/hooks/useFundsCheck';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { notifyExpenseRegistered } from '@/src/utils/notifications';
import { movementNotifyCopy } from '@/src/utils/movementNotify';
import { buildOneTapHabits, type OneTapHabit } from '@/src/utils/oneTapHabits';
import { paymentMethodForAccount } from '@/src/utils/accounts';
import { isDebtPayAccountId } from '@/src/utils/debts';
import { tapFeedback } from '@/src/utils/selectFeedback';

/**
 * One-tap = repeat a frequent subcategory with the last amount (editable).
 * Long-press opens Agregar with concept prefilled.
 */
export function QuickAddBar() {
  const { t } = useLanguage();
  const { format, formatPlain, parse, currency } = useMoney();
  const { settings, updateQuickTemplate } = useSettings();
  const { addTransaction, transactions, accounts, debts } = useFinance();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sheetHabit, setSheetHabit] = useState<OneTapHabit | null>(null);
  const busyLock = useRef(false);
  const spendConcepts = settings.spendConcepts ?? [];
  const checkFunds = useFundsCheck();

  const allowedIds = useMemo(
    () =>
      new Set([
        ...settings.enabledCategoryIds,
        ...flattenSpendSubs(spendConcepts).map((s) => s.id),
      ]),
    [settings.enabledCategoryIds, spendConcepts]
  );

  const habits = useMemo(
    () => buildOneTapHabits(transactions, allowedIds, spendConcepts),
    [transactions, allowedIds, spendConcepts]
  );

  if (habits.length === 0) {
    return null;
  }

  const sheetLabel = sheetHabit
    ? categoryLabel(sheetHabit.categoryId, t, spendConcepts)
    : '';

  async function registerHabit(habit: OneTapHabit, amount: number, note: string, accountId: string) {
    if (busyLock.current) return;
    if (!checkFunds({ type: 'expense', amount, accountId })) return;

    busyLock.current = true;
    setBusyId(habit.id);
    const resolvedNote = note.trim() || undefined;
    try {
      await addTransaction({
        type: 'expense',
        amount,
        categoryId: habit.categoryId,
        note: resolvedNote,
        paymentMethod: isDebtPayAccountId(accountId)
          ? 'credit'
          : paymentMethodForAccount(
              accounts.find((a) => a.id === accountId),
              habit.paymentMethod ?? 'debit'
            ),
        accountId,
      });
      await updateQuickTemplate({
        categoryId: habit.categoryId,
        amount,
        note: resolvedNote,
      });

      if (settings.notifyOnExpense) {
        const copy = movementNotifyCopy({
          t,
          type: 'expense',
          amount: formatPlain(amount),
          transactions,
          spendConcepts,
          accounts,
          categoryId: habit.categoryId,
          accountId,
          note: resolvedNote,
        });
        await notifyExpenseRegistered(copy.title, copy.body);
      }
      setSheetHabit(null);
    } finally {
      busyLock.current = false;
      setBusyId(null);
    }
  }

  function openFullAdd(habit: OneTapHabit, amount?: number, note?: string) {
    setSheetHabit(null);
    router.push({
      pathname: '/agregar',
      params: {
        categoryId: habit.categoryId,
        amount: String(amount ?? habit.amount),
        note: note ?? habit.note ?? '',
        mode: 'advanced',
      },
    });
  }

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('home.quickTitle')}</Text>
        <Text style={styles.hint}>{t('home.quickHint')}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {habits.map((habit) => {
            const category = getCategoryById(habit.categoryId);
            const busy = busyId === habit.id;
            const label = categoryLabel(habit.categoryId, t, spendConcepts);
            return (
              <Pressable
                key={habit.id}
                onPress={() => {
                  tapFeedback();
                  setSheetHabit(habit);
                }}
                onLongPress={() => {
                  tapFeedback();
                  openFullAdd(habit);
                }}
                delayLongPress={400}
                disabled={!!busyId}
                style={[styles.chip, { borderColor: category.color }]}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <View style={styles.chipBody}>
                  <View style={styles.chipTitleRow}>
                    <Text style={styles.chipTitle} numberOfLines={1}>
                      {label}
                    </Text>
                    {habit.isAnt ? (
                      <View style={styles.antDot}>
                        <Text style={styles.antDotText}>🐜</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.chipAmount}>
                    {t('home.quickLastAmount', { amount: format(habit.amount) })}
                  </Text>
                </View>
                {busy ? <ActivityIndicator size="small" color={palette.accent} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <QuickRepeatSheet
        visible={sheetHabit != null}
        habit={sheetHabit}
        label={sheetLabel}
        format={format}
        currency={currency}
        parse={parse}
        busy={busyId != null}
        accounts={accounts}
        debts={debts}
        onClose={() => setSheetHabit(null)}
        onConfirm={(amount, note, accountId) => {
          if (!sheetHabit) return;
          void registerHabit(sheetHabit, amount, note, accountId);
        }}
        onEditFull={(amount, note) => {
          if (!sheetHabit) return;
          openFullAdd(sheetHabit, amount, note);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 8,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  row: {
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7FAFC',
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 148,
    maxWidth: 200,
  },
  chipBody: {
    flex: 1,
    gap: 2,
  },
  chipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
    flexShrink: 1,
  },
  antDot: {
    marginLeft: 2,
  },
  antDotText: {
    fontSize: 11,
  },
  chipAmount: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.inkMuted,
  },
});
