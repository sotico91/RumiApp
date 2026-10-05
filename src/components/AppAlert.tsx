import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AlertButton,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';

import { AppModal } from '@/src/components/AppModal';
import { ConceptIcon } from '@/src/components/ConceptIcon';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { colors, radius, shadow, space, type, type StatusTone } from '@/src/theme';
import { tapFeedback } from '@/src/utils/selectFeedback';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** A small card inside the dialog showing what the action is about. */
export type AppAlertDetail = {
  title: string;
  subtitle?: string;
  amount?: string;
  icon?: string;
  color?: string;
};

export type AppAlertOptions = {
  tone?: StatusTone;
  icon?: IconName;
  detail?: AppAlertDetail;
};

type Request = {
  id: number;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AppAlertOptions;
};

/** Mounted hosts, newest last. Alerts go to the newest so they show above its screen. */
const hosts: ((req: Request) => void)[] = [];
let nextId = 1;

/**
 * Drop-in for `Alert.alert` drawn in Rumi's own style. Falls back to the
 * native alert only when no <AppAlertHost> is mounted.
 */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AppAlertOptions
): void {
  const push = hosts[hosts.length - 1];
  if (!push) {
    Alert.alert(title, message, buttons);
    return;
  }
  push({ id: nextId++, title, message, buttons, options });
}

const TONE: Record<StatusTone, { fg: string; bg: string; icon: IconName }> = {
  danger: { fg: colors.status.danger, bg: colors.status.dangerSoft, icon: 'alert-circle-outline' },
  warning: { fg: colors.status.warning, bg: colors.status.warningSoft, icon: 'alert-outline' },
  success: { fg: colors.status.success, bg: colors.status.successSoft, icon: 'check-circle-outline' },
  info: { fg: colors.status.info, bg: colors.status.infoSoft, icon: 'information-outline' },
};

function resolveTone(req: Request): StatusTone {
  if (req.options?.tone) return req.options.tone;
  if (req.buttons?.some((b) => b.style === 'destructive')) return 'danger';
  return 'info';
}

/**
 * Renders queued `appAlert` calls. One lives at the app root (drawn through
 * AppModal so it sits above other sheets); screens presented natively, like
 * the add modal on iOS, mount an `inline` one so their alerts are not hidden
 * behind them.
 */
export function AppAlertHost({ inline = false }: { inline?: boolean }) {
  const [queue, setQueue] = useState<Request[]>([]);

  useEffect(() => {
    const push = (req: Request) => setQueue((prev) => [...prev, req]);
    hosts.push(push);
    return () => {
      const i = hosts.lastIndexOf(push);
      if (i !== -1) hosts.splice(i, 1);
    };
  }, []);

  const current = queue[0];
  const close = useCallback(
    (button?: AlertButton) => {
      setQueue((prev) => prev.slice(1));
      button?.onPress?.();
    },
    []
  );

  if (!current) return null;

  const dialog = <Dialog key={current.id} req={current} onClose={close} />;
  if (inline) {
    return <View style={styles.inlineLayer}>{dialog}</View>;
  }
  return (
    <AppModal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close(dismissButton(current))}>
      {dialog}
    </AppModal>
  );
}

/** What a tap outside or Android back does: the cancel button, or OK when it is the only one. */
function dismissButton(req: Request): AlertButton | undefined {
  const buttons = req.buttons ?? [];
  const cancel = buttons.find((b) => b.style === 'cancel');
  if (cancel) return cancel;
  if (buttons.length <= 1) return buttons[0];
  return undefined;
}

