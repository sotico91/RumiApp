import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

const HANDLED_KEY = 'rumi:last-reminder-response-id';

function categoryIdFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as Record<string, unknown>;
  // Android delivers notification data as strings.
  const type = rec.type != null ? String(rec.type) : '';
  if (type !== 'expense-reminder' && type !== 'ant-spend-tip') return null;
  const categoryId = rec.categoryId != null ? String(rec.categoryId).trim() : '';
  return categoryId || null;
}

function openFromNotification(type: string, categoryId: string) {
  if (type === 'ant-spend-tip') {
    router.push('/(tabs)');
    return;
  }
  router.push({
    pathname: '/agregar',
    params: { categoryId, mode: 'advanced' },
  });
}

/**
 * Tap on a local expense reminder opens Agregar with that subcategory.
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
      const data = response.notification.request.content.data;
      const categoryId = categoryIdFromData(data);
      if (!categoryId) return;
      const type =
        data && typeof data === 'object' && 'type' in data
          ? String((data as { type?: unknown }).type ?? '')
          : '';
      handled.current = id;
      void AsyncStorage.setItem(HANDLED_KEY, id);
      openFromNotification(type, categoryId);
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
