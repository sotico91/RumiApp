import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { EditTransactionModal } from '@/src/components/EditTransactionModal';
import { ExpenseRow } from '@/src/components/ExpenseRow';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { MoneyText } from '@/src/components/MoneyText';
import { PeriodToggle } from '@/src/components/PeriodToggle';
import { RaisedText } from '@/src/components/RaisedText';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Period, Transaction } from '@/src/types/finance';
import { closedDebts } from '@/src/utils/debts';
import { shiftMonth, sumByType, sumSpendOut } from '@/src/utils/financeMath';
import { tapFeedback } from '@/src/utils/selectFeedback';

const PAGE_SIZE = 20;

export default function HistorialScreen() {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const {
    transactionsForPeriod,
    transactionsForMonth,
    totalForPeriod,
    removeTransaction,
    canEditTransaction,
    debts,
  } = useFinance();

  const now = new Date();
  const [period, setPeriod] = useState<Period>('mes');
  const [monthCursor, setMonthCursor] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [settledOpen, setSettledOpen] = useState(false);
  const [page, setPage] = useState(0);

  const settled = useMemo(
    () =>
      closedDebts(debts).sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')),
    [debts]
  );

  const isCurrentMonth =
    monthCursor.year === now.getFullYear() &&
    monthCursor.monthIndex === now.getMonth();

  const items = useMemo(() => {
    if (period === 'mes') {
      return transactionsForMonth(
        monthCursor.year,
        monthCursor.monthIndex,
        'mine'
      );
    }
    return transactionsForPeriod(period, 'mine');
  }, [period, monthCursor, transactionsForMonth, transactionsForPeriod]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = items.length === 0 ? 0 : safePage * PAGE_SIZE;
  const pageItems = items.slice(pageStart, pageStart + PAGE_SIZE);
  const rangeFrom = items.length === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + PAGE_SIZE, items.length);

  useEffect(() => {
    setPage(0);
  }, [period, monthCursor.year, monthCursor.monthIndex]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  // Match Home savings: expenses plus loan installments (card payments excluded).
  const expenseTotal =
    period === 'mes' ? sumSpendOut(items, debts) : totalForPeriod(period, 'expense', 'mine');
  const incomeTotal = sumByType(items, 'income');
  const monthBalance = incomeTotal - expenseTotal;

  const periodLabel =
    period === 'mes'
      ? new Date(monthCursor.year, monthCursor.monthIndex, 1).toLocaleDateString(
          language === 'es' ? 'es-CO' : 'en-US',
          { month: 'long', year: 'numeric' }
        )
      : t(`period.${period}` as TranslationKey);

  function confirmDelete(tx: Transaction) {
    if (!canEditTransaction(tx)) {
      Alert.alert(t('history.deleteTitle'), t('history.onlyOwn'));
      return;
    }
    Alert.alert(t('history.deleteTitle'), t('history.deleteMessage'), [
      { text: t('history.cancel'), style: 'cancel' },
      {
        text: t('history.delete'),
        style: 'destructive',
        onPress: () => {
          void removeTransaction(tx.id);
        },
      },
    ]);
  }

  function openEdit(tx: Transaction) {
    if (!canEditTransaction(tx)) {
      Alert.alert(t('history.editTitle'), t('history.onlyOwn'));
      return;
    }
    setEditing(tx);
  }

  function goPrevMonth() {
    setMonthCursor((m) => shiftMonth(m.year, m.monthIndex, -1));
  }

  function goNextMonth() {
    if (isCurrentMonth) return;
    setMonthCursor((m) => shiftMonth(m.year, m.monthIndex, 1));
  }

  return (
    <ScreenBackground>
      <KeyboardSafeScroll
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <RaisedText style={styles.pageTitle}>{t('history.title')}</RaisedText>
          <PeriodToggle
            value={period}
            onChange={(next) => {
              setPeriod(next);
              if (next === 'mes') {
                setMonthCursor({
                  year: now.getFullYear(),
                  monthIndex: now.getMonth(),
                });
              }
            }}
          />
        </FadeInBlock>

        {period === 'mes' ? (
          <FadeInBlock index={1}>
            <View style={styles.monthNav}>
              <Pressable onPress={goPrevMonth} style={styles.navBtn}>
                <Text style={styles.navText}>‹ {t('history.prevMonth')}</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{periodLabel}</Text>
              <Pressable
                onPress={goNextMonth}
                disabled={isCurrentMonth}
                style={[styles.navBtn, isCurrentMonth && styles.navDisabled]}>
                <Text style={[styles.navText, isCurrentMonth && styles.navTextDisabled]}>
                  {t('history.nextMonth')} ›
                </Text>
              </Pressable>
            </View>
          </FadeInBlock>
        ) : null}

        <FadeInBlock index={2}>
          <CollapsibleSection
            title={t('history.summaryTitle')}
            open={summaryOpen}
            onToggle={() => setSummaryOpen((v) => !v)}
            summary={t('history.summaryCollapsed', {
              amount: format(expenseTotal),
              period: periodLabel,
            })}>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>
                {t('history.total', { period: periodLabel })}
              </Text>
              <MoneyText style={styles.summaryAmount}>{format(expenseTotal)}</MoneyText>

              {period === 'mes' ? (
                <View style={styles.monthStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('history.monthIncome')}</Text>
                    <MoneyText style={[styles.statValue, styles.income]}>
                      {format(incomeTotal)}
                    </MoneyText>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('history.monthExpenses')}</Text>
                    <MoneyText style={[styles.statValue, styles.expense]}>
                      {format(expenseTotal)}
                    </MoneyText>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>{t('history.monthBalance')}</Text>
                    <MoneyText
                      style={[
                        styles.statValue,
                        monthBalance >= 0 ? styles.income : styles.expense,
                      ]}>
                      {format(monthBalance)}
                    </MoneyText>
                  </View>
                </View>
              ) : null}

              <Text style={styles.hint}>{t('history.hintEdit')}</Text>
            </View>
          </CollapsibleSection>
        </FadeInBlock>

        <FadeInBlock index={3}>
          <CollapsibleSection
            title={t('history.listTitle')}
            open={listOpen}
            onToggle={() => setListOpen((v) => !v)}
            summary={
              items.length === 0
                ? t('history.emptyTitle')
                : t('history.listCollapsed', { count: items.length })
            }>
            {items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
                <Text style={styles.empty}>{t('history.empty')}</Text>
              </View>
            ) : (
              <View style={styles.listBlock}>
                <View style={styles.list}>
                  {pageItems.map((tx, index) => {
                    const mine = canEditTransaction(tx);
                    return (
                      <ExpenseRow
                        key={tx.id}
                        expense={tx}
                        last={index === pageItems.length - 1}
                        showRegistrant={false}
                        onEdit={mine ? () => openEdit(tx) : undefined}
                        onDelete={mine ? () => confirmDelete(tx) : undefined}
                      />
                    );
                  })}
                </View>
                {items.length > PAGE_SIZE ? (
                  <View style={styles.pager}>
                    <Text style={styles.pagerRange}>
                      {t('history.showingRange', {
                        from: rangeFrom,
                        to: rangeTo,
                        total: items.length,
                      })}
                    </Text>
                    <View style={styles.pagerRow}>
                      <Pressable
                        onPress={() => {
                          if (safePage <= 0) return;
                          tapFeedback();
                          setPage((p) => Math.max(0, p - 1));
                        }}
                        disabled={safePage <= 0}
                        style={[styles.pagerBtn, safePage <= 0 && styles.navDisabled]}>
                        <Text
                          style={[
                            styles.pagerBtnText,
                            safePage <= 0 && styles.navTextDisabled,
                          ]}>
                          ‹ {t('history.prevPage')}
                        </Text>
                      </Pressable>
                      <Text style={styles.pagerPage}>
                        {t('history.pageOf', {
                          page: safePage + 1,
                          pages: totalPages,
                        })}
                      </Text>
                      <Pressable
                        onPress={() => {
                          if (safePage >= totalPages - 1) return;
                          tapFeedback();
                          setPage((p) => Math.min(totalPages - 1, p + 1));
                        }}
                        disabled={safePage >= totalPages - 1}
                        style={[
                          styles.pagerBtn,
                          safePage >= totalPages - 1 && styles.navDisabled,
                        ]}>
                        <Text
                          style={[
                            styles.pagerBtnText,
                            safePage >= totalPages - 1 && styles.navTextDisabled,
                          ]}>
                          {t('history.nextPage')} ›
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </CollapsibleSection>
        </FadeInBlock>

        {settled.length > 0 ? (
          <FadeInBlock index={4}>
            <CollapsibleSection
              title={t('history.settledTitle')}
              open={settledOpen}
              onToggle={() => setSettledOpen((v) => !v)}
              summary={t('history.settledCollapsed', { count: settled.length })}>
              <Text style={styles.settledHint}>{t('history.settledHint')}</Text>
              {settled.map((debt) => {
                const label = debt.nameKey
                  ? t(debt.nameKey as TranslationKey)
                  : debt.name ?? t('debt.mainCard');
                const closedDate = debt.closedAt
                  ? new Date(debt.closedAt).toLocaleDateString(
                      language === 'es' ? 'es-CO' : 'en-US'
                    )
                  : '';
                return (
                  <View key={debt.id} style={styles.settledCard}>
                    <Text style={styles.settledName}>{label}</Text>
                    {closedDate ? (
                      <Text style={styles.settledMeta}>
                        {t('history.settledOn', { date: closedDate })}
                      </Text>
                    ) : null}
                    {debt.paidCapital > 0 ? (
                      <Text style={styles.settledMeta}>
                        {t('history.settledPaid', { amount: format(debt.paidCapital) })}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </CollapsibleSection>
          </FadeInBlock>
        ) : null}
      </KeyboardSafeScroll>

      <EditTransactionModal
        visible={!!editing}
        transaction={editing}
        onClose={() => setEditing(null)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 168, gap: 16 },
  pageTitle: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 34,
    color: palette.brand,
    marginBottom: 12,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.md,
    padding: 10,
    gap: 8,
  },
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navDisabled: { opacity: 0.35 },
  navText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.brand,
  },
  navTextDisabled: {
    color: palette.brandMuted,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.brand,
    textTransform: 'capitalize',
  },
  summary: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 22,
  },
  summaryLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkMuted,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    marginTop: 8,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    color: palette.ink,
  },
  monthStats: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 10,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: palette.inkSoft,
  },
  statValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
  },
  income: { color: palette.success },
  expense: { color: palette.danger },
  hint: {
    marginTop: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    lineHeight: 17,
  },
  listBlock: {
    gap: 10,
  },
  list: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
  },
  pager: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  pagerRange: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkMuted,
    textAlign: 'center',
  },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pagerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 88,
  },
  pagerBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  pagerPage: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  emptyWrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 22,
  },
  emptyTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  empty: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    color: palette.inkMuted,
  },
  settledHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  settledCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    marginBottom: 10,
  },
  settledName: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: palette.ink,
  },
  settledMeta: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
});
