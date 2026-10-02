import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { AntSpendTipCard } from '@/src/components/AntSpendTipCard';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { ConceptGlanceSheet } from '@/src/components/ConceptGlanceSheet';
import { EditTransactionModal } from '@/src/components/EditTransactionModal';
import { ExpenseRow } from '@/src/components/ExpenseRow';
import { FadeInBlock } from '@/src/components/FadeInBlock';
import { HabitPilotCard } from '@/src/components/HabitPilotCard';
import { HowToGuideButton } from '@/src/components/HowToGuideButton';
import { KeyboardSafeScroll } from '@/src/components/KeyboardSafe';
import { PredictedSpendsCard } from '@/src/components/PredictedSpendsCard';
import { ProfileMenuButton } from '@/src/components/ProfileMenuButton';
import { QuickAddBar } from '@/src/components/QuickAddBar';
import { PocketFlowList } from '@/src/components/PocketFlowList';
import { RaisedText } from '@/src/components/RaisedText';
import { SavingsDecor } from '@/src/components/SavingsDecor';
import { ScreenBackground } from '@/src/components/ScreenBackground';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Transaction } from '@/src/types/finance';
import { projectMonth } from '@/src/utils/projection';
import { categoryLabel } from '@/src/utils/categoryLabel';
import {
  antTipWeekKey,
  pickAntSpendTip,
} from '@/src/utils/antSpendTips';
import { tapFeedback } from '@/src/utils/selectFeedback';
import {
  toneFromExpensePressure,
  toneFromSavings,
  type SignalTone,
} from '@/src/utils/signalTone';

