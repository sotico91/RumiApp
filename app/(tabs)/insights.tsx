import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AmountPrivacyToggle } from '@/src/components/AmountPrivacyToggle';
import { BrandScreen, ScreenHeader } from '@/src/components/ui';
import { colors, space } from '@/src/theme';
import { CategoryBreakdown } from '@/src/components/CategoryBreakdown';
import { CollapsibleSection } from '@/src/components/CollapsibleSection';
import { HowToGuideButton } from '@/src/components/HowToGuideButton';
import { MoneyText } from '@/src/components/MoneyText';
import { PeriodToggle } from '@/src/components/PeriodToggle';
import { PocketBreakdown } from '@/src/components/PocketBreakdown';
import { SavingsDecor } from '@/src/components/SavingsDecor';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { palette, radii } from '@/src/theme/colors';
import type { Period } from '@/src/types/finance';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';
import { spendByPocket } from '@/src/utils/pockets';
import {
  answerFinanceQuery,
  buildSearchSuggestions,
  buildSmartInsights,
} from '@/src/utils/smartInsights';
import { toneFromBudgetRatio } from '@/src/utils/signalTone';

export default function InsightsScreen() {
  const { t, language } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const { insightsForPeriod, totalForPeriod, transactions, transactionsForPeriod, budgetStatus, debts, availableCash, accounts } =
    useFinance();
  const [period, setPeriod] = useState<Period>('mes');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [pocketsOpen, setPocketsOpen] = useState(true);
  const [smartOpen, setSmartOpen] = useState(true);

  const insights = insightsForPeriod(period);
  const total = totalForPeriod(period, 'expense');
  const top = insights[0];
  const periodLabel = t(`period.${period}` as TranslationKey);
  const searchPlaceholder = t('insights.searchPlaceholder');
  const smart = buildSmartInsights(transactions, t, format, spendConcepts, period, debts);
  const topBudget = top
    ? budgetStatus.find((b) => b.categoryId === top.categoryId)
    : undefined;
  const topTone = topBudget
    ? toneFromBudgetRatio(topBudget.ratio)
    : top && top.percent >= 35
      ? 'danger'
      : 'neutral';

  const debtTotal = debts.reduce((s, d) => s + d.balance, 0);
  const suggestions = useMemo(
    () =>
      buildSearchSuggestions(
        spendConcepts,
        language === 'es' ? 'es' : 'en',
        period,
        { transactions, debts }
      ),
    [spendConcepts, language, period, transactions, debts]
  );

  const pocketSpend = useMemo(
    () => spendByPocket(transactionsForPeriod(period, 'mine'), accounts, t),
    [period, transactionsForPeriod, accounts, t]
  );

  function ask(nextQuery?: string) {
    const q = (nextQuery ?? query).trim();
    if (nextQuery != null) {
      setQuery(nextQuery);
      setActiveSuggestion(nextQuery);
    } else {
      setActiveSuggestion(suggestions.includes(q) ? q : null);
    }
    setAnswer(
      answerFinanceQuery(q, transactions, format, t, {
        defaultPeriod: period,
        debtsTotal: debtTotal,
        debts,
        availableCash,
        spendConcepts,
        budgetStatus,
        language: language === 'es' ? 'es' : 'en',
        accounts,
        currency: settings.currency,
      })
    );
  }

  function clearAsk() {
    setQuery('');
    setAnswer('');
    setActiveSuggestion(null);
  }

  return (
    <BrandScreen
      gap={space.md}
      header={
        <>
          <ScreenHeader
            title={t('insights.title')}
            subtitle={t('insights.subtitle')}
            actions={
              <View style={styles.heroActions}>
                <HowToGuideButton light />
                <AmountPrivacyToggle />
                <SavingsDecor size="md" />
              </View>
            }
          />
          <PeriodToggle value={period} onChange={setPeriod} />
        </>
      }>
      <View>
        <Text style={styles.searchTitle}>{t('insights.searchTitle')}</Text>
        <Text style={styles.searchHint}>{t('insights.searchHint')}</Text>
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (activeSuggestion && text !== activeSuggestion) {
              setActiveSuggestion(null);
            }
          }}
          placeholder={searchPlaceholder}
          placeholderTextColor={palette.inkSoft}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => ask()}
        />
        <View style={styles.searchActions}>
          <Pressable
            accessibilityRole="button"
            style={styles.searchBtn}
            onPress={() => {
              tapFeedback();
              ask();
            }}>
            <Text style={styles.searchBtnText}>{t('insights.searchAsk')}</Text>
          </Pressable>
          {query || answer ? (
            <Pressable
              accessibilityRole="button"
              style={styles.clearBtn}
              onPress={() => {
                tapFeedback();
                clearAsk();
              }}>
              <Text style={styles.clearBtnText}>{t('insights.searchClear')}</Text>
            </Pressable>
          ) : null}
        </View>

        {answer ? (
          <View style={styles.answerCard}>
            <Text style={styles.answerEyebrow}>{t('insights.searchAnswer')}</Text>
            {query.trim() ? (
              <Text style={styles.answerQuestion} numberOfLines={3}>
                {query.trim()}
              </Text>
            ) : null}
            <Text style={styles.answerBody}>{answer}</Text>
          </View>
        ) : null}

        <Text style={[styles.suggestLabel, answer ? styles.suggestLabelDim : null]}>
          {t('insights.searchSuggestions')}
        </Text>
        <View style={styles.suggestRow}>
          {suggestions.map((prompt) => {
            const selected = activeSuggestion === prompt;
            return (
              <Pressable
                accessibilityRole="button"
                key={prompt}
                onPress={() => {
                  tapFeedback();
                  ask(prompt);
                }}
                style={[
                  styles.suggestChip,
                  answer && !selected ? styles.suggestChipDim : null,
                  selected ? styles.suggestChipActive : null,
                ]}>
                <Text
                  style={[
                    styles.suggestText,
                    selected ? styles.suggestTextActive : null,
                  ]}
                  numberOfLines={2}>
                  {prompt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <CollapsibleSection
          title={t('insights.smartTitle')}
          open={smartOpen}
          onToggle={() => setSmartOpen((v) => !v)}
          summary={smart[0]?.text ?? t('insights.smartCollapsed', { count: smart.length })}>
          <Text style={styles.smartHint}>{t('insights.smartHint')}</Text>
          {smart.map((card) => (
            <View
              key={card.id}
              style={[
                styles.smartCard,
                card.tone === 'warn' && styles.warn,
                card.tone === 'good' && styles.good,
                card.tone === 'info' && styles.info,
              ]}>
              <Text
                style={[
                  styles.smartText,
                  card.tone === 'warn' && styles.textWarn,
                  card.tone === 'good' && styles.textGood,
                ]}>
                {card.text}
              </Text>
            </View>
          ))}
        </CollapsibleSection>
      </View>

      <View>
        <Text style={styles.headline}>
          {periodLabel}
          {'\n'}
          <MoneyText style={styles.headlineAmount}>{format(total)}</MoneyText>
        </Text>
        {top ? (
          <View
            style={[
              styles.highlight,
              topTone === 'danger' && styles.highlightDanger,
              topTone === 'warn' && styles.highlightWarn,
              topTone === 'good' && styles.highlightGood,
            ]}>
            <Text
              style={[
                styles.highlightLabel,
                topTone === 'danger' && styles.textDanger,
                topTone === 'good' && styles.textGood,
              ]}>
              {t('insights.topCategory')}
            </Text>
            <Text
              style={[
                styles.highlightText,
                topTone === 'danger' && styles.textDanger,
                topTone === 'good' && styles.textGood,
              ]}>
              {t('insights.topValue', {
                amount: format(top.total),
                category: categoryLabel(top.categoryId, t, spendConcepts),
              })}
            </Text>
            <Text
              style={[
                styles.highlightHint,
                topTone === 'danger' && styles.textDanger,
                topTone === 'good' && styles.textGood,
              ]}>
              {topTone === 'danger' || topTone === 'warn'
                ? t('insights.topAlert')
                : topTone === 'good'
                  ? t('insights.topGood')
                  : t('insights.percentOfTotal', {
                      percent: Math.round(top.percent),
                    })}
            </Text>
          </View>
        ) : (
          <Text style={styles.empty}>{t('insights.empty')}</Text>
        )}
      </View>

      <View>
        <CollapsibleSection
          title={t('insights.ranking')}
          open={rankingOpen}
          onToggle={() => setRankingOpen((v) => !v)}
          summary={t('insights.rankingCollapsed', { count: insights.length })}>
          <CategoryBreakdown insights={insights} budgetStatus={budgetStatus} />
        </CollapsibleSection>
      </View>

      <View>
        <CollapsibleSection
          title={t('insights.pocketsTitle')}
          open={pocketsOpen}
          onToggle={() => setPocketsOpen((v) => !v)}
          summary={t('insights.pocketsCollapsed', { count: pocketSpend.length })}>
          <PocketBreakdown pockets={pocketSpend} />
        </CollapsibleSection>
      </View>
    </BrandScreen>
  );
}

const styles = StyleSheet.create({
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: colors.text.primary,
  },
  searchHint: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  searchInput: {
    marginTop: 8,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    color: palette.ink,
  },
  searchBtn: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
  },
  searchActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: colors.text.secondary,
  },
  answerCard: {
    marginTop: 14,
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 2,
    borderColor: palette.accent,
    shadowColor: '#1B3A4B',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  answerEyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.accentDeep,
  },
  answerQuestion: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
    lineHeight: 18,
  },
  answerBody: {
    marginTop: 10,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: palette.ink,
    lineHeight: 28,
  },
  suggestLabel: {
    marginTop: 14,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestLabelDim: {
    opacity: 0.75,
  },
  suggestRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    maxWidth: '100%',
    backgroundColor: colors.bg.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  suggestChipDim: {
    opacity: 0.55,
  },
  suggestChipActive: {
    opacity: 1,
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
    borderWidth: 1.5,
  },
  suggestText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.text.primary,
  },
  suggestTextActive: {
    color: palette.accentDeep,
    fontFamily: 'DMSans_600SemiBold',
  },
  smartHint: {
    marginBottom: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  smartCard: {
    backgroundColor: palette.surfaceSolid,
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
  good: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.35)',
  },
  info: {
    backgroundColor: palette.tealSoft,
    borderColor: 'rgba(46,196,182,0.35)',
  },
  smartText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: palette.ink,
    lineHeight: 20,
  },
  headline: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: colors.text.secondary,
  },
  headlineAmount: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    color: colors.text.primary,
  },
  highlight: {
    marginTop: 10,
    backgroundColor: palette.accentSoft,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.25)',
  },
  highlightDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.4)',
  },
  highlightWarn: {
    backgroundColor: palette.warnSoft,
    borderColor: 'rgba(255,107,74,0.35)',
  },
  highlightGood: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.35)',
  },
  highlightLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: palette.accentDeep,
    textTransform: 'uppercase',
  },
  highlightText: {
    marginTop: 6,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: palette.ink,
  },
  highlightHint: {
    marginTop: 8,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: palette.inkMuted,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: colors.text.secondary,
  },
  textDanger: { color: palette.danger },
  textGood: { color: palette.success },
  textWarn: { color: palette.accentDeep },
});
