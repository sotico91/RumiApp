import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createSpendConcept,
  createSpendSub,
  ensureCreditSub,
  ensureSpendConceptSub,
  hasDuplicateSubName,
} from '@/src/data/spendConcepts';
import {
  CURRENT_CATALOG_VERSION,
  DEFAULT_SETTINGS,
  loadQuickTemplates,
  loadSettings,
  saveQuickTemplates,
  saveSettings,
} from '@/src/data/settingsStorage';
import type {
  Currency,
  HabitCue,
  QuickTemplate,
  ReminderRule,
  SpendConcept,
  UserSettings,
} from '@/src/types/settings';
import {
  clearCategoryReminders,
  ensureNotificationPermission,
  syncRemindersFromRules,
} from '@/src/utils/notifications';
import { appendUniqueDay, localDateKey } from '@/src/utils/habitPilot';
import { antTipWeekKey } from '@/src/utils/antSpendTips';

type ReminderLabels = Record<string, { title: string; body: string }>;

type SettingsContextValue = {
  settings: UserSettings;
  ready: boolean;
  /** True only in the session right after onboarding — not on later launches. */
  coachMarksPending: boolean;
  quickTemplates: QuickTemplate[];
  completeOnboarding: (input: {
    userName: string;
    currency: Currency;
    spendConcepts: SpendConcept[];
    notifyOnExpense: boolean;
    reminderCategoryIds: string[];
    reminderHour?: number;
    reminderLabels?: ReminderLabels;
  }) => Promise<void>;
  completeCoachMarks: () => Promise<void>;
  updateAppLock: (enabled: boolean) => Promise<void>;
  updateUserName: (userName: string) => Promise<void>;
  addSpendConcept: (name: string, color?: string) => Promise<SpendConcept | null>;
  updateSpendConceptColor: (conceptId: string, color: string) => Promise<void>;
  addSpendSub: (conceptId: string, name: string) => Promise<string | null>;
  /**
   * Create or reuse a spend concept + subcategory (add-flow templates).
   * Returns null if names are empty.
   */
  ensureSpendConceptSub: (input: {
    conceptId?: string;
    conceptName: string;
    subName: string;
    color?: string;
    isAnt?: boolean;
  }) => Promise<{ conceptId: string; subId: string } | null>;
  updateSpendSubAnt: (
    conceptId: string,
    subId: string,
    isAnt: boolean
  ) => Promise<void>;
  removeSpendConcept: (conceptId: string) => Promise<void>;
  removeSpendSub: (conceptId: string, subId: string) => Promise<void>;
  ensureDebtCategory: (debtName: string) => Promise<string>;
  updateReminders: (input: {
    reminderRules: ReminderRule[];
    reminderLabels: ReminderLabels;
    reminderHour?: number;
    reminderMinute?: number;
  }) => Promise<void>;
  pruneRemindersToRegistered: (
    allowedSubIds: Set<string>,
    labels: ReminderLabels
  ) => Promise<void>;
  updateQuickTemplate: (
    template: Omit<QuickTemplate, 'id' | 'updatedAt'> & { id?: string }
  ) => Promise<void>;
  removeQuickTemplate: (id: string) => Promise<void>;
  /** Drop one-tap chips that no longer match any remaining expense. */
  pruneQuickTemplatesToExistingExpenses: (
    expenses: { categoryId: string }[]
  ) => Promise<void>;
  restoreSettingsFromBackup: (input: {
    settings: UserSettings;
    quickTemplates: QuickTemplate[];
  }) => Promise<void>;
  updateHabitCue: (cue: HabitCue) => Promise<void>;
  startHabitPilot: () => Promise<void>;
  dismissHabitPilot: () => Promise<void>;
  recordHabitOpenDay: () => Promise<void>;
  /** Hide the soft ant tip until next Monday week. */
  dismissAntSpendTipWeek: () => Promise<void>;
  rememberAntTipVariants: (titleVariant: number, bodyVariant: number) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [quickTemplates, setQuickTemplates] = useState<QuickTemplate[]>([]);
  const [ready, setReady] = useState(false);
  const [coachMarksPending, setCoachMarksPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [storedSettings, templates] = await Promise.all([
        loadSettings(),
        loadQuickTemplates(),
      ]);
      if (mounted) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...storedSettings,
          spendConcepts: storedSettings.spendConcepts ?? [],
          customConcepts: storedSettings.customConcepts ?? [],
          reminderRules: storedSettings.reminderRules ?? [],
          reminderCategoryIds:
            storedSettings.reminderCategoryIds ?? DEFAULT_SETTINGS.reminderCategoryIds,
          reminderCustomConcepts:
            storedSettings.reminderCustomConcepts ?? DEFAULT_SETTINGS.reminderCustomConcepts,
          reminderHour: storedSettings.reminderHour ?? DEFAULT_SETTINGS.reminderHour,
          reminderMinute: storedSettings.reminderMinute ?? DEFAULT_SETTINGS.reminderMinute,
        });
        setQuickTemplates(templates);
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: UserSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const completeOnboarding = useCallback(
    async (input: {
      userName: string;
      currency: Currency;
      spendConcepts: SpendConcept[];
      notifyOnExpense: boolean;
      reminderCategoryIds: string[];
      reminderHour?: number;
      reminderLabels?: ReminderLabels;
    }) => {
      const needsPermission =
        input.notifyOnExpense || input.reminderCategoryIds.length > 0;
      if (needsPermission) {
        await ensureNotificationPermission();
      }

      const reminderHour = input.reminderHour ?? 20;
      const reminderRules: ReminderRule[] = (input.reminderCategoryIds ?? []).map((subId) => ({
        subId,
        hour: reminderHour,
        minute: 0,
      }));
      const next: UserSettings = {
        onboardingDone: true,
        coachMarksDone: true,
        appLockEnabled: settings.appLockEnabled === true,
        personId: settings.personId || createId(),
        userName: input.userName.trim(),
        currency: input.currency,
        enabledCategoryIds: input.spendConcepts.flatMap((c) => c.subs.map((s) => s.id)),
        spendConcepts: input.spendConcepts,
        customConcepts: [],
        catalogVersion: CURRENT_CATALOG_VERSION,
        notifyOnExpense: input.notifyOnExpense,
        reminderRules,
        reminderCategoryIds: reminderRules.map((r) => r.subId),
        reminderCustomConcepts: [],
        reminderHour,
        reminderMinute: 0,
        habitPilotStartedAt: localDateKey(),
        habitCue: 'afterPay',
        habitOpenDays: [localDateKey()],
        habitPilotDismissed: false,
      };
      const seeded: QuickTemplate[] = [];
      setSettings(next);
      setQuickTemplates(seeded);
      setCoachMarksPending(true);
      await Promise.all([saveSettings(next), saveQuickTemplates(seeded)]);

      if (reminderRules.length > 0 && input.reminderLabels) {
        await syncRemindersFromRules(reminderRules, input.reminderLabels);
      } else {
        await clearCategoryReminders();
      }
    },
    [settings.personId, settings.appLockEnabled]
  );

  const completeCoachMarks = useCallback(async () => {
    setCoachMarksPending(false);
    if (settings.coachMarksDone) return;
    const next: UserSettings = { ...settings, coachMarksDone: true };
    setSettings(next);
    await saveSettings(next);
  }, [settings]);

  const updateAppLock = useCallback(
    async (enabled: boolean) => {
      await persist({ ...settings, appLockEnabled: enabled });
    },
    [settings, persist]
  );

  const updateUserName = useCallback(
    async (userName: string) => {
      await persist({ ...settings, userName: userName.trim() });
    },
    [settings, persist]
  );

  const addSpendConcept = useCallback(
    async (name: string, color?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = settings.spendConcepts ?? [];
      const concept = createSpendConcept(trimmed, { color, existing });
      if (existing.some((c) => c.id === concept.id)) {
        return existing.find((c) => c.id === concept.id) ?? null;
      }
      await persist({
        ...settings,
        spendConcepts: [...existing, concept],
      });
      return concept;
    },
    [settings, persist]
  );

  const updateSpendConceptColor = useCallback(
    async (conceptId: string, color: string) => {
      await persist({
        ...settings,
        spendConcepts: (settings.spendConcepts ?? []).map((c) =>
          c.id === conceptId ? { ...c, color } : c
        ),
      });
    },
    [settings, persist]
  );

  const addSpendSub = useCallback(
    async (conceptId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const concepts = settings.spendConcepts ?? [];
      const parent = concepts.find((c) => c.id === conceptId);
      if (!parent) return null;
      if (hasDuplicateSubName(concepts, conceptId, trimmed)) {
        return null;
      }
      const sub = createSpendSub(conceptId, trimmed);
      if (concepts.some((c) => c.subs.some((s) => s.id === sub.id))) {
        return null;
      }
      await persist({
        ...settings,
        spendConcepts: concepts.map((c) =>
          c.id === conceptId ? { ...c, subs: [...c.subs, sub] } : c
        ),
      });
      return sub.id;
    },
    [settings, persist]
  );

  const ensureSpendPath = useCallback(
    async (input: {
      conceptId?: string;
      conceptName: string;
      subName: string;
      color?: string;
      isAnt?: boolean;
    }) => {
      if (!input.conceptName.trim() && !input.subName.trim()) return null;
      const result = ensureSpendConceptSub(settings.spendConcepts ?? [], input);
      if (result.concepts !== settings.spendConcepts) {
        await persist({ ...settings, spendConcepts: result.concepts });
      }
      return { conceptId: result.conceptId, subId: result.subId };
    },
    [settings, persist]
  );

  const updateSpendSubAnt = useCallback(
    async (conceptId: string, subId: string, isAnt: boolean) => {
      await persist({
        ...settings,
        spendConcepts: (settings.spendConcepts ?? []).map((c) => {
          if (c.id !== conceptId) return c;
          return {
            ...c,
            subs: c.subs.map((s) =>
              s.id === subId ? { ...s, isAnt } : s
            ),
          };
        }),
      });
    },
    [settings, persist]
  );

  const removeSpendConcept = useCallback(
    async (conceptId: string) => {
      await persist({
        ...settings,
        spendConcepts: (settings.spendConcepts ?? []).filter((c) => c.id !== conceptId),
      });
    },
    [settings, persist]
  );

  const removeSpendSub = useCallback(
    async (conceptId: string, subId: string) => {
      await persist({
        ...settings,
        spendConcepts: (settings.spendConcepts ?? []).map((c) => {
          if (c.id !== conceptId) return c;
          const nextSubs = c.subs.filter((s) => s.id !== subId);
          return {
            ...c,
            subs:
              nextSubs.length > 0
                ? nextSubs
                : [{ id: `${c.id}-general`, name: 'General' }],
          };
        }),
      });
    },
    [settings, persist]
  );

  const ensureDebtCategory = useCallback(
    async (debtName: string) => {
      const { concepts, subId } = ensureCreditSub(settings.spendConcepts ?? [], debtName);
      if (concepts !== settings.spendConcepts) {
        await persist({ ...settings, spendConcepts: concepts });
      }
      return subId;
    },
    [settings, persist]
  );

  const updateReminders = useCallback(
    async (input: {
      reminderRules: ReminderRule[];
      reminderLabels: ReminderLabels;
      reminderHour?: number;
      reminderMinute?: number;
    }) => {
      const reminderRules = input.reminderRules;
      if (reminderRules.length > 0) {
        await ensureNotificationPermission();
      }
      const next: UserSettings = {
        ...settings,
        reminderRules,
        reminderCategoryIds: reminderRules.map((r) => r.subId),
        reminderCustomConcepts: [],
        reminderHour: input.reminderHour ?? settings.reminderHour,
        reminderMinute: input.reminderMinute ?? settings.reminderMinute ?? 0,
      };
      setSettings(next);
      await saveSettings(next);

      if (reminderRules.length === 0) {
        await clearCategoryReminders();
        return;
      }

      await syncRemindersFromRules(reminderRules, input.reminderLabels);
    },
    [settings]
  );

  const pruneRemindersToRegistered = useCallback(
    async (allowedSubIds: Set<string>, labels: ReminderLabels) => {
      const rules = settings.reminderRules ?? [];
      const nextRules = rules.filter((r) => allowedSubIds.has(r.subId));
      const changed =
        nextRules.length !== rules.length ||
        nextRules.some((r, i) => r.subId !== rules[i]?.subId);

      if (changed) {
        await updateReminders({
          reminderRules: nextRules,
          reminderLabels: labels,
          reminderHour: settings.reminderHour,
          reminderMinute: settings.reminderMinute,
        });
        return;
      }

      if (nextRules.length === 0) {
        await clearCategoryReminders();
      }
      // If rules are unchanged, leave existing schedules alone — re-syncing on
      // every app open can flood Android with duplicate local notifications.
    },
    [settings, updateReminders]
  );

  const updateQuickTemplate = useCallback(
    async (template: Omit<QuickTemplate, 'id' | 'updatedAt'> & { id?: string }) => {
      const now = new Date().toISOString();
      const withoutCategory = quickTemplates.filter((t) => t.categoryId !== template.categoryId);
      const next: QuickTemplate[] = [
        {
          id: template.id ?? createId(),
          categoryId: template.categoryId,
          amount: template.amount,
          note: template.note,
          updatedAt: now,
        },
        ...withoutCategory,
      ].slice(0, 8);

      setQuickTemplates(next);
      await saveQuickTemplates(next);
    },
    [quickTemplates]
  );

  const removeQuickTemplate = useCallback(
    async (id: string) => {
      const next = quickTemplates.filter((t) => t.id !== id);
      setQuickTemplates(next);
      await saveQuickTemplates(next);
    },
    [quickTemplates]
  );

  const pruneQuickTemplatesToExistingExpenses = useCallback(
    async (expenses: { categoryId: string; amount: number }[]) => {
      const next = quickTemplates.filter((t) =>
        expenses.some((e) => e.categoryId === t.categoryId)
      );
      if (next.length === quickTemplates.length) return;
      setQuickTemplates(next);
      await saveQuickTemplates(next);
    },
    [quickTemplates]
  );

  const restoreSettingsFromBackup = useCallback(
    async (input: { settings: UserSettings; quickTemplates: QuickTemplate[] }) => {
      const nextSettings: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...input.settings,
        onboardingDone: true,
        personId: input.settings.personId || settings.personId || DEFAULT_SETTINGS.personId,
      };
      setSettings(nextSettings);
      setQuickTemplates(input.quickTemplates ?? []);
      await Promise.all([
        saveSettings(nextSettings),
        saveQuickTemplates(input.quickTemplates ?? []),
      ]);
    },
    [settings.personId]
  );

  const updateHabitCue = useCallback(
    async (cue: HabitCue) => {
      await persist({ ...settings, habitCue: cue });
    },
    [settings, persist]
  );

  const startHabitPilot = useCallback(async () => {
    const today = localDateKey();
    await persist({
      ...settings,
      habitPilotStartedAt: today,
      habitPilotDismissed: false,
      habitOpenDays: appendUniqueDay([], today),
    });
  }, [settings, persist]);

  const dismissHabitPilot = useCallback(async () => {
    await persist({ ...settings, habitPilotDismissed: true });
  }, [settings, persist]);

  const recordHabitOpenDay = useCallback(async () => {
    if (!settings.onboardingDone) return;
    const today = localDateKey();
    const days = settings.habitOpenDays ?? [];
    if (days.includes(today)) return;
    await persist({
      ...settings,
      habitOpenDays: appendUniqueDay(days, today),
    });
  }, [settings, persist]);

  const dismissAntSpendTipWeek = useCallback(async () => {
    await persist({ ...settings, antTipDismissedWeekKey: antTipWeekKey() });
  }, [settings, persist]);

  const rememberAntTipVariants = useCallback(
    async (titleVariant: number, bodyVariant: number) => {
      if (
        settings.antTipLastTitleVariant === titleVariant &&
        settings.antTipLastBodyVariant === bodyVariant
      ) {
        return;
      }
      await persist({
        ...settings,
        antTipLastTitleVariant: titleVariant,
        antTipLastBodyVariant: bodyVariant,
      });
    },
    [settings, persist]
  );

  const value = useMemo(
    () => ({
      settings,
      ready,
      coachMarksPending,
      quickTemplates,
      completeOnboarding,
      completeCoachMarks,
      updateAppLock,
      updateUserName,
      addSpendConcept,
      updateSpendConceptColor,
      addSpendSub,
      ensureSpendConceptSub: ensureSpendPath,
      updateSpendSubAnt,
      removeSpendConcept,
      removeSpendSub,
      ensureDebtCategory,
      updateReminders,
      pruneRemindersToRegistered,
      updateQuickTemplate,
      removeQuickTemplate,
      pruneQuickTemplatesToExistingExpenses,
      restoreSettingsFromBackup,
      updateHabitCue,
      startHabitPilot,
      dismissHabitPilot,
      recordHabitOpenDay,
      dismissAntSpendTipWeek,
      rememberAntTipVariants,
    }),
    [
      settings,
      ready,
      coachMarksPending,
      quickTemplates,
      completeOnboarding,
      completeCoachMarks,
      updateAppLock,
      updateUserName,
      addSpendConcept,
      updateSpendConceptColor,
      addSpendSub,
      ensureSpendPath,
      updateSpendSubAnt,
      removeSpendConcept,
      removeSpendSub,
      ensureDebtCategory,
      updateReminders,
      pruneRemindersToRegistered,
      updateQuickTemplate,
      removeQuickTemplate,
      pruneQuickTemplatesToExistingExpenses,
      restoreSettingsFromBackup,
      updateHabitCue,
      startHabitPilot,
      dismissHabitPilot,
      recordHabitOpenDay,
      dismissAntSpendTipWeek,
      rememberAntTipVariants,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
