import * as Notifications from 'expo-notifications';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { AppState, Platform } from 'react-native';


Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isReminder = notification.request.content.data?.type === 'expense-reminder';
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      // Only reminder alerts bump the home-screen icon badge.
      shouldSetBadge: isReminder,
    };
  },
});

const ANDROID_CHANNEL_ID = 'rumi-alerts';
/** Dedicated channel so badge + importance apply on devices that already had the old channel. */
const ANDROID_REMINDER_CHANNEL_ID = 'rumi-reminders';
const ANDROID_ACCENT = '#FF6B4A';

let cachedLogoUri: string | null | undefined;

/**
 * iOS banner thumbnail: full-color cream card logo (must be a .png file URL).
 * Android large icon comes from the native manifest; the small status icon stays a white silhouette.
 */
async function iosLogoAttachments(): Promise<
  Notifications.NotificationContentAttachmentIos[] | undefined
> {
  if (Platform.OS !== 'ios') return undefined;
  if (cachedLogoUri === null) return undefined;
  if (!cachedLogoUri) {
    try {
      const asset = Asset.fromModule(require('../../assets/images/icon.png'));
      await asset.downloadAsync();
      const srcUri = asset.localUri ?? asset.uri;
      if (!srcUri) {
        cachedLogoUri = null;
      } else {
        const dest = new File(Paths.cache, 'rumi-notification-logo.png');
        if (dest.exists) dest.delete();
        await new File(srcUri).copy(dest);
        cachedLogoUri = dest.uri;
      }
    } catch {
      cachedLogoUri = null;
    }
  }
  if (!cachedLogoUri) return undefined;
  return [
    {
      identifier: 'rumi-logo',
      url: cachedLogoUri,
      type: 'image/png',
      typeHint: 'public.png',
      hideThumbnail: false,
    },
  ];
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Omit `sound` so Android uses the system default.
  // Passing sound: 'default' is treated as a custom file name and LogBox-errors.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Rumi',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F3E6D8',
    showBadge: true,
  });
  await Notifications.setNotificationChannelAsync(ANDROID_REMINDER_CHANNEL_ID, {
    name: 'Rumi reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#F3E6D8',
    showBadge: true,
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await ensureAndroidChannels();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync(
    Platform.OS === 'ios'
      ? {
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        }
      : undefined
  );
  return requested.granted;
}

/** Clears the app-icon badge (iOS number / Android launcher badge when supported). */
export async function clearAppBadge(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {
    /* launcher may not support badges */
  }
}

/**
 * Call once from root layout: clear badge when the user opens or returns to the app.
 */
export function startBadgeClearOnActive(): () => void {
  if (Platform.OS === 'web') return () => undefined;

  void clearAppBadge();

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void clearAppBadge();
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
    void clearAppBadge();
  });

  return () => {
    sub.remove();
    responseSub.remove();
  };
}

let lastExpenseNotify: { key: string; at: number } | null = null;
const EXPENSE_NOTIFY_PREFIX = 'rumi-expense-';

async function clearPriorExpenseConfirms(): Promise<void> {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter((n) => {
          const id = n.request.identifier;
          const type = n.request.content.data?.type;
          return (
            type === 'expense-registered' ||
            (typeof id === 'string' && id.startsWith(EXPENSE_NOTIFY_PREFIX))
          );
        })
        .map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  } catch {
    /* tray query unsupported on some builds */
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(EXPENSE_NOTIFY_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    /* ignore */
  }
}

/**
 * Immediate local confirm for a save. Uses a unique id each time so Android
 * does not reuse a previous banner (e.g. Rappi text after logging rent).
 */
export async function notifyExpenseRegistered(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const key = `${title}\n${body}`;
  const now = Date.now();
  // Guard against double-taps / remounts stacking the same confirm dozens of times.
  if (
    lastExpenseNotify &&
    lastExpenseNotify.key === key &&
    now - lastExpenseNotify.at < 4000
  ) {
    return;
  }
  lastExpenseNotify = { key, at: now };

  await clearPriorExpenseConfirms();

  const identifier = `${EXPENSE_NOTIFY_PREFIX}${now}-${Math.random().toString(36).slice(2, 8)}`;
  const attachments = await iosLogoAttachments();

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: { type: 'expense-registered' as const },
      ...(attachments ? { attachments } : null),
      ...(Platform.OS === 'android'
        ? { channelId: ANDROID_CHANNEL_ID, color: ANDROID_ACCENT }
        : null),
    },
    trigger: null,
  });
}

