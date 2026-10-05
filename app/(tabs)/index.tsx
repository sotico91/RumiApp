import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ADD_FAB_OFFSET, ADD_FAB_SIZE, AddFab } from '@/src/components/AddFab';
import { AmountPrivacyToggle } from '@/src/components/AmountPrivacyToggle';
import { AppModal } from '@/src/components/AppModal';
import { AntSpendTipCard } from '@/src/components/AntSpendTipCard';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { ConceptGlanceSheet } from '@/src/components/ConceptGlanceSheet';
import { HabitPilotCard } from '@/src/components/HabitPilotCard';
import { HowToGuideButton } from '@/src/components/HowToGuideButton';
import { MoneyText } from '@/src/components/MoneyText';
import { PredictedSpendsCard } from '@/src/components/PredictedSpendsCard';
import { ProfileMenuButton } from '@/src/components/ProfileMenuButton';
import { QuickAddBar } from '@/src/components/QuickAddBar';
import { PocketFlowList } from '@/src/components/PocketFlowList';
import { RaisedText } from '@/src/components/RaisedText';
import { SavingsDecor } from '@/src/components/SavingsDecor';
import { SelectPressable } from '@/src/components/SelectPressable';
import { AppText, BrandScreen, Button, Card } from '@/src/components/ui';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { colors, radius, scale, shadow, space, type } from '@/src/theme';
import { projectMonth } from '@/src/utils/projection';
import { categoryLabel } from '@/src/utils/categoryLabel';
import {
  antTipWeekKey,
  pickAntSpendTip,
} from '@/src/utils/antSpendTips';
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
    transactions,
    loading,
    availableCash,
    debts,
    budgetStatus,
    predictedThisMonth,
  } = useFinance();
  const [glance, setGlance] = useState<'expense' | 'income' | null>(null);
  const [moneyInfo, setMoneyInfo] = useState<MoneyInfoKind | null>(null);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [predictOpen, setPredictOpen] = useState(false);

  const displayName = settings.userName.trim();
  const greeting = displayName
    ? t('home.greeting', { name: displayName })
    : t('home.greetingFallback');
  const spaceLabel = displayName
    ? t('home.spaceLabel', { name: displayName })
    : t('home.yours');

  const income = totalForPeriod('mes', 'income');
  const expenses = totalForPeriod('mes', 'expense');
  const savings = income - expenses;
  const spendConcepts = settings.spendConcepts ?? [];
  // Where the month is heading (fixed bills once + day-to-day pace), shown once it means something.
  const pace = useMemo(
    () => projectMonth(transactions, debts, new Date(), spendConcepts),
    [transactions, debts, spendConcepts]
  );
  const paceHint =
    !loading && !pace.early && pace.income > 0
      ? t(pace.projectedLeft >= 0 ? 'home.paceAhead' : 'home.paceBehind', {
          amount: format(Math.abs(pace.projectedLeft)),
        })
      : undefined;
  const expenseConcepts = insightsForPeriod('mes', 'expense');
  const incomeConcepts = insightsForPeriod('mes', 'income');
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
  // With no income logged yet, the month result is not "in the red": it is
  // just incomplete. Say so instead of colouring the first expense as a loss.
  const hasIncome = income > 0;
  const savingsTone = hasIncome ? toneFromSavings(savings) : 'neutral';
  const expenseLogs = transactions.filter((tx) => tx.type === 'expense');
  const showFirstExpense = !loading && expenseLogs.length === 0;
  const firstExpenseToday =
    expenseLogs.length === 1 &&
    new Date(expenseLogs[0].createdAt).toDateString() === new Date().toDateString();
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

  return (
    <BrandScreen
      header={
        <>
          <View style={styles.heroRow}>
            <View style={styles.heroCopy}>
              <RaisedText style={styles.brand}>{t('brand.name')}</RaisedText>
              <RaisedText tone="gold" style={styles.greeting}>
                {greeting}
              </RaisedText>
              <AppText variant="caption" color="onBrandMuted">
                {spaceLabel}
              </AppText>
            </View>
            <View style={styles.heroAside}>
              <View style={styles.avatarRow}>
                <HowToGuideButton light />
                <AmountPrivacyToggle />
                <ProfileMenuButton />
              </View>
              <SavingsDecor />
            </View>
          </View>

          <SelectPressable
            onPress={() => setMoneyInfo('available')}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.available')}: ${format(availableCash)}`}
            style={({ pressed }) => [styles.available, pressed && styles.pressed]}>
            <View style={styles.availableLabelRow}>
              <AppText variant="overline" color="onBrandMuted">
                {t('home.available')}
              </AppText>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.text.onBrandMuted}
              />
            </View>
            {loading ? (
              <View style={styles.amountSkeleton} />
            ) : (
              <MoneyText
                style={[
                  styles.availableAmount,
                  availableCash < 0 && { color: colors.text.onBrandDanger },
                ]}>
                {format(availableCash)}
              </MoneyText>
            )}
            <AppText variant="caption" color="onBrandMuted">
              {t('home.availableCaption')}
            </AppText>
          </SelectPressable>
        </>
      }
      bottomSpace={ADD_FAB_SIZE + ADD_FAB_OFFSET * 2}
      overlay={
        <>
          <AddFab />
          <ConceptGlanceSheet
            visible={glance != null}
            onClose={() => setGlance(null)}
            kind={glance ?? 'expense'}
            items={glance === 'income' ? incomeConcepts : expenseConcepts}
            total={glance === 'income' ? income : expenses}
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
                  { marginBottom: Math.max(insets.bottom, space.md) + space.xl },
                ]}>
                <AppText variant="overline" color="tertiary">
                  {t('home.moneyInfoEyebrow')}
                </AppText>
                <AppText variant="h2" style={styles.infoTitle}>
                  {t(
                    (moneyInfo === 'available'
                      ? 'home.available'
                      : 'home.savings') as TranslationKey
                  )}
                </AppText>
                <AppText color="secondary" style={styles.infoBody}>
                  {t(
                    (moneyInfo === 'available'
                      ? 'home.availableInfoBody'
                      : 'home.savingsInfoBody') as TranslationKey
                  )}
                </AppText>
                {moneyInfo === 'available' ? (
                  <View style={styles.availableBreakdown}>
                    <PocketFlowList />
                  </View>
                ) : null}
                <AppText variant="bodyStrong" style={styles.infoBody}>
                  {t(
                    (moneyInfo === 'available'
                      ? 'home.availableInfoCompare'
                      : 'home.savingsInfoCompare') as TranslationKey
                  )}
                </AppText>
                <Button
                  fullWidth
                  label={t('home.moneyInfoGotIt')}
                  onPress={() => setMoneyInfo(null)}
                  style={styles.infoBtn}
                />
              </View>
            </View>
          </AppModal>
        </>
      }>
      {showFirstExpense ? (
        <Card style={styles.firstCard}>
          <AppText variant="h2">{t('home.firstTitle')}</AppText>
          <AppText color="secondary" style={styles.firstBody}>
            {t('home.firstBody')}
          </AppText>
          <Button
            fullWidth
            label={t('home.firstCta')}
            onPress={() => router.push({ pathname: '/agregar', params: { mode: 'quick' } })}
            style={styles.firstCta}
          />
        </Card>
      ) : null}

      {firstExpenseToday ? (
        <Card variant="tinted" tone="success">
          <AppText variant="title">{t('home.firstDoneTitle')}</AppText>
          <AppText color="secondary" style={styles.firstBody}>
            {t('home.firstDoneBody')}
          </AppText>
        </Card>
      ) : null}

      <View>
        <AppText variant="overline" color="tertiary" style={styles.sectionLabel}>
          {t('decor.monthTitle')}
        </AppText>
        <View style={styles.metrics}>
          <View style={styles.metricsRow}>
            <MetricTile
              label={t('home.income')}
              value={format(income)}
              loading={loading}
              tone="good"
              onPress={() => setGlance('income')}
            />
            <MetricTile
              label={t('home.expenses')}
              value={format(expenses)}
              loading={loading}
              tone={expensesTone}
              onPress={() => setGlance('expense')}
            />
          </View>
          <MetricTile
            label={t('home.savings')}
            legend={t('home.savingsLegend')}
            value={format(savings)}
            loading={loading}
            tone={savingsTone}
            hint={
              paceHint ??
              (!hasIncome && expenses > 0
                ? t('home.savingsNoIncome')
                : savingsTone === 'good'
                  ? t('home.savingsGood')
                  : savingsTone === 'danger'
                    ? t('home.savingsBad')
                    : undefined)
            }
            onPress={() => setMoneyInfo('savings')}
          />
        </View>
      </View>

      <QuickAddBar />

      <HabitPilotCard />

      {antTip ? (
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
      ) : null}

      <CollapsibleSection
        tone="surface"
        title={t('home.attention')}
        open={attentionOpen}
        onToggle={() => setAttentionOpen((v) => !v)}
        summary={
          alerts.length === 0
            ? t('home.attentionEmptyShort')
            : t('home.attentionSummary', { count: alerts.length + alertsHidden })
        }>
        {alerts.length === 0 ? (
          <Card variant="tinted" tone="success" padding="sm">
            <AppText variant="bodyStrong">{t('home.attentionEmpty')}</AppText>
          </Card>
        ) : (
          <View style={styles.alertList}>
            {alerts.map((a) => (
              <Card key={a.categoryId} variant="tinted" tone="danger" padding="sm">
                <AppText variant="bodyStrong" style={styles.alertText}>
                  {t('insights.overBudget')}:{' '}
                  {categoryLabel(a.categoryId, t, spendConcepts)} (
                  {Math.round(a.ratio * 100)}%)
                </AppText>
              </Card>
            ))}
            {alertsHidden > 0 ? (
              <Button
                variant="tertiary"
                size="sm"
                label={t('home.attentionMore', { count: alertsHidden })}
                onPress={() => router.push('/(tabs)/plan')}
                style={styles.alertMore}
              />
            ) : null}
          </View>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        tone="surface"
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
    </BrandScreen>
  );
}

