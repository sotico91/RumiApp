import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppModal } from '@/src/components/AppModal';
import { PocketFlowList } from '@/src/components/PocketFlowList';
import { useFinance } from '@/src/hooks/useFinance';
import { useMoney } from '@/src/hooks/useMoney';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { palette, radii } from '@/src/theme/colors';

type DecorProps = {
  size?: 'md' | 'lg';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Wallet icon opens a floating glass glance overlay.
 * Does NOT push page layout — Modal layer above the screen.
 */
export function SavingsDecor({
  size = 'lg',
  open: openProp,
  onOpenChange,
}: DecorProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  const float = useSharedValue(0);
  const spin = useSharedValue(0);
  const scale = size === 'lg' ? 1 : 0.85;
  const cardSize = size === 'lg' ? 100 : 88;

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    spin.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [float, spin]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }, { scale }],
  }));

  const coinStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -spin.value * 6 },
      { rotate: `${spin.value * 12}deg` },
    ],
  }));

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }

  const panelWidth = Math.min(320, width - 32);

  return (
    <>
      <Animated.View
        style={[styles.wrap, { width: cardSize, height: cardSize }, floatStyle]}>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
          <View style={styles.glow} />
          <View style={[styles.card, { width: cardSize, height: cardSize }]}>
            <View style={styles.piggy}>
              <Ionicons
                name="wallet"
                size={size === 'lg' ? 34 : 28}
                color={palette.white}
              />
            </View>
            <Animated.View style={[styles.coin, styles.coinOne, coinStyle]}>
              <Text style={styles.coinText}>$</Text>
            </Animated.View>
            <View style={[styles.coin, styles.coinTwo]}>
              <Text style={styles.coinText}>$</Text>
            </View>
            <Text style={styles.caption}>{t('decor.tapShow')}</Text>
          </View>
        </Pressable>
      </Animated.View>

      <AppModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <Animated.View
            entering={FadeIn.duration(160)}
            style={[styles.scrimHint, { top: insets.top + 8 }]}>
            <Text style={styles.scrimHintText}>{t('decor.overlayHint')}</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.springify().damping(18)}
            style={[
              styles.floatPanel,
              {
                top: insets.top + 56,
                right: 16,
                width: panelWidth,
              },
            ]}>
            <View style={styles.panelHeader}>
              <View style={styles.panelHeaderLeft}>
                <View style={styles.miniIcon}>
                  <Ionicons name="wallet" size={16} color={palette.white} />
                </View>
                <Text style={styles.panelTitle}>{t('decor.totalsTitle')}</Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <TotalsGlanceBody maxHeight={height * 0.62} />
            <Text style={styles.panelHint}>{t('decor.totalsHint')}</Text>
          </Animated.View>
        </View>
      </AppModal>
    </>
  );
}

function TotalsGlanceBody({ maxHeight }: { maxHeight: number }) {
  const { t } = useLanguage();
  const { format } = useMoney();
  const { totalForPeriod } = useFinance();

  const income = totalForPeriod('mes', 'income');
  const expenses = totalForPeriod('mes', 'expense');
  const savings = income - expenses;

  return (
    <ScrollView
      style={{ maxHeight }}
      showsVerticalScrollIndicator={false}
      bounces={false}>
      <Text style={styles.section}>{t('fab.whereTitle')}</Text>
      <PocketFlowList variant="dark" />
      <Text style={[styles.section, styles.sectionGap]}>{t('decor.monthTitle')}</Text>
      <View style={styles.panelGrid}>
        <PanelStat label={t('home.income')} value={format(income)} tone="good" />
        <PanelStat label={t('home.expenses')} value={format(expenses)} tone="danger" />
        <PanelStat
          label={t('home.savings')}
          value={format(savings)}
          tone={income > 0 ? (savings >= 0 ? 'good' : 'danger') : undefined}
        />
      </View>
    </ScrollView>
  );
}

function PanelStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'danger';
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[
          styles.statValue,
          tone === 'good' && styles.good,
          tone === 'danger' && styles.danger,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(244,201,93,0.35)',
  },
  card: {
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  piggy: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0B84A',
  },
  coinOne: { top: 8, right: 6 },
  coinTwo: { bottom: 24, left: 6 },
  coinText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 12,
    color: '#6B4E12',
  },
  caption: {
    marginTop: 4,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: palette.brand,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(6, 16, 22, 0.45)',
  },
  scrimHint: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  scrimHintText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  floatPanel: {
    position: 'absolute',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(18, 48, 60, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: palette.white,
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionGap: {
    marginTop: 14,
  },
  stat: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  statValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    color: palette.white,
  },
  good: { color: '#7DFFC8' },
  danger: { color: '#FFB4A8' },
  panelHint: {
    marginTop: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
});
