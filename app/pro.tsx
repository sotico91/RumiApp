import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appAlert } from '@/src/components/AppAlert';
import { AppText, Button } from '@/src/components/ui';
import { usePro } from '@/src/hooks/usePro';
import { useLanguage } from '@/src/i18n/LanguageContext';
import type { TranslationKey } from '@/src/i18n/translations';
import { colors, radius, space } from '@/src/theme';
import { FREE_ASKS_PER_MONTH, FREE_BUDGETS, FREE_GOALS, FREE_REMINDERS, annualSavingPercent, type ProFeature } from '@/src/utils/pro';

const SITE = 'https://sotico91.github.io/RumiApp/';

const REASON: Record<ProFeature, TranslationKey> = {
  ask: 'pro.reasonAsk',
  budgets: 'pro.reasonBudgets',
  reminders: 'pro.reasonReminders',
  goals: 'pro.reasonGoals',
  debtPlan: 'pro.reasonDebtPlan',
  afford: 'pro.reasonAfford',
  advisor: 'pro.reasonAdvisor',
  export: 'pro.reasonExport',
};

const BENEFITS: { icon: keyof typeof MaterialCommunityIcons.glyphMap; key: TranslationKey }[] = [
  { icon: 'chat-question-outline', key: 'pro.benefitAsk' },
  { icon: 'target', key: 'pro.benefitBudgets' },
  { icon: 'bell-ring-outline', key: 'pro.benefitReminders' },
  { icon: 'piggy-bank-outline', key: 'pro.benefitGoals' },
  { icon: 'flag-checkered', key: 'pro.benefitDebtPlan' },
  { icon: 'scale-balance', key: 'pro.benefitAfford' },
  { icon: 'calendar-clock', key: 'pro.benefitAdvisor' },
  { icon: 'microsoft-excel', key: 'pro.benefitExport' },
  { icon: 'star-four-points-outline', key: 'pro.benefitNew' },
];