const TONE_COLOR: Record<SignalTone, string> = {
  good: colors.status.success,
  warn: colors.status.warning,
  danger: colors.status.danger,
  neutral: colors.text.primary,
};

function MetricTile({
  label,
  value,
  tone = 'neutral',
  hint,
  onPress,
  legend,
  loading = false,
}: {
  label: string;
  value: string;
  /** Show a placeholder bar instead of a zero that reads like real data. */
  loading?: boolean;
  tone?: SignalTone;
  hint?: string;
  onPress?: () => void;
  /** Short "what is this" on the right, with an info icon. */
  legend?: string;
}) {
  const toneColor = TONE_COLOR[tone];
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={loading ? label : `${label}: ${value}`}
      style={legend ? styles.metricWide : styles.metric}>
      <View style={legend ? styles.metricRow : undefined}>
        <View style={legend ? styles.metricMain : undefined}>
          <View style={styles.metricLabelRow}>
            <View
              style={[
                styles.metricDot,
                { backgroundColor: tone === 'neutral' ? colors.border.strong : toneColor },
              ]}
            />
            <AppText variant="overline" color="tertiary" numberOfLines={1}>
              {label}
            </AppText>
          </View>
          {loading ? (
            <View style={styles.metricSkeleton} />
          ) : (
            <MoneyText style={[styles.metricValue, { color: toneColor }]}>{value}</MoneyText>
          )}
          {hint && !loading ? (
            <AppText
              variant="caption"
              style={[styles.metricHint, tone !== 'neutral' && { color: toneColor }]}>
              {hint}
            </AppText>
          ) : null}
        </View>
        {legend ? (
          <View style={styles.metricLegend}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.text.tertiary}
            />
            <AppText variant="caption" color="secondary" align="right">
              {legend}
            </AppText>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.xs,
    alignItems: 'flex-start',
  },
  heroCopy: { flex: 1, paddingRight: space.xxs },
  brand: {
    ...type.h1,
    fontSize: 32,
    lineHeight: 38,
    color: colors.text.onBrand,
  },
  greeting: {
    ...type.h2,
    fontFamily: type.h1.fontFamily,
    fontSize: 24,
    lineHeight: 30,
    marginTop: space.xxs,
    color: colors.text.highlight,
  },
  heroAside: {
    alignItems: 'center',
    gap: space.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  available: {
    gap: space.xxs,
  },
  pressed: { opacity: 0.85 },
  availableLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
  },
  availableAmount: {
    ...type.display,
    color: colors.text.onBrand,
  },
  amountSkeleton: {
    width: 180,
    height: type.display.lineHeight,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  firstCard: {
    borderColor: colors.action.primarySoft,
  },
  firstBody: {
    marginTop: space.xs,
  },
  firstCta: {
    marginTop: space.md,
  },
  sectionLabel: {
    marginBottom: space.sm,
  },
  metrics: { gap: space.sm },
  metricsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  metric: { flex: 1 },
  metricWide: { alignSelf: 'stretch' },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  metricMain: { flex: 1 },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  metricValue: {
    ...type.h2,
    marginTop: space.xs,
    fontVariant: ['tabular-nums'],
  },
  metricSkeleton: {
    width: '70%',
    height: type.h2.lineHeight,
    marginTop: space.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.surfaceMuted,
  },
  metricHint: {
    marginTop: space.xxs,
    color: colors.text.secondary,
  },
  metricLegend: {
    width: '42%',
    alignItems: 'flex-end',
    gap: space.xxs,
  },
  alertList: { gap: space.xs },
  alertText: { color: colors.status.danger },
  alertMore: { alignSelf: 'flex-start' },
  infoRoot: {
    flex: 1,
    backgroundColor: colors.bg.scrim,
    justifyContent: 'flex-end',
    paddingHorizontal: space.md,
  },
  infoCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    ...shadow.e3,
  },
  infoTitle: {
    marginTop: space.xxs,
  },
  infoBody: {
    marginTop: space.sm,
  },
  availableBreakdown: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  infoBtn: {
    marginTop: space.lg,
  },
});
