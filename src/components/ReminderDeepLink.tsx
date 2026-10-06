import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

const HANDLED_KEY = 'rumi:last-reminder-response-id';

type Target =
  | { type: 'expense-reminder'; categoryId: string; amount: string }
  | { type: 'debt-reminder'; debtId: string }
  | { type: 'ant-spend-tip' };

/** What a tapped notification points at; Android delivers notification data as strings. */
function targetFromData(data: unknown): Target | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  const field = (key: string) => (rec[key] != null ? String(rec[key]).trim() : '');
  const raw = field('amount');
  const amount = /^\d+$/.test(raw) ? raw : '';
  switch (field('type')) {
    case 'expense-reminder':
      return field('categoryId') ? { type: 'expense-reminder', categoryId: field('categoryId'), amount } : null;
    case 'debt-reminder':
      return field('debtId') ? { type: 'debt-reminder', debtId: field('debtId') } : null;
    case 'ant-spend-tip':
      return { type: 'ant-spend-tip' };
    default:
      return null;
  }
}

function openFromNotification(target: Target) {
  if (target.type === 'ant-spend-tip') {
    router.push('/(tabs)');
    return;
  }
  if (target.type === 'debt-reminder') {
    // The pay-debt flow suggests the installment itself.
    router.push({ pathname: '/agregar', params: { intent: 'debt', debtId: target.debtId } });
    return;
  }
  // The usual amount comes prefilled, so logging the bill is one tap on Save.
  router.push({
    pathname: '/agregar',
    params: {
      categoryId: target.categoryId,
      mode: 'advanced',
      ...(target.amount ? { amount: target.amount } : null),
    },
  });
}

/**
 * Tap on a reminder opens Agregar: an expense reminder with its subcategory, a debt
 * reminder on paying that debt; both come with the usual amount filled in.
 * Persists the response id so an icon launch does not re-open Add (Android
 * keeps the last response around; iOS can too).
 */
export function ReminderDeepLink() {
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let sub: { remove: () => void } | undefined;

    function consume(response: Notifications.NotificationResponse | null | undefined) {
      if (!response || cancelled) return;
      const id = response.notification.request.identifier;
      if (!id || handled.current === id) return;
      const target = targetFromData(response.notification.request.content.data);
      if (!target) return;
      handled.current = id;
      void AsyncStorage.setItem(HANDLED_KEY, id);
      openFromNotification(target);
    }

    void (async () => {
      const stored = await AsyncStorage.getItem(HANDLED_KEY);
      if (cancelled) return;
      handled.current = stored;
      const last = await Notifications.getLastNotificationResponseAsync();
      consume(last ?? null);
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        consume(response);
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return null;
}
