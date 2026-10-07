import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AmountPrivacyToggle } from '@/src/components/AmountPrivacyToggle';
import { BrandScreen, ScreenHeader } from '@/src/components/ui';
import { colors, space } from '@/src/theme';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { EditTransactionModal } from '@/src/components/EditTransactionModal';
import { EmptyState } from '@/src/components/EmptyState';
import { ExpenseRow } from '@/src/components/ExpenseRow';
import { MoneyText } from '@/src/components/MoneyText';
import { PeriodToggle } from '@/src/components/PeriodToggle';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { categoryVisual } from '@/src/data/spendConcepts';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Period, Transaction } from '@/src/types/finance';
import { isPocketMove } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { closedDebts } from '@/src/utils/debts';
import { shiftMonth, spendByConcept, sumByType, sumSpendOut } from '@/src/utils/financeMath';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { appAlert } from '@/src/components/AppAlert';
import { useSaveToast } from '@/src/components/SaveToast';

const PAGE_SIZE = 20;

export default function HistorialScreen() {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const toast = useSaveToast();
  const {
    transactionsForPeriod,
    transactionsForMonth,
    totalForPeriod,
    removeTransaction,
    restoreTransaction,
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
  const byConcept = useMemo(
    () => (period === 'mes' ? spendByConcept(items, settings.spendConcepts ?? [], debts) : []),
    [period, items, settings.spendConcepts, debts]
  );
  const monthBalance = incomeTotal - expenseTotal;

  const periodLabel =
    period === 'mes'
      ? new Date(monthCursor.year, monthCursor.monthIndex, 1).toLocaleDateString(
          language === 'es' ? 'es-CO' : 'en-US',
          { month: 'long', year: 'numeric' }
        )
      : t(`period.${period}` as TranslationKey);

  /** Deletes at once and offers Undo on the toast, instead of asking first. */
  function deleteWithUndo(tx: Transaction) {
    if (!canEditTransaction(tx)) {
      appAlert(t('history.deleteTitle'), t('history.onlyOwn'));
      return;
    }
    const spendConcepts = settings.spendConcepts ?? [];
    const pocketMove = isPocketMove(tx.type);
    const visual =
      !pocketMove && tx.categoryId ? categoryVisual(tx.categoryId, spendConcepts) : null;
    void removeTransaction(tx.id).then(() => {
      toast.show({
        tone: 'removed',
        kicker: t('history.deletedKicker'),
        title:
          !pocketMove && tx.categoryId
            ? categoryLabel(tx.categoryId, t, spendConcepts)
            : t(`type.${tx.type}` as TranslationKey),
        amount: format(tx.amount),
        icon: visual?.icon,
        color: pocketMove ? colors.accent.teal : visual?.color,
        action: {
          label: t('history.undo'),
          onPress: () => void restoreTransaction(tx),
        },
      });
    });
  }


  function openEdit(tx: Transaction) {
    if (!canEditTransaction(tx)) {
      appAlert(t('history.editTitle'), t('history.onlyOwn'));
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
    <BrandScreen
      gap={space.md}
      header={
        <>
          <ScreenHeader title={t('history.title')} actions={<AmountPrivacyToggle />} />
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
          {period === 'mes' ? (
            <View style={styles.monthNav}>
              <Pressable accessibilityRole="button" onPress={goPrevMonth} style={styles.navBtn}>
                <Text style={styles.navText}>‹ {t('history.prevMonth')}</Text>
              </Pressable>
              <Text style={styles.monthLabel}>{periodLabel}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={goNextMonth}
                disabled={isCurrentMonth}
                style={[styles.navBtn, isCurrentMonth && styles.navDisabled]}>
                <Text style={[styles.navText, isCurrentMonth && styles.navTextDisabled]}>
                  {t('history.nextMonth')} ›
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      }
      overlay={
        <>
          <EditTransactionModal
            visible={!!editing}
            transaction={editing}
            onClose={() => setEditing(null)}
            onDelete={(tx) => {
              setEditing(null);
              deleteWithUndo(tx);
            }}
          />
        </>
      }>
      <View>
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

            {byConcept.length > 0 ? (
              <View style={styles.byConcept}>
                <Text style={styles.byConceptTitle}>{t('history.byConceptTitle')}</Text>
                {byConcept.map((row) => (
                  <View key={row.id} style={styles.byConceptRow}>
                    <ConceptIcon
                      icon={row.concept?.icon}
                      color={row.concept?.color ?? palette.inkMuted}
                      size={14}
                      variant="bubble"
                    />
                    <Text style={styles.byConceptName} numberOfLines={1}>
                      {row.concept?.name ??
                        categoryLabel(row.id, t, settings.spendConcepts ?? [])}
                    </Text>
                    <Text style={styles.byConceptCount}>
                      {t('history.byConceptCount', { count: row.count })}
                    </Text>
                    <MoneyText style={styles.byConceptAmount}>{format(row.total)}</MoneyText>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.hint}>{t('history.hintEdit')}</Text>
          </View>
        </CollapsibleSection>
      </View>

      <View>
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
            <EmptyState
              icon="receipt-text-outline"
              title={t('history.emptyTitle')}
              body={
                period === 'mes' && !isCurrentMonth ? t('history.emptyPast') : t('history.empty')
              }
              action={
                period === 'mes' && !isCurrentMonth
                  ? undefined
                  : {
                      label: t('history.emptyCta'),
                      onPress: () => router.push('/agregar'),
                    }
              }
            />
          ) : (
            <View style={styles.listBlock}>
              <Text style={styles.listHint}>{t('history.rowHint')}</Text>
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
                      onDelete={mine ? () => deleteWithUndo(tx) : undefined}
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
                      accessibilityRole="button"
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
                          safePage <= 0 && styles.pagerTextDisabled,
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
                      accessibilityRole="button"
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
                          safePage >= totalPages - 1 && styles.pagerTextDisabled,
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
      </View>

      {settled.length > 0 ? (
        <View>
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
        </View>
      ) : null}
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
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
  pagerTextDisabled: {
    color: colors.text.tertiary,
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
    fontSize: 12,
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
    fontSize: 12,
    color: palette.inkSoft,
  },
  statValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
  },
  byConcept: {
    marginTop: 14,
    gap: 8,
  },
  byConceptTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.ink,
  },
  byConceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  byConceptName: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  byConceptCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
  },
  byConceptAmount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  income: { color: palette.success },
  expense: { color: palette.danger },
  listHint: {
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
  },
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
