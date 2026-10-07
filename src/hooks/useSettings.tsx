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
  localizeDefaultConcepts,
  uniqueSubId,
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
  ensureNotificationPermission,
} from '@/src/utils/notifications';
import { ensureConceptIcons } from '@/src/data/conceptIcons';
import { useLanguage } from '@/src/i18n/LanguageContext';
import { appendUniqueDay, localDateKey } from '@/src/utils/habitPilot';
import { antTipWeekKey } from '@/src/utils/antSpendTips';

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
  }) => Promise<void>;
  completeCoachMarks: () => Promise<void>;
  updateAppLock: (enabled: boolean) => Promise<void>;
  /** Turns the due-date reminder of one debt on or off. */
  setDebtReminder: (debtId: string, on: boolean) => Promise<void>;
  /** Stops suggesting a reminder for this subcategory. */
  dismissReminderSuggestion: (subId: string) => Promise<void>;
  /** Confirmation notification after each logged transaction. */
  updateNotifyOnExpense: (enabled: boolean) => Promise<boolean>;
  updateUserName: (userName: string) => Promise<void>;
  addSpendConcept: (name: string, color?: string, icon?: string) => Promise<SpendConcept | null>;
  updateSpendConceptColor: (conceptId: string, color: string) => Promise<void>;
  updateSpendConceptIcon: (conceptId: string, icon: string) => Promise<void>;
  /** `undefined` goes back to the concept color. */
  updateSpendSubColor: (conceptId: string, subId: string, color?: string) => Promise<void>;
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
  /**
   * Save an edited category tree (rename / move / join). `remaps` (old sub id →
   * new) also moves reminders, dismissed suggestions and quick templates.
   */
  applySpendTree: (concepts: SpendConcept[], remaps: Record<string, string>) => Promise<void>;
  ensureDebtCategory: (debtName: string) => Promise<string>;
  /** Saves the rules; ReminderScheduler turns them into notifications. */
  updateReminders: (input: {
    reminderRules: ReminderRule[];
    reminderHour?: number;
    reminderMinute?: number;
  }) => Promise<void>;
  /** Drops rules whose subcategory no longer exists. */
  pruneRemindersToRegistered: (allowedSubIds: Set<string>) => Promise<void>;
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
  const { language } = useLanguage();
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

  // Default concepts (Bills / Recibos…) follow the app language, and every
  // concept gets an icon (data saved before icons existed has none).
  useEffect(() => {
    if (!ready) return;
    const localized = localizeDefaultConcepts(settings.spendConcepts ?? [], language);
    const withIcons = ensureConceptIcons(localized.concepts);
    if (!localized.changed && !withIcons.changed) return;
    void persist({ ...settings, spendConcepts: withIcons.concepts });
  }, [ready, language, settings, persist]);

  const completeOnboarding = useCallback(
    async (input: {
      userName: string;
      currency: Currency;
      spendConcepts: SpendConcept[];
      notifyOnExpense: boolean;
      reminderCategoryIds: string[];
      reminderHour?: number;
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

  const setDebtReminder = useCallback(
    async (debtId: string, on: boolean) => {
      const off = new Set(settings.debtRemindersOff ?? []);
      if (on) off.delete(debtId);
      else off.add(debtId);
      await persist({ ...settings, debtRemindersOff: [...off] });
    },
    [settings, persist]
  );

  const dismissReminderSuggestion = useCallback(
    async (subId: string) => {
      const dismissed = new Set(settings.reminderSuggestionsDismissed ?? []);
      dismissed.add(subId);
      await persist({ ...settings, reminderSuggestionsDismissed: [...dismissed] });
    },
    [settings, persist]
  );

  /** Returns false when the user denied the system notification permission. */
  const updateNotifyOnExpense = useCallback(
    async (enabled: boolean) => {
      if (enabled && !(await ensureNotificationPermission())) return false;
      await persist({ ...settings, notifyOnExpense: enabled });
      return true;
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
    async (name: string, color?: string, icon?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const existing = settings.spendConcepts ?? [];
      const concept = createSpendConcept(trimmed, { color, icon, existing });
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
      const created = createSpendSub(conceptId, trimmed);
      const sub = { ...created, id: uniqueSubId(concepts, created.id) };
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

  const updateSpendConceptIcon = useCallback(
    async (conceptId: string, icon: string) => {
      await persist({
        ...settings,
        spendConcepts: (settings.spendConcepts ?? []).map((c) =>
          c.id === conceptId ? { ...c, icon } : c
        ),
      });
    },
    [settings, persist]
  );

  const updateSpendSubColor = useCallback(
    async (conceptId: string, subId: string, color?: string) => {
      await persist({
        ...settings,
        spendConcepts: (settings.spendConcepts ?? []).map((c) =>
          c.id !== conceptId
            ? c
            : { ...c, subs: c.subs.map((s) => (s.id === subId ? { ...s, color } : s)) }
        ),
      });
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

  const applySpendTree = useCallback(
    async (concepts: SpendConcept[], remaps: Record<string, string>) => {
      const to = (id: string) => remaps[id] ?? id;
      // A sub that already had its own reminder keeps it; the joined one's is dropped.
      const ownRules = new Set(
        settings.reminderRules.filter((r) => !remaps[r.subId]).map((r) => r.subId)
      );
      const ruleSubs = new Set<string>();
      const reminderRules = settings.reminderRules.filter((r) => {
        const id = to(r.subId);
        if (remaps[r.subId] && (ownRules.has(id) || ruleSubs.has(id))) return false;
        ruleSubs.add(id);
        return true;
      }).map((r) => (remaps[r.subId] ? { ...r, subId: remaps[r.subId] } : r));
      const dismissed = settings.reminderSuggestionsDismissed;
      await persist({
        ...settings,
        spendConcepts: concepts,
        reminderRules,
        reminderCategoryIds: reminderRules.map((r) => r.subId),
        reminderSuggestionsDismissed: dismissed ? [...new Set(dismissed.map(to))] : dismissed,
      });

      if (Object.keys(remaps).length === 0) return;
      // One quick template per subcategory: the most recent wins.
      const seen = new Set<string>();
      const nextQuick = [...quickTemplates]
        .map((tpl) => (remaps[tpl.categoryId] ? { ...tpl, categoryId: to(tpl.categoryId) } : tpl))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .filter((tpl) => {
          if (seen.has(tpl.categoryId)) return false;
          seen.add(tpl.categoryId);
          return true;
        });
      setQuickTemplates(nextQuick);
      await saveQuickTemplates(nextQuick);
    },
    [settings, persist, quickTemplates]
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
    },
    [settings]
  );

  const pruneRemindersToRegistered = useCallback(
    async (allowedSubIds: Set<string>) => {
      const rules = settings.reminderRules ?? [];
      const nextRules = rules.filter((r) => allowedSubIds.has(r.subId));
      if (nextRules.length === rules.length) return;
      await updateReminders({
        reminderRules: nextRules,
        reminderHour: settings.reminderHour,
        reminderMinute: settings.reminderMinute,
      });
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
    async (expenses: { categoryId: string }[]) => {
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
      setDebtReminder,
      dismissReminderSuggestion,
      updateNotifyOnExpense,
      updateUserName,
      addSpendConcept,
      updateSpendConceptColor,
      updateSpendConceptIcon,
      updateSpendSubColor,
      addSpendSub,
      ensureSpendConceptSub: ensureSpendPath,
      updateSpendSubAnt,
      removeSpendConcept,
      removeSpendSub,
      applySpendTree,
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
      setDebtReminder,
      dismissReminderSuggestion,
      updateNotifyOnExpense,
      updateUserName,
      addSpendConcept,
      updateSpendConceptColor,
      updateSpendConceptIcon,
      updateSpendSubColor,
      addSpendSub,
      ensureSpendPath,
      updateSpendSubAnt,
      removeSpendConcept,
      removeSpendSub,
      applySpendTree,
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
