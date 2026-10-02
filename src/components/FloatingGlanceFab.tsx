import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { PocketFlowList } from '@/src/components/PocketFlowList';
import { useFinance } from '@/src/hooks/useFinance';
import { useKeyboardVisible } from '@/src/hooks/useKeyboardVisible';
import { useMoney } from '@/src/hooks/useMoney';
import { useSettings } from '@/src/hooks/useSettings';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';
import { categoryLabel } from '@/src/utils/categoryLabel';
import { tapFeedback } from '@/src/utils/selectFeedback';

export function FloatingGlanceFab() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { format } = useMoney();
  const { settings } = useSettings();
  const spendConcepts = settings.spendConcepts ?? [];
  const {
    insightsForPeriod,
    totalForPeriod,
    budgetStatus,
  } = useFinance();
  const [open, setOpen] = useState(false);
  const keyboardVisible = useKeyboardVisible();

  const concepts = useMemo(() => insightsForPeriod('mes', 'expense'), [insightsForPeriod]);
  const expenses = totalForPeriod('mes', 'expense');
  const income = totalForPeriod('mes', 'income');
  const savings = income - expenses;
  const alerts = budgetStatus.filter((b) => b.ratio > 1 && b.spent > 0 && b.limit > 0).length;

  return (
    <>
      {keyboardVisible ? null : (
      <Animated.View
        entering={ZoomIn.springify()}
        style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 12) + 78 }]}>
        <Pressable
          onPress={() => {
            tapFeedback();
            setOpen(true);
          }}
          style={styles.fab}
          accessibilityLabel={t('fab.open')}>
          <Text style={styles.fabGlyph}>◎</Text>
        </Pressable>
      </Animated.View>
      )}

      <AppModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <Animated.View
            entering={FadeInDown.springify()}
            style={[styles.panel, { marginBottom: Math.max(insets.bottom, 12) + 90 }]}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelEyebrow}>{t('fab.eyebrow')}</Text>
                <Text style={styles.panelTitle}>{t('fab.title')}</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.kpiRow}>
              <Kpi label={t('home.income')} value={format(income)} tone="good" />
              <Kpi label={t('home.expenses')} value={format(expenses)} tone="danger" />
              <Kpi
                label={t('home.savings')}
                value={format(savings)}
                tone={savings >= 0 ? 'good' : 'danger'}
              />
            </View>

            <Text style={styles.section}>{t('fab.whereTitle')}</Text>
            <Text style={styles.sectionHint}>{t('fab.whereHint')}</Text>
            <View style={styles.pocketBlock}>
              <PocketFlowList />
            </View>

            {alerts > 0 ? (
              <Text style={styles.alertLine}>
                {t('fab.budgetAlerts', { count: alerts })}
              </Text>
            ) : null}

            <Text style={styles.section}>{t('fab.byConcept')}</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {concepts.length === 0 ? (
                <Text style={styles.empty}>{t('fab.emptyConcepts')}</Text>
              ) : (
                concepts.map((item) => {
                  const budget = budgetStatus.find(
                    (b) => b.categoryId === item.categoryId
                  );
                  const over = budget && budget.ratio > 1;
                  const near = budget && budget.ratio >= 0.8 && budget.ratio <= 1;
                  // High share of this month's spending also deserves attention.
                  const heavyShare = item.percent >= 30;
                  return (
                    <View
                      key={item.categoryId}
                      style={[
                        styles.conceptRow,
                        over && styles.conceptDanger,
                        !over && (near || heavyShare) && styles.conceptWarn,
                      ]}>
                      <View style={styles.conceptLeft}>
                        <View
                          style={[styles.swatch, { backgroundColor: item.color }]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.conceptName}>
                            {categoryLabel(item.categoryId, t, spendConcepts)}
                          </Text>
                          <Text style={styles.conceptMeta}>
                            {t('insights.percentOfTotalShort', {
                              percent: Math.round(item.percent),
                            })}
                            {' · '}
                            {item.count}{' '}
                            {item.count === 1
                              ? t('insights.expense')
                              : t('insights.expenses')}
                          </Text>
                          {over ? (
                            <Text style={styles.attentionBadge}>
                              {t('insights.overBudget')}
                            </Text>
                          ) : heavyShare ? (
                            <Text style={styles.attentionBadgeWarn}>
                              {t('fab.heavyShare')}
                            </Text>
                          ) : near ? (
                            <Text style={styles.attentionBadgeWarn}>
                              {t('insights.nearBudget')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.conceptAmount,
                          over && styles.textDanger,
                        ]}>
                        {format(item.total)}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                style={styles.primary}
                onPress={() => {
                  setOpen(false);
                  router.push('/agregar');
                }}>
                <Text style={styles.primaryText}>{t('fab.add')}</Text>
              </Pressable>
            </View>
            <Text style={styles.footnote}>{t('fab.footnote')}</Text>
          </Animated.View>
        </View>
      </AppModal>
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'danger' | 'neutral';
}) {
  return (
    <View
      style={[
        styles.kpi,
        tone === 'good' && styles.kpiGood,
        tone === 'danger' && styles.kpiDanger,
      ]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[
          styles.kpiValue,
          tone === 'good' && styles.textGood,
          tone === 'danger' && styles.textDanger,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 18,
    zIndex: 40,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fabGlyph: {
    fontSize: 22,
    color: palette.white,
    fontFamily: 'Fraunces_700Bold',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,20,28,0.55)',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
  },
  panel: {
    backgroundColor: palette.surfaceSolid,
    borderRadius: radii.xl,
    padding: 18,
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: palette.border,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  panelEyebrow: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelTitle: {
    marginTop: 2,
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: palette.ink,
  },
  close: {
    fontSize: 18,
    color: palette.inkMuted,
    padding: 4,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  kpi: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  kpiGood: {
    backgroundColor: palette.successSoft,
    borderColor: 'rgba(31,157,108,0.3)',
  },
  kpiDanger: {
    backgroundColor: palette.dangerSoft,
    borderColor: 'rgba(214,69,69,0.3)',
  },
  kpiLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: palette.inkSoft,
    textTransform: 'uppercase',
  },
  kpiValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  alertLine: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: palette.danger,
    marginBottom: 8,
  },
  section: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: palette.inkMuted,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: palette.inkSoft,
    lineHeight: 15,
    marginBottom: 8,
  },
  pocketBlock: {
    marginBottom: 12,
  },
  list: {
    maxHeight: 220,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: palette.inkSoft,
    paddingVertical: 12,
  },
  conceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#F7FAFC',
  },
  conceptDanger: {
    backgroundColor: palette.dangerSoft,
  },
  conceptWarn: {
    backgroundColor: palette.warnSoft,
  },
  conceptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  conceptName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: palette.ink,
  },
  conceptMeta: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: palette.inkSoft,
    marginTop: 2,
  },
  attentionBadge: {
    marginTop: 4,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    color: palette.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  attentionBadgeWarn: {
    marginTop: 4,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 10,
    color: palette.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  conceptAmount: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 15,
    color: palette.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primary: {
    flex: 1.2,
    backgroundColor: palette.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'DMSans_600SemiBold',
    color: palette.white,
    fontSize: 13,
  },
  footnote: {
    marginTop: 10,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: palette.inkSoft,
    lineHeight: 15,
  },
  textGood: { color: palette.success },
  textDanger: { color: palette.danger },
});