export type PlannedReminder = {
  /** Unique per concept + fire time (see planReminders). */
  id: string;
  categoryId: string;
  date: Date;
  title: string;
  body: string;
  /** Usual amount, passed to Add when the reminder is tapped. */
  amount: number | null;
};

const REMINDER_PREFIX = 'rumi-reminder-';

/**
 * Local reminders (not remote push), one dated notification per occurrence so
 * a month already paid can be skipped. Only the difference is applied: unchanged
 * occurrences stay scheduled, so syncing on every app open does not re-alert.
 * Safe for free Apple Personal Team — no aps-environment entitlement.
 * Sets the app-icon badge when a reminder fires (cleared when the app is opened).
 */
export async function syncPlannedReminders(items: PlannedReminder[]): Promise<number> {
  if (Platform.OS === 'web') return 0;
  if (items.length > 0 && !(await ensureNotificationPermission())) return 0;

  const wanted = new Map(items.map((item) => [`${REMINDER_PREFIX}${item.id}`, item]));
  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
    n.identifier.startsWith(REMINDER_PREFIX)
  );
  const keep = new Set<string>();
  await Promise.all(
    scheduled.map((n) => {
      const item = wanted.get(n.identifier);
      if (item && n.content.body === item.body && n.content.title === item.title) {
        keep.add(n.identifier);
        return undefined;
      }
      // Old repeating rules, removed concepts, or copy that changed (amount, language).
      return Notifications.cancelScheduledNotificationAsync(n.identifier);
    })
  );

  const now = Date.now();
  const attachments = await iosLogoAttachments();
  let count = keep.size;
  for (const [identifier, item] of wanted) {
    if (keep.has(identifier) || item.date.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: item.title,
        body: item.body,
        // Show “1” (or refresh) on the home-screen icon when the reminder fires.
        badge: 1,
        data: {
          categoryId: String(item.categoryId),
          type: 'expense-reminder',
          amount: item.amount != null ? String(Math.round(item.amount)) : '',
        },
        ...(attachments ? { attachments } : null),
        // iOS: system default sound. Android: channel controls sound (no custom file).
        ...(Platform.OS === 'ios' ? { sound: true } : null),
        ...(Platform.OS === 'android'
          ? { channelId: ANDROID_REMINDER_CHANNEL_ID, color: ANDROID_ACCENT }
          : null),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
    });
    count += 1;
  }
  return count;
}

export async function clearCategoryReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

const ANT_TIP_NOTIFY_ID = 'rumi-ant-tip';

/** Cancel the weekly soft ant-spend tip, if any. */
export async function clearAntSpendTipNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(ANT_TIP_NOTIFY_ID);
  } catch {
    /* ignore */
  }
}

/**
 * One local weekly nudge (Wed ~6:30pm). Fresh random copy each sync.
 * Free Personal Team safe — no remote push / aps-environment.
 */
export async function syncAntSpendTipNotification(opts: {
  title: string;
  body: string;
  categoryId: string;
  /** 1 = Sunday … 7 = Saturday (Expo / iOS). Default Wednesday. */
  weekday?: number;
  hour?: number;
  minute?: number;
}): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await ensureNotificationPermission();
  if (!granted) return false;

  await clearAntSpendTipNotification();

  const weekday = opts.weekday ?? 4;
  const hour = opts.hour ?? 18;
  const minute = opts.minute ?? 30;
  const attachments = await iosLogoAttachments();

  await Notifications.scheduleNotificationAsync({
    identifier: ANT_TIP_NOTIFY_ID,
    content: {
      title: opts.title,
      body: opts.body,
      data: {
        type: 'ant-spend-tip' as const,
        categoryId: String(opts.categoryId),
      },
      ...(attachments ? { attachments } : null),
      ...(Platform.OS === 'ios' ? { sound: true } : null),
      ...(Platform.OS === 'android'
        ? { channelId: ANDROID_CHANNEL_ID, color: ANDROID_ACCENT }
        : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
    },
  });

  return true;
}