type MoneyInfoKind = 'available' | 'savings';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings, dismissAntSpendTipWeek } = useSettings();
  const {
    totalForPeriod,
    insightsForPeriod,
    transactionsForPeriod,
    transactions,
    loading,
    availableCash,
    debts,
    budgetStatus,
    removeTransaction,
    canEditTransaction,
    predictedThisMonth,
  } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [glance, setGlance] = useState<'expense' | 'income' | null>(null);
  const [moneyInfo, setMoneyInfo] = useState<MoneyInfoKind | null>(null);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [predictOpen, setPredictOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(true);

  const displayName = settings.userName.trim();
  const greeting = displayName
    ? t('home.greeting', { name: displayName })
    : t('home.greetingFallback');
  const spaceLabel = displayName
    ? t('home.spaceLabel', { name: displayName })
    : t('home.yours');
  const initial = (displayName.charAt(0) || 'R').toUpperCase();

  const income = totalForPeriod('mes', 'income');
  const expenses = totalForPeriod('mes', 'expense');
  const savings = income - expenses;
  // Where the month is heading (fixed bills once + day-to-day pace), shown once it means something.
  const pace = useMemo(() => projectMonth(transactions, debts), [transactions, debts]);
  const paceHint =
    !loading && !pace.early && pace.income > 0
      ? t(pace.projectedLeft >= 0 ? 'home.paceAhead' : 'home.paceBehind', {
          amount: format(Math.abs(pace.projectedLeft)),
        })
      : undefined;
  const recent = transactionsForPeriod('hoy');
  const expenseConcepts = insightsForPeriod('mes', 'expense');
  const incomeConcepts = insightsForPeriod('mes', 'income');
  const spendConcepts = settings.spendConcepts ?? [];
  /** Only strictly over limit — keep attention actionable and short. */
  const ATTENTION_OVER_LIMIT = 3;
  const overBudgetAlerts = [...budgetStatus]
    .filter((b) => b.ratio > 1 && b.spent > 0 && b.limit > 0)
    .sort((a, b) => b.ratio - a.ratio);
  const alerts = overBudgetAlerts.slice(0, ATTENTION_OVER_LIMIT);
  const alertsHidden = Math.max(0, overBudgetAlerts.length - alerts.length);
  const predictPending = predictedThisMonth.filter((p) => p.status === 'pending');
  const predictTotal = predictedThisMonth.reduce((s, p) => s + p.amount, 0);
  const predictPendingTotal = predictPending.reduce((s, p) => s + p.amount, 0);
  const worstBudgetRatio = Math.max(0, ...budgetStatus.map((b) => b.ratio));
  const savingsTone = toneFromSavings(savings);
  const expensesTone = toneFromExpensePressure({
    expenses,
    income,
    worstBudgetRatio,
  });

  const antTip = useMemo(() => {
    if (loading || !settings.onboardingDone) return null;
    if (settings.antTipDismissedWeekKey === antTipWeekKey()) return null;
    return pickAntSpendTip(transactions, spendConcepts, new Date(), settings.currency);
  }, [
    loading,
    settings.onboardingDone,
    settings.antTipDismissedWeekKey,
    settings.currency,
    transactions,
    spendConcepts,
  ]);

  const antTipTitleVariant = settings.antTipLastTitleVariant ?? 0;
  const antTipBodyVariant = settings.antTipLastBodyVariant ?? 0;


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

  return (
    <ScreenBackground>
      <KeyboardSafeScroll
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <FadeInBlock>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <RaisedText style={styles.brand}>{t('brand.name')}</RaisedText>
              <RaisedText tone="gold" style={styles.greeting}>
                {greeting}
              </RaisedText>
              <Text style={styles.spaceLabel}>{spaceLabel}</Text>
            </View>
            <View style={styles.heroAside}>
              <View style={styles.avatarRow}>
                <HowToGuideButton light />
                <ProfileMenuButton />
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
              </View>
              <SavingsDecor />
            </View>
          </View>
        </FadeInBlock>

        <FadeInBlock index={2}>
          <Pressable
            onPress={() => setMoneyInfo('available')}
            onPressIn={() => tapFeedback()}
            style={styles.positionCard}>
            <View style={styles.availableHead}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.positionTitle}>{t('home.available')}</Text>
                <Text style={styles.positionHint}>{t('home.availableCaption')}</Text>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[styles.availableTodayTotal, styles.textGood]}>
                {format(loading ? 0 : availableCash)}
              </Text>
            </View>
          </Pressable>
        </FadeInBlock>

        <FadeInBlock index={3}>
          <View style={styles.dashGrid}>
            <DashTile
              label={t('home.income')}
              value={format(loading ? 0 : income)}
              tone="good"
              onPress={() => setGlance('income')}
            />
            <DashTile
              label={t('home.expenses')}
              value={format(loading ? 0 : expenses)}
              tone={expensesTone === 'neutral' ? 'danger' : expensesTone}
              onPress={() => setGlance('expense')}
            />
            <DashTile
              label={t('home.savings')}
              value={format(savings)}
              tone={savingsTone}
              hint={
                paceHint ??
                (savingsTone === 'good'
                  ? t('home.savingsGood')
                  : savingsTone === 'danger'
                    ? t('home.savingsBad')
                    : undefined)
              }
              onPress={() => setMoneyInfo('savings')}
            />
          </View>
        </FadeInBlock>

        <FadeInBlock index={5}>
          <QuickAddBar />
        </FadeInBlock>

        <FadeInBlock index={6}>
          <HabitPilotCard />
        </FadeInBlock>

        {antTip ? (
          <FadeInBlock index={6}>
            <AntSpendTipCard
              tip={antTip}
              conceptLabel={categoryLabel(antTip.categoryId, t, spendConcepts)}
              titleVariant={antTipTitleVariant}
              bodyVariant={antTipBodyVariant}
              onDismiss={() => {
                void dismissAntSpendTipWeek();
              }}
              onOpen={() => setGlance('expense')}
            />
          </FadeInBlock>
        ) : null}

        <FadeInBlock index={7}>
          <CollapsibleSection
            title={t('home.attention')}
            open={attentionOpen}
            onToggle={() => setAttentionOpen((v) => !v)}
            summary={
              alerts.length === 0
                ? t('home.attentionEmptyShort')
                : t('home.attentionSummary', { count: alerts.length + alertsHidden })
            }>
            {alerts.length === 0 ? (
              <View style={[styles.attentionCard, styles.good]}>
                <Text style={styles.attentionText}>{t('home.attentionEmpty')}</Text>
              </View>
            ) : (
              <>
                {alerts.map((a) => (
                  <View key={a.categoryId} style={[styles.attentionCard, styles.danger]}>
                    <Text style={[styles.attentionText, styles.attentionDangerText]}>
                      {t('insights.overBudget')}:{' '}
                      {categoryLabel(a.categoryId, t, spendConcepts)} (
                      {Math.round(a.ratio * 100)}%)
                    </Text>
                  </View>
                ))}
                {alertsHidden > 0 ? (
                  <Pressable onPress={() => router.push('/(tabs)/plan')}>
                    <Text style={styles.attentionMore}>
                      {t('home.attentionMore', { count: alertsHidden })}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </CollapsibleSection>
        </FadeInBlock>

        <FadeInBlock index={8}>
          <CollapsibleSection
            title={t('home.predictTitle')}
            open={predictOpen}
            onToggle={() => setPredictOpen((v) => !v)}
            summary={
              predictPending.length === 0
                ? t('home.predictSummaryClear', { amount: format(predictTotal) })
                : t('home.predictSummary', {
                    pending: predictPending.length,
                    amount: format(predictPendingTotal),
                  })
            }>
            <PredictedSpendsCard items={predictedThisMonth} />
          </CollapsibleSection>
        </FadeInBlock>

        {recent.length > 0 ? (
          <FadeInBlock index={9}>
            <CollapsibleSection
              title={t('home.todayList')}
              open={todayOpen}
              onToggle={() => setTodayOpen((v) => !v)}
              summary={t('home.todayListSummary', {
                count: Math.min(recent.length, 8),
              })}>
              <View style={styles.todayList}>
                {recent.slice(0, 8).map((tx, index) => {
                  const mine = canEditTransaction(tx);
                  return (
                    <ExpenseRow
                      key={tx.id}
                      expense={tx}
                      last={index === Math.min(recent.length, 8) - 1}
                      showRegistrant={false}
                      onEdit={mine ? () => openEdit(tx) : undefined}
                      onDelete={mine ? () => confirmDelete(tx) : undefined}
                    />
                  );
                })}
              </View>
            </CollapsibleSection>
          </FadeInBlock>
        ) : null}

      </KeyboardSafeScroll>

      <ConceptGlanceSheet
        visible={glance != null}
        onClose={() => setGlance(null)}
        kind={glance ?? 'expense'}
        items={glance === 'income' ? incomeConcepts : expenseConcepts}
        total={glance === 'income' ? income : expenses}
      />

      <EditTransactionModal
        visible={!!editing}
        transaction={editing}
        onClose={() => setEditing(null)}
      />

      <AppModal
        visible={moneyInfo != null}
        transparent
        animationType="fade"
        onRequestClose={() => setMoneyInfo(null)}>
        <View style={styles.infoRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMoneyInfo(null)} />
          <View
            style={[
              styles.infoCard,
              { marginBottom: Math.max(insets.bottom, 16) + 24 },
            ]}>
            <Text style={styles.infoEyebrow}>{t('home.moneyInfoEyebrow')}</Text>
            <Text style={styles.infoTitle}>
              {t(
                (moneyInfo === 'available'
                  ? 'home.available'
                  : 'home.savings') as TranslationKey
              )}
            </Text>
            <Text style={styles.infoBody}>
              {t(
                (moneyInfo === 'available'
                  ? 'home.availableInfoBody'
                  : 'home.savingsInfoBody') as TranslationKey
              )}
            </Text>
            {moneyInfo === 'available' ? (
              <View style={styles.availableBreakdown}>
                <PocketFlowList />
              </View>
            ) : null}
            <Text style={styles.infoCompare}>
              {t(
                (moneyInfo === 'available'
                  ? 'home.availableInfoCompare'
                  : 'home.savingsInfoCompare') as TranslationKey
              )}
            </Text>
            <Pressable
              onPress={() => {
                tapFeedback();
                setMoneyInfo(null);
              }}
              style={styles.infoBtn}>
              <Text style={styles.infoBtnText}>{t('home.moneyInfoGotIt')}</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>
    </ScreenBackground>
  );
}

function DashTile({
  label,
  value,
  tone = 'neutral',
  hint,
  onPress,
}: {
  label: string;
  value: string;
  tone?: SignalTone;
  hint?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      onPressIn={onPress ? () => tapFeedback() : undefined}
      style={[
        styles.tile,
        tone === 'danger' && styles.boxDanger,
        tone === 'warn' && styles.boxWarn,
        tone === 'good' && styles.boxGood,
      ]}>
      <Text
        style={[
          styles.tileLabel,
          tone === 'danger' && styles.textDanger,
          tone === 'good' && styles.textGood,
          tone === 'warn' && styles.textWarn,
        ]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[
          styles.tileValue,
          tone === 'danger' && styles.textDanger,
          tone === 'good' && styles.textGood,
          tone === 'warn' && styles.textWarn,
        ]}>
        {value}
      </Text>
      {hint ? (
        <Text
          style={[
            styles.tileHint,
            tone === 'danger' && styles.textDanger,
            tone === 'good' && styles.textGood,
          ]}>
          {hint}
        </Text>
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 168, gap: 16 },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  },
  heroCopy: { flex: 1, paddingRight: 4 },
  greeting: {
    marginTop: 8,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: palette.gold,
    letterSpacing: -0.6,
  },
  brand: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: palette.brand,
    letterSpacing: -1.2,
  },
  spaceLabel: {
    marginTop: 2,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.brandMuted,
  },
  heroAside: {
    alignItems: 'center',
    gap: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
    color: palette.white,
  },
  dashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  positionCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  positionTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  positionStat: {
    flex: 1,
  },
  positionLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkMuted,
  },
  positionValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: palette.ink,
  },
  availableHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  availableTodayTotal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
    maxWidth: '46%',
    textAlign: 'right',
  },
  availableTodayList: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 14,
  },
  pocketGroup: {
    gap: 8,
  },
  pocketGroupTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkSoft,
  },
  positionHint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: palette.inkSoft,
    lineHeight: 16,
  },
  tile: {
    width: '48%',
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tileLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tileValue: {
    marginTop: 6,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  tileHint: {
    marginTop: 6,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: palette.inkMuted,
    lineHeight: 14,
  },
  infoRoot: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
  },
  infoCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
  },
  infoEyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.inkSoft,
  },
  infoTitle: {
    marginTop: 6,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: palette.ink,
    letterSpacing: -0.3,
  },
  infoBody: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkMuted,
  },
  availableBreakdown: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 14,
  },
  availableBreakdownTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: palette.inkSoft,
    marginBottom: 2,
  },
  availableBreakdownTitleGap: {
    marginTop: 12,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  availableRowLabel: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: palette.ink,
  },
  availableRowValue: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  availableRowTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  availableTotalLabel: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  availableTotalValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 18,
    color: palette.brand,
  },
  infoCompare: {
    marginTop: 10,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink,
  },
  infoBtn: {
    marginTop: 18,
    backgroundColor: palette.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  infoBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    color: palette.white,
  },
  todayList: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    color: palette.brand,
    marginBottom: 8,
  },
  attentionCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  warn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  danger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.4)',
  },
  good: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.35)',
  },
  info: {
    backgroundColor: palette.tealSoft,
    borderColor: 'rgba(46,196,182,0.35)',
  },
  attentionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    lineHeight: 20,
  },
  attentionDangerText: {
    color: palette.danger,
  },
  attentionMore: {
    marginTop: 4,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
    textDecorationLine: 'underline',
  },
  boxDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.4)',
  },
  boxWarn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  boxGood: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.35)',
  },
  textDanger: { color: palette.danger },
  textGood: { color: palette.success },
  textWarn: { color: palette.accentDeep },
});
