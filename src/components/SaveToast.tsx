import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConceptIcon } from '@/src/components/ConceptIcon';
import { tabBarHeight } from '@/src/components/RumiTabBar';
import { colors, motion, radius, shadow, space, type } from '@/src/theme';

export type SaveToastTone = 'expense' | 'income' | 'other' | 'removed';

export type SaveToastInput = {
  tone: SaveToastTone;
  /** Small line on top, e.g. "Gasto guardado". */
  kicker: string;
  /** Main line, usually the category. */
  title: string;
  /** The amount just saved, already formatted. */
  amount?: string;
  /** Context under the divider, e.g. today's total. */
  footer?: string;
  icon?: string;
  color?: string;
  /** One button on the card, e.g. "Undo". Keeps the card up a little longer. */
  action?: { label: string; onPress: () => void };
};

type Api = { show: (toast: SaveToastInput) => void };

const SaveToastContext = createContext<Api | null>(null);

const VISIBLE_MS = 3600;
/** Long enough to notice the card and reach its button. */
const VISIBLE_WITH_ACTION_MS = 6000;

/**
 * Confirmation card that rises just above the tab bar after a save. Kept at
 * the bottom so the system banner of the save notification, which drops in
 * from the top, never covers it. Lives at the app root so it survives the
 * add screen closing underneath it.
 */
export function SaveToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(SaveToastInput & { key: number }) | null>(null);

  const show = useCallback((next: SaveToastInput) => {
    setToast({ ...next, key: Date.now() });
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <SaveToastContext.Provider value={api}>
      {children}
      {toast ? (
        <ToastCard key={toast.key} toast={toast} onDone={() => setToast(null)} />
      ) : null}
    </SaveToastContext.Provider>
  );
}

export function useSaveToast(): Api {
  const api = useContext(SaveToastContext);
  if (!api) throw new Error('useSaveToast must be used inside <SaveToastProvider>');
  return api;
}

const TONE_ACCENT: Record<SaveToastTone, string> = {
  expense: colors.action.primary,
  income: colors.text.onBrandSuccess,
  other: colors.accent.teal,
  removed: colors.text.onBrandDanger,
};

function ToastCard({ toast, onDone }: { toast: SaveToastInput; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const enter = useSharedValue(0);
  const progress = useSharedValue(1);
  const leaving = useRef(false);
  const accent = TONE_ACCENT[toast.tone];
  const removed = toast.tone === 'removed';
  const visibleMs = toast.action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS;

  const dismiss = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    enter.value = withTiming(0, { duration: motion.duration.base }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [enter, onDone]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const haptic = removed
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void haptic.catch(() => undefined);
    }
    enter.value = withSpring(1, motion.spring.snappy);
    progress.value = withTiming(0, { duration: visibleMs, easing: Easing.linear });
    const timer = setTimeout(dismiss, visibleMs);
    return () => clearTimeout(timer);
  }, [dismiss, enter, progress, removed, visibleMs]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 24 },
      { scale: 0.96 + enter.value * 0.04 },
    ],
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: tabBarHeight(insets.bottom) + space.sm }]}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Pressable
          onPress={dismiss}
          accessibilityRole="alert"
          accessibilityLabel={[toast.kicker, toast.title, toast.amount, toast.footer]
            .filter(Boolean)
            .join('. ')}
          style={styles.press}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: toast.color ?? accent }]}>
              {toast.icon ? (
                <ConceptIcon icon={toast.icon} color={colors.text.onBrand} size={20} />
              ) : (
                <MaterialCommunityIcons name="check" size={22} color={colors.bg.brandDeep} />
              )}
              <View style={[styles.badge, removed && styles.badgeRemoved]}>
                <MaterialCommunityIcons
                  name={removed ? 'trash-can-outline' : 'check'}
                  size={11}
                  color={colors.bg.brandDeep}
                />
              </View>
            </View>

            <View style={styles.texts}>
              <Text style={[styles.kicker, { color: accent }]} numberOfLines={1}>
                {toast.kicker}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
            </View>

            {toast.amount ? (
              <Text style={styles.amount} numberOfLines={1}>
                {toast.amount}
              </Text>
            ) : null}
          </View>

          {toast.footer ? (
            <View style={styles.footer}>
              <MaterialCommunityIcons
                name="calendar-today"
                size={14}
                color={colors.text.onBrandMuted}
              />
              <Text style={styles.footerText} numberOfLines={2}>
                {toast.footer}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {toast.action ? (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              dismiss();
            }}
            hitSlop={6}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
            <MaterialCommunityIcons name="undo-variant" size={18} color={colors.text.highlight} />
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </Pressable>
        ) : null}

        <View style={styles.track}>
          <Animated.View style={[styles.bar, { backgroundColor: accent }, barStyle]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    backgroundColor: colors.bg.brandDeep,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.onBrand,
    overflow: 'hidden',
    ...shadow.e3,
  },
  press: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.onBrandSuccess,
    borderWidth: 2,
    borderColor: colors.bg.brandDeep,
  },
  badgeRemoved: { backgroundColor: colors.text.onBrandDanger },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: 44,
    marginHorizontal: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionPressed: { backgroundColor: 'rgba(255,255,255,0.18)' },
  actionText: { ...type.label, color: colors.text.highlight },
  texts: { flex: 1, gap: 2 },
  kicker: { ...type.overline },
  title: { ...type.label, color: colors.text.onBrand },
  amount: {
    fontFamily: type.h2.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.text.onBrand,
    fontVariant: ['tabular-nums'],
    maxWidth: '45%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.onBrand,
  },
  footerText: { ...type.caption, color: colors.text.onBrandMuted, flex: 1 },
  track: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bar: {
    height: 3,
    width: '100%',
    transformOrigin: 'left',
  },
});