/** Pro plans: why the limit was reached, what Pro adds, monthly or annual, restore. */
export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { feature } = useLocalSearchParams<{ feature?: ProFeature }>();
  const pro = usePro();
  const [choice, setChoice] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    void pro.refreshPlans();
    // Load once when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected: PurchasesPackage | null =
    (choice === 'annual' ? pro.annual : pro.monthly) ?? pro.annual ?? pro.monthly;
  const saving =
    pro.monthly && pro.annual
      ? annualSavingPercent(pro.monthly.product.price, pro.annual.product.price)
      : null;
  const trial = selected?.product.introPrice?.price === 0;
  const site = language === 'es' ? SITE : `${SITE}en/`;
  const store = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  const founderDate = pro.founderUntil?.toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  async function buy() {
    if (!selected) return;
    setBusy('buy');
    try {
      const outcome = await pro.purchase(selected);
      if (outcome === 'done') {
        appAlert(t('pro.thanksTitle'), t('pro.thanksBody'), undefined, { tone: 'success' });
        router.back();
      } else if (outcome === 'error') {
        appAlert(t('pro.errorTitle'), t('pro.errorBody'), undefined, { tone: 'warning' });
      }
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setBusy('restore');
    try {
      const found = await pro.restore();
      if (found) {
        appAlert(t('pro.restoredTitle'), t('pro.restoredBody'), undefined, { tone: 'success' });
        router.back();
      } else {
        appAlert(t('pro.restoreNoneTitle'), t('pro.restoreNoneBody'));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <AppText variant="overline" style={styles.eyebrow}>
          {t('pro.eyebrow')}
        </AppText>
        <AppText variant="h1" style={styles.heroTitle}>
          {t('pro.title')}
        </AppText>
        <AppText variant="body" style={styles.heroBody}>
          {feature && REASON[feature]
            ? t(REASON[feature], {
                asks: FREE_ASKS_PER_MONTH,
                budgets: FREE_BUDGETS,
                reminders: FREE_REMINDERS,
                goals: FREE_GOALS,
              })
            : t('pro.subtitle')}
        </AppText>
      </View>

      {pro.isPro && pro.available ? (
        <View style={styles.card}>
          <AppText variant="title">{pro.founder ? t('pro.founderTitle') : t('pro.activeTitle')}</AppText>
          <AppText variant="body" style={styles.muted}>
            {pro.founder
              ? founderDate
                ? t('pro.founderBody', { date: founderDate })
                : t('pro.founderBodyNoDate')
              : t('pro.activeBody', { store })}
          </AppText>
          {pro.subscribed && pro.manageUrl ? (
            <Button
              label={t('pro.manage')}
              variant="secondary"
              onPress={() => void Linking.openURL(pro.manageUrl as string)}
              style={styles.top}
            />
          ) : null}
        </View>
      ) : pro.founderEnded && pro.available ? (
        <View style={styles.card}>
          <AppText variant="title">{t('pro.founderEndedTitle')}</AppText>
          <AppText variant="body" style={styles.muted}>
            {t('pro.founderEndedBody')}
          </AppText>
        </View>
      ) : null}

      <View style={styles.card}>
        {BENEFITS.map((b) => (
          <View key={b.key} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <MaterialCommunityIcons name={b.icon} size={20} color={colors.accent.tealText} />
            </View>
            <AppText variant="body" style={styles.flex}>
              {t(b.key)}
            </AppText>
          </View>
        ))}
        <AppText variant="caption" style={styles.muted}>
          {t('pro.freeKeeps')}
        </AppText>
      </View>

      {pro.isPro ? null : !pro.monthly && !pro.annual ? (
        <View style={styles.card}>
          <AppText variant="body" style={styles.muted}>
            {t('pro.plansError')}
          </AppText>
          <Button label={t('pro.retry')} variant="secondary" onPress={() => void pro.refreshPlans()} style={styles.top} />
        </View>
      ) : (
        <View style={styles.plans}>
          {pro.annual ? (
            <PlanOption
              selected={choice === 'annual'}
              onPress={() => setChoice('annual')}
              title={t('pro.annual')}
              price={t('pro.perYear', { price: pro.annual.product.priceString })}
              badge={saving ? t('pro.save', { pct: saving }) : undefined}
            />
          ) : null}
          {pro.monthly ? (
            <PlanOption
              selected={choice === 'monthly' || !pro.annual}
              onPress={() => setChoice('monthly')}
              title={t('pro.monthly')}
              price={t('pro.perMonth', { price: pro.monthly.product.priceString })}
            />
          ) : null}

          <Button
            label={trial ? t('pro.startTrial') : t('pro.subscribe')}
            onPress={() => void buy()}
            loading={busy === 'buy'}
            disabled={!selected || busy !== null}
            fullWidth
            style={styles.top}
          />
          <AppText variant="caption" style={styles.legal}>
            {t('pro.legal', { store })}
          </AppText>
        </View>
      )}

      <View style={styles.links}>
        <Pressable accessibilityRole="button" onPress={() => void restore()} disabled={busy !== null}>
          <AppText variant="label" style={styles.link}>
            {busy === 'restore' ? t('pro.restoring') : t('pro.restore')}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${site}terms.html`)}>
          <AppText variant="label" style={styles.link}>
            {t('pro.terms')}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`${site}privacy-policy.html`)}>
          <AppText variant="label" style={styles.link}>
            {t('about.privacyPolicy')}
          </AppText>
        </Pressable>
      </View>

      {pro.supportId ? (
        <AppText variant="caption" selectable style={styles.legal}>
          {t('pro.supportId', { id: pro.supportId })}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function PlanOption({
  selected,
  onPress,
  title,
  price,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  badge?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}>
      <MaterialCommunityIcons
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={22}
        color={selected ? colors.action.primary : colors.text.tertiary}
      />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="body" style={styles.muted}>
          {price}
        </AppText>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="label" style={styles.badgeText}>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.screen },
  content: { padding: space.gutter, gap: space.md },
  hero: {
    backgroundColor: colors.bg.brand,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.xs,
  },
  eyebrow: { color: colors.text.highlight },
  heroTitle: { color: colors.text.onBrand },
  heroBody: { color: colors.text.onBrandMuted },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  muted: { color: colors.text.secondary },
  top: { marginTop: space.xs },
  plans: { gap: space.sm },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.border.subtle,
  },
  planSelected: { borderColor: colors.action.primary },
  badge: {
    backgroundColor: colors.accent.goldSoft,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
  },
  badgeText: { color: colors.status.warningText },
  legal: { color: colors.text.secondary, textAlign: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.lg },
  link: { color: colors.action.secondary, textDecorationLine: 'underline' },
});
