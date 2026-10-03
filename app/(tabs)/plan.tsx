import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandScreen, ScreenHeader } from '@/src/components/ui';
import { space } from '@/src/theme';
import { AmountPrivacyToggle } from '@/src/components/AmountPrivacyToggle';
import { AppCopyright } from '@/src/components/AppCopyright';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { ConceptsPlanCard } from '@/src/components/ConceptsPlanCard';
import { HowToGuideButton } from '@/src/components/HowToGuideButton';
import { MoneyText } from '@/src/components/MoneyText';
import { ReminderSettingsCard } from '@/src/components/ReminderSettingsCard';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { isGeneralSubName } from '@/src/data/spendConcepts';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { groupBySpendConcept } from '@/src/utils/conceptGroups';
import { toneFromBudgetRatio } from '@/src/utils/signalTone';
import type { SpendConcept, SpendSub } from '@/src/types/settings';

export default function PlanScreen() {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const { budgetStatus, antForPeriod } = useFinance();
  const ant = antForPeriod('mes');
  const spendConcepts = settings.spendConcepts ?? [];
  const needsSubSetup =
    spendConcepts.length > 0 &&
    spendConcepts.every(
      (c) => c.subs.length === 1 && isGeneralSubName(c.subs[0].name)
    );
  const [conceptsOpen, setConceptsOpen] = useState(needsSubSetup);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [budgetsOpen, setBudgetsOpen] = useState(false);
  const [antOpen, setAntOpen] = useState(false);

  const activeBudgets = budgetStatus.filter((b) => b.limit > 0);
  const reminderCount = (settings.reminderRules ?? []).length;
  const markedAntSubs = spendConcepts.flatMap((c) =>
    c.subs.filter((s) => s.isAnt).map((s) => ({ concept: c.name, sub: s.name, id: s.id }))
  );
  const budgetGroups = groupBySpendConcept(activeBudgets, (b) => b.categoryId, spendConcepts);
  // Every marked small spend, with this month's amount (0 when nothing logged yet).
  const antAmounts = new Map(ant.items.map((item) => [item.categoryId, item.amount]));
  const antIds = [
    ...markedAntSubs.map((m) => m.id),
    ...ant.items.map((item) => item.categoryId).filter((id) => !markedAntSubs.some((m) => m.id === id)),
  ];
  const antGroups = groupBySpendConcept(antIds, (id) => id, spendConcepts);

  /** Row title under a category header: just the subcategory. */
  function rowLabel(id: string, sub: SpendSub | null, inConcept: boolean): string {
    if (sub) return sub.name;
    return inConcept ? t('plan.wholeCategory') : categoryLabel(id, t, spendConcepts);
  }

  return (
    <BrandScreen
      gap={space.md}
      header={
        <>
          <ScreenHeader
            title={t('plan.title')}
            subtitle={t('plan.subtitle')}
            actions={
              <>
                <HowToGuideButton light />
                <AmountPrivacyToggle />
              </>
            }
          />
        </>
      }>
      <View>
        <CollapsibleSection
          title={t('plan.concepts')}
          open={conceptsOpen}
          onToggle={() => setConceptsOpen((v) => !v)}
          summary={t('plan.conceptsCollapsed', { count: spendConcepts.length })}>
          <ConceptsPlanCard />
        </CollapsibleSection>
      </View>

      <View>
        <CollapsibleSection
          title={t('reminder.title')}
          open={remindersOpen}
          onToggle={() => setRemindersOpen((v) => !v)}
          summary={t('reminder.collapsed', { count: reminderCount })}>
          <ReminderSettingsCard />
        </CollapsibleSection>
      </View>

      {activeBudgets.length > 0 ? (
        <View>
          <CollapsibleSection
            title={t('plan.budgets')}
            open={budgetsOpen}
            onToggle={() => setBudgetsOpen((v) => !v)}
            summary={t('plan.budgetsCollapsed', { count: activeBudgets.length })}>
            <View style={styles.groups}>
              {budgetGroups.map((group) => {
                const spent = group.rows.reduce((sum, r) => sum + r.item.spent, 0);
                const limit = group.rows.reduce((sum, r) => sum + r.item.limit, 0);
                return (
                  <View key={group.concept?.id ?? 'other'} style={styles.listCard}>
                    <GroupHeader
                      concept={group.concept}
                      fallback={t('plan.otherGroup')}
                      meta={`${format(spent)} / ${format(limit)}`}
                    />
                    {group.rows.map(({ item: b, sub }, index) => {
                      const tone = toneFromBudgetRatio(b.ratio);
                      const over = b.remaining < 0;
                      const pct = Math.min(Math.round(b.ratio * 100), 999);
                      return (
                        <View
                          key={b.categoryId}
                          style={[
                            styles.row,
                            index < group.rows.length - 1 && styles.rowDivider,
                          ]}>
                          <View style={styles.rowTop}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {rowLabel(b.categoryId, sub, !!group.concept)}
                            </Text>
                            <Text
                              style={[
                                styles.rowPct,
                                tone === 'danger' && styles.textDanger,
                                tone === 'warn' && styles.textWarn,
                                tone === 'good' && styles.textGood,
                              ]}>
                              {pct}%
                            </Text>
                          </View>
                          <View style={styles.track}>
                            <View
                              style={[
                                styles.fill,
                                {
                                  width: `${Math.min(b.ratio * 100, 100)}%`,
                                  backgroundColor:
                                    tone === 'danger'
                                      ? palette.danger
                                      : tone === 'warn'
                                        ? palette.accent
                                        : tone === 'good'
                                          ? palette.success
                                          : palette.teal,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.rowMeta}>
                            {format(b.spent)} / {format(b.limit)}
                            {' · '}
                            {over
                              ? t('plan.over', { amount: format(Math.abs(b.remaining)) })
                              : t('plan.left', { amount: format(b.remaining) })}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </CollapsibleSection>
        </View>
      ) : null}

      <View>
        <CollapsibleSection
          title={t('plan.antTitle')}
          open={antOpen}
          onToggle={() => setAntOpen((v) => !v)}
          summary={t('plan.antCollapsed', { amount: format(ant.total) })}>
          <View style={styles.groups}>
            <View style={styles.listCard}>
              <Text style={styles.antHint}>{t('plan.antHint')}</Text>
              <View style={styles.antHeader}>
                <Text style={styles.rowTitle}>{t('home.antTotal')}</Text>
                <MoneyText style={styles.antTotal}>{format(ant.total)}</MoneyText>
              </View>
              {markedAntSubs.length === 0 ? (
                <Text style={styles.empty}>{t('plan.antMarkNone')}</Text>
              ) : ant.items.length === 0 ? (
                <Text style={styles.empty}>{t('plan.antEmpty')}</Text>
              ) : null}
            </View>
            {antGroups.map((group) => {
              const subtotal = group.rows.reduce(
                (sum, r) => sum + (antAmounts.get(r.item) ?? 0),
                0
              );
              return (
                <View key={group.concept?.id ?? 'other'} style={styles.listCard}>
                  <GroupHeader
                    concept={group.concept}
                    fallback={t('plan.otherGroup')}
                    meta={format(subtotal)}
                  />
                  {group.rows.map(({ item: id, sub }, index) => {
                    const amount = antAmounts.get(id) ?? 0;
                    return (
                      <View
                        key={id}
                        style={[
                          styles.antRow,
                          index < group.rows.length - 1 && styles.rowDivider,
                        ]}>
                        <Text style={styles.antName} numberOfLines={1}>
                          🐜 {rowLabel(id, sub, !!group.concept)}
                        </Text>
                        <MoneyText style={[styles.antAmount, amount === 0 && styles.antZero]}>
                          {format(amount)}
                        </MoneyText>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </CollapsibleSection>
      </View>

      <View>
        <AppCopyright />
      </View>
    </BrandScreen>
  );
}

/** Category name with its icon, and a total on the right. */
function GroupHeader({
  concept,
  fallback,
  meta,
}: {
  concept: SpendConcept | null;
  fallback: string;
  meta: string;
}) {
  return (
    <View style={styles.groupHeader}>
      {concept ? (
        <ConceptIcon icon={concept.icon} color={concept.color} size={14} variant="bubble" />
      ) : null}
      <Text style={styles.groupTitle} numberOfLines={1}>
        {concept?.name ?? fallback}
      </Text>
      <MoneyText style={styles.groupMeta}>{meta}</MoneyText>
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { gap: space.sm },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingBottom: space.xs,
    marginBottom: space.xxs,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  groupTitle: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 17,
    color: palette.ink,
  },
  groupMeta: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  antName: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
  },
  antZero: {
    color: palette.inkSoft,
  },
  listCard: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  row: { paddingVertical: 10 },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  rowPct: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
  },
  track: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF1',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  rowMeta: {
    marginTop: 6,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
  },
  antHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  antHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  antTotal: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
  },
  antRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  antAmount: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 4,
  },
  textDanger: { color: palette.danger },
  textWarn: { color: palette.accentDeep },
  textGood: { color: palette.success },
});
