import { StyleSheet, Text, View } from 'react-native';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { categoryVisual, findSpendSub } from '@/src/data/spendConcepts';
import { MoneyText } from '@/src/components/MoneyText';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import {
  toneFromBudgetRatio,
  type SignalTone,
} from '@/src/utils/signalTone';

type Insight = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  percent: number;
  count: number;
};

type BudgetHint = {
  categoryId: string;
  ratio: number;
  remaining: number;
  limit?: number;
  spent?: number;
};

type Props = {
  insights: Insight[];
  emptyLabel?: string;
  budgetStatus?: BudgetHint[];
};

export function CategoryBreakdown({ insights, emptyLabel, budgetStatus }: Props) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];

  if (insights.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.empty}>{emptyLabel ?? t('insights.emptyPeriod')}</Text>
      </View>
    );
  }

  const maxCount = Math.max(...insights.map((i) => i.count), 0);
  const mostFrequentId =
    maxCount >= 3
      ? insights.find((i) => i.count === maxCount)?.categoryId
      : undefined;

  const budgetMap = new Map(
    (budgetStatus ?? []).map((b) => [b.categoryId, b] as const)
  );

  function budgetFor(item: Insight) {
    const direct = budgetMap.get(item.categoryId);
    if (direct) return direct;
    let worst: BudgetHint | undefined;
    for (const b of budgetStatus ?? []) {
      const hit = findSpendSub(spendConcepts, b.categoryId);
      if (hit?.concept.id !== item.categoryId) continue;
      if (!worst || b.ratio > worst.ratio) worst = b;
    }
    return worst;
  }

  return (
    <View style={styles.list}>
      {insights.map((item, index) => {
        const budget = budgetFor(item);
        const budgetTone = budget ? toneFromBudgetRatio(budget.ratio) : 'neutral';
        const isTopSpend = index === 0 && item.percent >= 30;
        const isMostFrequent = item.categoryId === mostFrequentId;
        const tone: SignalTone =
          budgetTone === 'danger' || budgetTone === 'warn'
            ? budgetTone
            : isMostFrequent || isTopSpend
              ? 'danger'
              : budgetTone === 'good'
                ? 'good'
                : 'neutral';

        return (
          <View
            key={item.categoryId}
            style={[
              styles.item,
              tone === 'danger' && styles.itemDanger,
              tone === 'warn' && styles.itemWarn,
              tone === 'good' && styles.itemGood,
            ]}>
            <View style={styles.header}>
              <View style={styles.nameRow}>
                <ConceptIcon
                  icon={categoryVisual(item.categoryId, spendConcepts).icon}
                  color={
                    tone === 'danger'
                      ? palette.danger
                      : tone === 'good'
                        ? palette.success
                        : item.color
                  }
                  size={18}
                />
                <Text
                  style={[
                    styles.name,
                    tone === 'danger' && styles.textDanger,
                    tone === 'good' && styles.textGood,
                  ]}>
                  {categoryLabel(item.categoryId, t, spendConcepts)}
                </Text>
              </View>
              <MoneyText
                style={[
                  styles.total,
                  tone === 'danger' && styles.textDanger,
                  tone === 'good' && styles.textGood,
                ]}>
                {format(item.total)}
              </MoneyText>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    backgroundColor:
                      tone === 'danger'
                        ? palette.danger
                        : tone === 'warn'
                          ? palette.accent
                          : tone === 'good'
                            ? palette.success
                            : item.color,
                    width: `${Math.max(Math.min(item.percent, 100), 6)}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.meta}>
              {t('insights.percentOfTotalShort', { percent: Math.round(item.percent) })}
              {' · '}
              {item.count}{' '}
              {item.count === 1 ? t('insights.expense') : t('insights.expenses')}
              {budget
                ? ` · ${t('insights.topeMeta', {
                    spent: format(budget.spent ?? item.total),
                    limit: format(budget.limit ?? 0),
                  })}`
                : ''}
            </Text>
            {isMostFrequent ? (
              <Text style={styles.badgeDanger}>{t('insights.mostFrequent')}</Text>
            ) : null}
            {budgetTone === 'danger' ? (
              <Text style={styles.badgeDanger}>{t('insights.overBudget')}</Text>
            ) : null}
            {budgetTone === 'warn' && !isMostFrequent ? (
              <Text style={styles.badgeWarn}>{t('insights.nearBudget')}</Text>
            ) : null}
            {budgetTone === 'good' && !isTopSpend && !isMostFrequent ? (
              <Text style={styles.badgeGood}>{t('insights.underBudget')}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    shadowColor: palette.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  item: {
    gap: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: palette.border,
  },
  itemDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.35)',
  },
  itemWarn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  itemGood: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  name: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: palette.ink,
    flexShrink: 1,
  },
  total: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.ink,
  },
  textDanger: { color: palette.danger },
  textGood: { color: palette.success },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,28,36,0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
  },
  badgeDanger: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeWarn: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeGood: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.success,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyWrap: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 20,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: palette.inkMuted,
    lineHeight: 22,
  },
});
