/** A fake OS notification store: mockPending requests by identifier, plus call counts. */
const mockPending = new Map<string, { identifier: string; content: { title: string; body: string } }>();
const mockCalls = { schedule: 0, cancel: 0 };

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn() } }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(async () => {
    // Let other queued work interleave, like the native bridge does.
    await new Promise((r) => setTimeout(r, 5));
    return [...mockPending.values()];
  }),
  cancelScheduledNotificationAsync: jest.fn(async (id: string) => {
    mockCalls.cancel += 1;
    mockPending.delete(id);
  }),
  scheduleNotificationAsync: jest.fn(async (req: { identifier: string; content: { title: string; body: string } }) => {
    mockCalls.schedule += 1;
    await new Promise((r) => setTimeout(r, 1));
    mockPending.set(req.identifier, { identifier: req.identifier, content: req.content });
    return req.identifier;
  }),
}));

import { syncPlannedReminders, type PlannedReminder } from '@/src/utils/notifications';

const future = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const item = (id: string, body = 'body', days = 1): PlannedReminder => ({
  id,
  date: future(days),
  title: 'Rumi',
  body,
  data: { type: 'expense-reminder', categoryId: id.split('@')[0], amount: '' },
});

beforeEach(() => {
  mockPending.clear();
  mockCalls.schedule = 0;
  mockCalls.cancel = 0;
});

describe('syncPlannedReminders', () => {
  const items = [item('admin@1'), item('admin@2', 'body', 2), item('internet@1')];

  it('schedules each reminder once even when two syncs overlap', async () => {
    await Promise.all([syncPlannedReminders(items), syncPlannedReminders(items)]);
    expect(mockCalls.schedule).toBe(3);
    expect([...mockPending.keys()].sort()).toEqual([
      'rumi-reminder-admin@1',
      'rumi-reminder-admin@2',
      'rumi-reminder-internet@1',
    ]);
  });

  it('leaves unchanged reminders alone on the next sync', async () => {
    await syncPlannedReminders(items);
    await syncPlannedReminders(items);
    expect(mockCalls.schedule).toBe(3);
    expect(mockCalls.cancel).toBe(0);
  });

  it('replaces a reminder whose text changed instead of adding a second one', async () => {
    await syncPlannedReminders(items);
    await syncPlannedReminders([item('admin@1', 'new amount'), ...items.slice(1)]);
    expect(mockPending.size).toBe(3);
    expect(mockPending.get('rumi-reminder-admin@1')?.content.body).toBe('new amount');
  });

  it('cancels the old repeating reminder of the same concept', async () => {
    mockPending.set('rumi-reminder-admin', { identifier: 'rumi-reminder-admin', content: { title: 'Rumi', body: 'old' } });
    await syncPlannedReminders(items);
    expect(mockPending.has('rumi-reminder-admin')).toBe(false);
    expect(mockPending.size).toBe(3);
  });

  it('never schedules a reminder in the past', async () => {
    await syncPlannedReminders([item('admin@past', 'body', -1)]);
    expect(mockPending.size).toBe(0);
  });
});
