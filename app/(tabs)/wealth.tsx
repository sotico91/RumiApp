import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AmountPrivacyToggle } from '@/src/components/AmountPrivacyToggle';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { HowToGuideButton } from '@/src/components/HowToGuideButton';
import { MoneyText } from '@/src/components/MoneyText';
import { AppText, BrandScreen, ScreenHeader } from '@/src/components/ui';
import { DebtCard } from '@/src/components/wealth/DebtCard';
import { DebtForm } from '@/src/components/wealth/DebtForm';
import { PocketsSection } from '@/src/components/wealth/PocketsSection';
import { styles } from '@/src/components/wealth/styles';
import { useDebtForm } from '@/src/components/wealth/useDebtForm';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, space } from '@/src/theme';
import type { Debt } from '@/src/types/finance';
import { creditAvailable, debtKind, openDebts } from '@/src/utils/debts';

export default function WealthScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { debts, netWorth, transactionsForPeriod } = useFinance();

  const [cardsOpen, setCardsOpen] = useState(true);
  const [loansOpen, setLoansOpen] = useState(true);
  const form = useDebtForm((kind) => {
    if (kind === 'revolving') setCardsOpen(true);
    else setLoansOpen(true);
  });
  const { showForm, kind } = form;

  const monthTx = transactionsForPeriod('mes', 'mine');
  const liveDebts = useMemo(() => openDebts(debts), [debts]);
  const revolvingDebts = useMemo(
    () => liveDebts.filter((d) => debtKind(d) === 'revolving'),
    [liveDebts]
  );
  const installmentDebts = useMemo(
    () => liveDebts.filter((d) => debtKind(d) !== 'revolving'),
    [liveDebts]
  );

  const paidByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthTx) {
      if (tx.type !== 'debt_payment' && tx.type !== 'expense') continue;
      if (!tx.categoryId) continue;
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    return map;
  }, [monthTx]);

  const loanMonthDue = installmentDebts.reduce((s, d) => s + (d.installment || 0), 0);
  const cardMonthDue = revolvingDebts.reduce((s, d) => s + (d.installment || 0), 0);
  const cardAvailableTotal = revolvingDebts.reduce((s, d) => s + creditAvailable(d), 0);
  const paidLoansThisMonth = installmentDebts.reduce((sum, debt) => {
    if (!debt.categoryId) return sum;
    return sum + (paidByCategory.get(debt.categoryId) ?? 0);
  }, 0);
  const paidCardsThisMonth = revolvingDebts.reduce((sum, debt) => {
    if (!debt.categoryId) return sum;
    return sum + (paidByCategory.get(debt.categoryId) ?? 0);
  }, 0);

  function renderDebt(debt: Debt) {
    return (
      <DebtCard
        key={debt.id}
        debt={debt}
        paid={debt.categoryId ? paidByCategory.get(debt.categoryId) ?? 0 : 0}
        editing={form.editingId === debt.id}
        onEdit={form.startEdit}
        onRemove={form.confirmRemove}
      />
    );
  }

  return (
    <BrandScreen
      gap={space.md}
      header={
        <>
          <ScreenHeader
            title={t('wealth.title')}
            subtitle={t('wealth.subtitle')}
            actions={
              <>
                <HowToGuideButton light />
                <AmountPrivacyToggle />
              </>
            }
          />
          <View style={styles.net}>
            <AppText variant="overline" color="onBrandMuted">
              {t('wealth.net')}
            </AppText>
            <MoneyText
              style={[
                styles.netValue,
                netWorth.net < 0 && { color: colors.text.onBrandDanger },
              ]}>
              {format(netWorth.net)}
            </MoneyText>
            <View style={styles.netSplit}>
              <AppText variant="caption" color="onBrandMuted">
                {t('wealth.assets')}: {format(netWorth.assets)}
              </AppText>
              <AppText variant="caption" color="onBrandMuted">
                {t('wealth.liabilities')}: {format(netWorth.liabilities)}
              </AppText>
            </View>
          </View>
        </>
      }>
      <PocketsSection />

      <View>
        <CollapsibleSection
          title={t('wealth.cards')}
          open={cardsOpen}
          onToggle={() => setCardsOpen((v) => !v)}
          summary={
            revolvingDebts.length === 0
              ? t('wealth.cardsEmptyShort')
              : t('wealth.cardsCollapsed', {
                  count: revolvingDebts.length,
                  available: format(cardAvailableTotal),
                })
          }>
          {!(showForm && kind === 'revolving') ? (
            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }} />
              <Pressable accessibilityRole="button" onPress={() => form.startCreate('revolving')} style={styles.addBtn}>
                <Text style={styles.addBtnText}>{t('wealth.addCard')}</Text>
              </Pressable>
            </View>
          ) : null}

          {revolvingDebts.length > 1 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('wealth.cardsMonth')}</Text>
              <MoneyText style={styles.amount}>{format(cardMonthDue)}</MoneyText>
              {paidCardsThisMonth > 0 ? (
                <Text style={styles.meta}>
                  {t('wealth.fixedPaid', {
                    paid: format(paidCardsThisMonth),
                    due: format(cardMonthDue),
                  })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {showForm && kind === 'revolving' ? <DebtForm form={form} /> : null}

          {revolvingDebts.length === 0 && !(showForm && kind === 'revolving') ? (
            <View style={styles.card}>
              <Text style={styles.empty}>{t('wealth.cardsEmpty')}</Text>
            </View>
          ) : null}

          {revolvingDebts.map(renderDebt)}
        </CollapsibleSection>
      </View>

      <View>
        <CollapsibleSection
          title={t('wealth.loans')}
          open={loansOpen}
          onToggle={() => setLoansOpen((v) => !v)}
          summary={
            installmentDebts.length === 0
              ? t('wealth.loansEmptyShort')
              : t('wealth.loansCollapsed', {
                  count: installmentDebts.length,
                  amount: format(loanMonthDue),
                })
          }>
          {!(showForm && kind === 'installment') ? (
            <View style={styles.sectionRow}>
              <View style={{ flex: 1 }} />
              <Pressable accessibilityRole="button" onPress={() => form.startCreate('installment')} style={styles.addBtn}>
                <Text style={styles.addBtnText}>{t('wealth.addLoan')}</Text>
              </Pressable>
            </View>
          ) : null}

          {installmentDebts.length > 1 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('wealth.fixedMonth')}</Text>
              <MoneyText style={styles.amount}>{format(loanMonthDue)}</MoneyText>
              {paidLoansThisMonth > 0 ? (
                <Text style={styles.meta}>
                  {t('wealth.fixedPaid', {
                    paid: format(paidLoansThisMonth),
                    due: format(loanMonthDue),
                  })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {showForm && kind === 'installment' ? <DebtForm form={form} /> : null}

          {installmentDebts.length === 0 && !(showForm && kind === 'installment') ? (
            <View style={styles.card}>
              <Text style={styles.empty}>{t('wealth.loansEmpty')}</Text>
            </View>
          ) : null}

          {installmentDebts.map(renderDebt)}
        </CollapsibleSection>
      </View>
    </BrandScreen>
  );
}
