import { CATEGORIES } from '@/src/data/financeDefaults';
import {
  loadBudgets,
  loadDebts,
  loadSubscriptions,
  loadTransactions,
  saveBudgets,
  saveDebts,
  saveSubscriptions,
  saveTransactions,
} from '@/src/data/financeStorage';
import { readSecureJson, writeSecureJson } from '@/src/data/secureStorage';
import {
  applyCategoryIdRemaps,
  ensureConceptColors,
  migrateToSpendConcepts,
  uniquifySpendSubIds,
} from '@/src/data/spendConcepts';
import type { QuickTemplate, ReminderRule, UserSettings } from '@/src/types/settings';
import { localDateKey } from '@/src/utils/habitPilot';

const SETTINGS_KEY = 'rumi:settings:v1';
const QUICK_KEY = 'rumi:quick-templates:v2';

export const CURRENT_CATALOG_VERSION = 5;

function createPersonId(): string {
  return `person-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const DEFAULT_SETTINGS: UserSettings = {
  onboardingDone: false,
  coachMarksDone: false,
  appLockEnabled: false,
  personId: '',
  userName: '',
  currency: 'COP',
  enabledCategoryIds: CATEGORIES.filter((c) => c.kind === 'expense').map((c) => c.id),
  spendConcepts: [],
  customConcepts: [],
  catalogVersion: CURRENT_CATALOG_VERSION,
  // Off until asked for: these alerts show amounts on the lock screen.
  notifyOnExpense: false,
  reminderRules: [],
  reminderCategoryIds: [],
  reminderCustomConcepts: [],
  reminderHour: 20,
  reminderMinute: 0,
  habitCue: 'afterPay',
  habitOpenDays: [],
  habitPilotDismissed: false,
};

/** One-tap chips are created only after the user logs a real spend. */
export const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [];

function migrateReminderRules(settings: UserSettings): ReminderRule[] {
  if (settings.reminderRules && settings.reminderRules.length > 0) {
    return settings.reminderRules;
  }
  const hour = settings.reminderHour ?? 20;
  const minute = settings.reminderMinute ?? 0;
  const ids = (settings.reminderCategoryIds ?? []).filter((id) => id !== 'otros');
  return ids.map((subId) => ({ subId, hour, minute }));
}

function migrateSettings(settings: UserSettings): {
  settings: UserSettings;
  remaps: Record<string, string>;
} {
  let spendConcepts = migrateToSpendConcepts({
    spendConcepts: settings.spendConcepts,
    customConcepts: settings.customConcepts,
    enabledCategoryIds: settings.enabledCategoryIds,
  });

  const { concepts, remaps, changed } = uniquifySpendSubIds(spendConcepts);
  spendConcepts = ensureConceptColors(concepts);

  let reminderRules = migrateReminderRules(settings);
  if (Object.keys(remaps).length > 0) {
    reminderRules = reminderRules.map((r) =>
      remaps[r.subId] ? { ...r, subId: remaps[r.subId] } : r
    );
  }

  return {
    settings: {
      ...settings,
      // Existing installs already finished onboarding: never replay the tour on launch.
      coachMarksDone:
        typeof settings.coachMarksDone === 'boolean'
          ? settings.coachMarksDone || settings.onboardingDone
          : settings.onboardingDone,
      appLockEnabled: settings.appLockEnabled === true,
      spendConcepts,
      customConcepts: settings.customConcepts ?? [],
      reminderRules,
      reminderCategoryIds: reminderRules.map((r) => r.subId),
      reminderMinute: settings.reminderMinute ?? 0,
      catalogVersion: CURRENT_CATALOG_VERSION,
      habitCue: settings.habitCue === 'evening' ? 'evening' : 'afterPay',
      habitOpenDays: Array.isArray(settings.habitOpenDays)
        ? settings.habitOpenDays
        : [],
      habitPilotDismissed: settings.habitPilotDismissed === true,
      habitPilotStartedAt:
        settings.habitPilotStartedAt ??
        (settings.onboardingDone ? localDateKey() : undefined),
    },
    remaps: changed ? remaps : {},
  };
}

async function applyFinanceCategoryRemaps(remaps: Record<string, string>): Promise<void> {
  if (Object.keys(remaps).length === 0) return;

  const [txs, budgets, debts, subs, quick] = await Promise.all([
    loadTransactions(),
    loadBudgets(),
    loadDebts(),
    loadSubscriptions(),
    loadQuickTemplates(),
  ]);

  const nextTx = applyCategoryIdRemaps(txs, remaps);
  const nextBudgets = applyCategoryIdRemaps(budgets, remaps);
  const nextDebts = applyCategoryIdRemaps(debts, remaps);
  const nextSubs = applyCategoryIdRemaps(subs, remaps);
  const nextQuick = applyCategoryIdRemaps(quick, remaps);

  await Promise.all([
    nextTx !== txs ? saveTransactions(nextTx) : Promise.resolve(),
    nextBudgets !== budgets ? saveBudgets(nextBudgets) : Promise.resolve(),
    nextDebts !== debts ? saveDebts(nextDebts) : Promise.resolve(),
    nextSubs !== subs ? saveSubscriptions(nextSubs) : Promise.resolve(),
    nextQuick !== quick ? saveQuickTemplates(nextQuick) : Promise.resolve(),
  ]);
}

export async function loadSettings(): Promise<UserSettings> {
  const stored = await readSecureJson<UserSettings>(SETTINGS_KEY);
  let settings: UserSettings;
  let remaps: Record<string, string> = {};

  if (!stored) {
    settings = { ...DEFAULT_SETTINGS, personId: createPersonId() };
    await saveSettings(settings);
    return settings;
  }
  try {
    const migrated = migrateSettings({
      ...DEFAULT_SETTINGS,
      ...stored,
    });
    settings = migrated.settings;
    remaps = migrated.remaps;
  } catch {
    settings = { ...DEFAULT_SETTINGS, personId: createPersonId() };
    await saveSettings(settings);
    return settings;
  }
  if (!settings.personId) {
    settings = { ...settings, personId: createPersonId() };
  }
  await saveSettings(settings);
  if (Object.keys(remaps).length > 0) {
    await applyFinanceCategoryRemaps(remaps);
  }
  return settings;
}

/** Settings hold the name and categories, so they are stored encrypted too. */
export async function saveSettings(settings: UserSettings): Promise<void> {
  await writeSecureJson(SETTINGS_KEY, settings);
}

export async function loadQuickTemplates(): Promise<QuickTemplate[]> {
  const parsed = await readSecureJson<QuickTemplate[]>(QUICK_KEY);
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveQuickTemplates(templates: QuickTemplate[]): Promise<void> {
  await writeSecureJson(QUICK_KEY, templates);
}