function Dialog({
  req,
  onClose,
}: {
  req: Request;
  onClose: (button?: AlertButton) => void;
}) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const tone = TONE[resolveTone(req)];
  const icon = req.options?.icon ?? tone.icon;
  const buttons: AlertButton[] =
    req.buttons && req.buttons.length > 0 ? req.buttons : [{ text: t('add.ok') }];
  // Two short choices sit side by side; anything more stacks.
  const stacked =
    buttons.length > 2 || buttons.some((b) => (b.text?.length ?? 0) > 16);
  // Cancel goes first in a row (left) and last in a stack (bottom).
  const ordered = stacked
    ? [...buttons.filter((b) => b.style !== 'cancel'), ...buttons.filter((b) => b.style === 'cancel')]
    : [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];
  const canDismiss = dismissButton(req) !== undefined || buttons.length <= 1;
  const detail = req.options?.detail;

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      style={styles.scrim}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel={t('add.ok')}
        onPress={canDismiss ? () => onClose(dismissButton(req)) : undefined}
      />
      <Animated.View
        entering={ZoomIn.springify().damping(18).stiffness(260)}
        accessibilityViewIsModal
        accessibilityRole="alert"
        style={[styles.card, { width: Math.min(width - space.gutter * 2, 380) }]}>
        <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
          <MaterialCommunityIcons name={icon} size={26} color={tone.fg} />
        </View>

        <Text style={styles.title}>{req.title}</Text>
        {req.message ? <Text style={styles.message}>{req.message}</Text> : null}

        {detail ? (
          <View style={styles.detail}>
            <View
              style={[
                styles.detailIcon,
                { backgroundColor: detail.color ?? colors.text.tertiary },
              ]}>
              <ConceptIcon icon={detail.icon} color={colors.text.onBrand} size={16} />
            </View>
            <View style={styles.detailTexts}>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {detail.title}
              </Text>
              {detail.subtitle ? (
                <Text style={styles.detailSubtitle} numberOfLines={1}>
                  {detail.subtitle}
                </Text>
              ) : null}
            </View>
            {detail.amount ? (
              <Text style={styles.detailAmount} numberOfLines={1}>
                {detail.amount}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.actions, stacked && styles.actionsStacked]}>
          {ordered.map((button, i) => {
            const variant =
              button.style === 'cancel'
                ? 'cancel'
                : button.style === 'destructive'
                  ? 'destructive'
                  : 'primary';
            return (
              <Pressable
                key={`${button.text ?? ''}-${i}`}
                onPress={() => {
                  tapFeedback();
                  onClose(button);
                }}
                style={({ pressed }) => [
                  styles.button,
                  !stacked && styles.buttonRow,
                  variant === 'cancel' && styles.buttonCancel,
                  variant === 'primary' && styles.buttonPrimary,
                  variant === 'destructive' && styles.buttonDestructive,
                  pressed && styles.buttonPressed,
                ]}>
                <Text
                  style={[
                    styles.buttonText,
                    variant === 'cancel' && styles.buttonTextCancel,
                  ]}
                  numberOfLines={2}>
                  {button.text ?? t('add.ok')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inlineLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 2000,
    elevation: 2000,
  },
  scrim: {
    flex: 1,
    backgroundColor: colors.bg.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.gutter,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
    ...shadow.e3,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xxs,
  },
  title: { ...type.h2, color: colors.text.primary },
  message: { ...type.body, color: colors.text.secondary },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginTop: space.xxs,
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTexts: { flex: 1, gap: 2 },
  detailTitle: { ...type.label, color: colors.text.primary },
  detailSubtitle: { ...type.caption, color: colors.text.tertiary },
  detailAmount: { ...type.amount, color: colors.text.primary, maxWidth: '45%' },
  actions: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.sm,
  },
  actionsStacked: { flexDirection: 'column' },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: { flex: 1 },
  buttonCancel: { backgroundColor: colors.bg.surfaceMuted },
  buttonPrimary: { backgroundColor: colors.action.primary },
  buttonDestructive: { backgroundColor: colors.status.danger },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: {
    ...type.label,
    color: colors.text.onAction,
    textAlign: 'center',
  },
  buttonTextCancel: { color: colors.text.secondary },
});
