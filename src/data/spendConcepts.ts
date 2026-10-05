import { CATEGORIES, expenseCategories, getCategoryById } from '@/src/data/financeDefaults';
import type { Budget, Category } from '@/src/types/finance';
import { guessConceptIcon } from '@/src/data/conceptIcons';
import { FRIENDLY_TEMPLATES } from '@/src/data/friendlyTemplates';
import { translations, type Language } from '@/src/i18n/translations';
import type { CustomConcept, SpendConcept, SpendSub } from '@/src/types/settings';

export const CREDITS_CONCEPT_ID = 'concept-creditos';
export const CREDITS_CONCEPT_NAME = 'Créditos';

/** Few broad buckets for first-run — café, luz, etc. are subs the user adds later. */
export const ONBOARDING_CONCEPTS: {
  id: string;
  color: string;
  nameKey:
    | 'onboard.concept.recibos'
    | 'onboard.concept.creditos'
    | 'onboard.concept.transporte'
    | 'onboard.concept.alimentacion'
    | 'onboard.concept.vivienda';
}[] = [
  { id: 'concept-recibos', color: '#4361EE', nameKey: 'onboard.concept.recibos' },
  { id: CREDITS_CONCEPT_ID, color: '#E63946', nameKey: 'onboard.concept.creditos' },
  { id: 'concept-transporte', color: '#2EC4B6', nameKey: 'onboard.concept.transporte' },
  { id: 'concept-alimentacion', color: '#E07A5F', nameKey: 'onboard.concept.alimentacion' },
  { id: 'concept-vivienda', color: '#3E6B8A', nameKey: 'onboard.concept.vivienda' },
];

/** Sub names onboarding can create under the default concepts (besides template titles). */
const BUILT_IN_SUB_KEYS = [
  'onboard.concept.general',
  'onboard.ant.rides',
  'onboard.ant.subscriptions',
] as const;

/**
 * Default concepts (Bills, Credit, Transport…) follow the app language.
 * Only names still equal to a built-in translation are switched, so a
 * concept the user named themselves is never touched.
 */
export function localizeDefaultConcepts(
  concepts: SpendConcept[],
  language: Language
): { concepts: SpendConcept[]; changed: boolean } {
  const en = translations.en as Record<string, string>;
  const es = translations.es as Record<string, string>;
  const target = translations[language] as Record<string, string>;
  let changed = false;

  const next = concepts.map((concept) => {
    let out = concept;
    const def = ONBOARDING_CONCEPTS.find((d) => d.id === concept.id);
    if (def) {
      const builtIn = new Set<string>([en[def.nameKey], es[def.nameKey]]);
      if (concept.id === CREDITS_CONCEPT_ID) builtIn.add(CREDITS_CONCEPT_NAME);
      const name = target[def.nameKey];
      if (builtIn.has(concept.name) && concept.name !== name) out = { ...out, name };
    }

    // Subcategories the app created itself: guided-flow templates ("Coffee" / "Café")
    // and the onboarding picks ("Rides & taxis" / "Taxi y apps", "General").
    const subKeys = def
      ? [
          ...FRIENDLY_TEMPLATES.filter((tpl) => tpl.spend?.conceptId === concept.id).map(
            (tpl) => tpl.titleKey
          ),
          ...BUILT_IN_SUB_KEYS,
        ]
      : [];
    if (subKeys.length > 0) {
      let subsChanged = false;
      const subs = out.subs.map((sub) => {
        const key = subKeys.find((k) => sub.name === en[k] || sub.name === es[k]);
        if (!key || sub.name === target[key]) return sub;
        subsChanged = true;
        return { ...sub, name: target[key] };
      });
      if (subsChanged) out = { ...out, subs };
    }

    if (out !== concept) changed = true;
    return out;
  });
  return { concepts: changed ? next : concepts, changed };
}

/** Icon of the category + color of the subcategory (or of the category). */
export function categoryVisual(
  categoryId: string,
  concepts: SpendConcept[]
): { icon?: string; color: string } {
  const hit = findSpendSub(concepts, categoryId);
  if (hit) return { icon: hit.concept.icon, color: subColor(hit.concept, hit.sub) };
  const concept = concepts.find((c) => c.id === categoryId);
  if (concept) return { icon: concept.icon, color: concept.color };
  return { color: resolveConceptColor(categoryId, concepts) };
}

/** A subcategory's own color, or its concept's. */
export function subColor(concept: Pick<SpendConcept, 'color'>, sub: Pick<SpendSub, 'color'>): string {
  return sub.color ?? concept.color;
}

/** Palette the user can pick when creating/editing a concept. */
export const CONCEPT_COLOR_OPTIONS = [
  '#2EC4B6',
  '#FF6B4A',
  '#9B5DE5',
  '#00BBF9',
  '#F4C95D',
  '#3E6B8A',
  '#F15BB5',
  '#06D6A0',
  '#F18F01',
  '#4361EE',
  '#E07A5F',
  '#7A8790',
  '#2A9D8F',
  '#E63946',
  '#457B9D',
  '#F77F00',
  '#6A994E',
  '#BC6C25',
  '#5E60CE',
  '#118AB2',
  '#EF476F',
  '#073B4C',
  '#8E9AAF',
  '#D4A373',
] as const;

export type ConceptColor = (typeof CONCEPT_COLOR_OPTIONS)[number];

/** Short, clearly distinct set shown in the picker; auto-assignment still uses the full palette. */
export const CONCEPT_COLOR_PICKS = [
  '#2EC4B6',
  '#06D6A0',
  '#6A994E',
  '#00BBF9',
  '#4361EE',
  '#9B5DE5',
  '#F15BB5',
  '#E63946',
  '#FF6B4A',
  '#F18F01',
  '#F4C95D',
  '#7A8790',
] as const;

/** Picker colors, keeping the current one visible when it comes from the full palette. */
export function conceptColorChoices(current?: string): string[] {
  const picks: string[] = [...CONCEPT_COLOR_PICKS];
  return current && !picks.includes(current) ? [current, ...picks] : picks;
}

function mixHex(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (target - c) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
}

/** Tones of the parent color for subcategories, so they still read as part of it. */
export function subColorShades(base: string): string[] {
  if (!/^#[0-9a-f]{6}$/i.test(base)) return [];
  return [
    mixHex(base, 0, 0.45),
    mixHex(base, 0, 0.25),
    mixHex(base, 255, 0.3),
    mixHex(base, 255, 0.55),
  ];
}

/** Prefer an unused palette color when creating; repeats only if the palette is exhausted. */
export function nextConceptColor(existing: SpendConcept[]): string {
  const used = new Set(existing.map((c) => c.color).filter(Boolean));
  const free = CONCEPT_COLOR_OPTIONS.find((c) => !used.has(c));
  return free ?? CONCEPT_COLOR_OPTIONS[existing.length % CONCEPT_COLOR_OPTIONS.length];
}

export function ensureConceptColors(concepts: SpendConcept[]): SpendConcept[] {
  let i = 0;
  let changed = false;
  const next = concepts.map((c) => {
    if (c.color) return c;
    changed = true;
    const color = CONCEPT_COLOR_OPTIONS[i++ % CONCEPT_COLOR_OPTIONS.length];
    return { ...c, color };
  });
  return changed ? next : concepts;
}

export function slugId(prefix: string, name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${prefix}${slug || 'item'}`;
}

function conceptSlug(conceptId: string): string {
  return conceptId.replace(/^concept-/, '') || 'item';
}

/** Stable unique sub id scoped to its parent concept (avoids Créditos/Carro ≡ Seguros/Carro). */
export function makeSpendSubId(conceptId: string, subName: string): string {
  return slugId('sub-', `${conceptSlug(conceptId)}-${subName.trim()}`);
}

export function createSpendConcept(
  name: string,
  opts?: {
    id?: string;
    color?: string;
    icon?: string;
    subs?: SpendSub[];
    existing?: SpendConcept[];
  }
): SpendConcept {
  const trimmed = name.trim();
  const id = opts?.id ?? slugId('concept-', trimmed);
  const color = opts?.color ?? nextConceptColor(opts?.existing ?? []);
  const subs = opts?.subs;
  return {
    id,
    name: trimmed,
    color,
    icon: opts?.icon ?? guessConceptIcon({ id, name: trimmed }),
    subs:
      subs && subs.length > 0
        ? subs
        : [{ id: makeSpendSubId(id, 'General'), name: 'General' }],
  };
}

export function createSpendSub(conceptId: string, name: string): SpendSub {
  const trimmed = name.trim();
  return { id: makeSpendSubId(conceptId, trimmed), name: trimmed };
}

export function flattenSpendSubs(concepts: SpendConcept[]): SpendSub[] {
  return concepts.flatMap((c) => c.subs);
}

/** Drop budget rows whose subcategory no longer exists in the concept tree. */
export function pruneBudgetsToSpendSubs(
  budgets: Budget[],
  concepts: SpendConcept[]
): Budget[] {
  const allowed = new Set(flattenSpendSubs(concepts).map((s) => s.id));
  return budgets.filter((b) => allowed.has(b.categoryId));
}

export function findSpendSub(
  concepts: SpendConcept[],
  subId: string
): { concept: SpendConcept; sub: SpendSub } | null {
  for (const concept of concepts) {
    const sub = concept.subs.find((s) => s.id === subId);
    if (sub) return { concept, sub };
  }
  return null;
}

export function findConceptById(
  concepts: SpendConcept[],
  conceptId: string
): SpendConcept | undefined {
  return concepts.find((c) => c.id === conceptId);
}

export function resolveConceptColor(
  categoryId: string,
  concepts: SpendConcept[],
  fallback = '#7A8790'
): string {
  const hit = findSpendSub(concepts, categoryId);
  if (hit?.concept.color) return hit.concept.color;
  const byId = concepts.find((c) => c.id === categoryId);
  if (byId?.color) return byId.color;
  return getCategoryById(categoryId).color ?? fallback;
}

/** True when this concept already has a subcategory with the same display name. */
export function hasDuplicateSubName(
  concepts: SpendConcept[],
  conceptId: string,
  name: string,
  exceptSubId?: string
): boolean {
  const parent = concepts.find((c) => c.id === conceptId);
  if (!parent) return false;
  const needle = name.trim().toLowerCase();
  return parent.subs.some(
    (s) => s.id !== exceptSubId && s.name.trim().toLowerCase() === needle
  );
}

/** True for the default placeholder sub created at onboarding / new concepts. */
export function isGeneralSubName(name: string): boolean {
  return name.trim().toLowerCase() === 'general';
}

/** Display label for a subcategory id (Concepto/Sub). */
export function spendSubLabel(
  subId: string,
  concepts: SpendConcept[],
  fallback?: (id: string) => string
): string {
  const hit = findSpendSub(concepts, subId);
  if (hit) {
    if (
      hit.sub.name === hit.concept.name ||
      isGeneralSubName(hit.sub.name)
    ) {
      return hit.concept.name;
    }
    return `${hit.concept.name}/${hit.sub.name}`;
  }
  return fallback?.(subId) ?? subId;
}

/** Categories-shaped rows for chips that still expect Category. */
export function spendSubsAsCategories(concepts: SpendConcept[]): Category[] {
  return flattenSpendSubs(concepts).map((sub) => {
    const parent = findSpendSub(concepts, sub.id)?.concept;
    return {
      id: sub.id,
      kind: 'expense' as const,
      color: parent?.color ?? resolveConceptColor(sub.id, concepts),
      isAnt: true,
      budgetGroup: 'custom',
    };
  });
}

/**
 * Ensure every subcategory id is unique and scoped to its concept.
 * Returns remaps oldId → newId for the first occurrence of each old id
 * so transactions/budgets follow that first owner.
 */
export function uniquifySpendSubIds(concepts: SpendConcept[]): {
  concepts: SpendConcept[];
  remaps: Record<string, string>;
  changed: boolean;
} {
  const idCounts = new Map<string, number>();
  for (const concept of concepts) {
    for (const sub of concept.subs) {
      idCounts.set(sub.id, (idCounts.get(sub.id) ?? 0) + 1);
    }
  }

  const used = new Set<string>();
  const remaps: Record<string, string> = {};
  const claimedOld = new Set<string>();
  let changed = false;

  const next = concepts.map((concept) => ({
    ...concept,
    subs: concept.subs.map((sub) => {
      const owners = idCounts.get(sub.id) ?? 0;
      const keepBuiltin =
        owners === 1 && CATEGORIES.some((c) => c.id === sub.id);

      let finalId = keepBuiltin ? sub.id : makeSpendSubId(concept.id, sub.name);
      if (used.has(finalId)) {
        const base = makeSpendSubId(concept.id, sub.name);
        let n = 2;
        while (used.has(`${base}-${n}`)) n += 1;
        finalId = `${base}-${n}`;
      }

      used.add(finalId);
      if (finalId !== sub.id) {
        changed = true;
        if (!claimedOld.has(sub.id)) {
          remaps[sub.id] = finalId;
          claimedOld.add(sub.id);
        }
      }
      return finalId === sub.id ? sub : { ...sub, id: finalId };
    }),
  }));

  return { concepts: next, remaps, changed };
}

/**
 * Migrate legacy flat customConcepts / enabled built-ins into spendConcepts tree.
 * Preserves built-in category ids as subcategory ids so old transactions still label.
 */
export function migrateToSpendConcepts(input: {
  spendConcepts?: SpendConcept[];
  customConcepts?: CustomConcept[];
  enabledCategoryIds?: string[];
}): SpendConcept[] {
  if (input.spendConcepts && input.spendConcepts.length > 0) {
    return ensureConceptColors(input.spendConcepts);
  }

  const concepts: SpendConcept[] = [];
  const usedSubIds = new Set<string>();

  for (const custom of input.customConcepts ?? []) {
    const conceptId = custom.id.startsWith('concept-')
      ? custom.id
      : `concept-${custom.id.replace(/^custom-/, '')}`;
    const generalId = makeSpendSubId(conceptId, 'General');
    concepts.push({
      id: conceptId,
      name: custom.name,
      color: nextConceptColor(concepts),
      subs: [{ id: generalId, name: 'General' }],
    });
    usedSubIds.add(generalId);
  }

  const expenseIds = new Set(expenseCategories().map((c) => c.id));
  for (const id of input.enabledCategoryIds ?? []) {
    if (!expenseIds.has(id) || usedSubIds.has(id)) continue;
    const meta = CATEGORIES.find((c) => c.id === id);
    const name = meta?.id ?? id;
    concepts.push({
      id: `concept-${id}`,
      name,
      color: meta?.color ?? nextConceptColor(concepts),
      subs: [{ id, name }],
    });
    usedSubIds.add(id);
  }

  return ensureConceptColors(concepts);
}

/**
 * Find or create a spend concept + subcategory (used by add-flow templates).
 * Reuses an existing concept by preferred id or display name.
 */
export function ensureSpendConceptSub(
  concepts: SpendConcept[],
  input: {
    conceptId?: string;
    conceptName: string;
    subName: string;
    color?: string;
    isAnt?: boolean;
  }
): { concepts: SpendConcept[]; conceptId: string; subId: string } {
  const conceptName = input.conceptName.trim();
  const subName = input.subName.trim();
  const conceptNeedle = conceptName.toLowerCase();
  const subNeedle = subName.toLowerCase();

  const parent =
    (input.conceptId
      ? concepts.find((c) => c.id === input.conceptId)
      : undefined) ??
    concepts.find((c) => c.name.trim().toLowerCase() === conceptNeedle);

  if (!parent) {
    const id = input.conceptId ?? slugId('concept-', conceptName);
    const sub: SpendSub = {
      ...createSpendSub(id, subName || conceptName),
      ...(input.isAnt ? { isAnt: true } : {}),
    };
    const concept = createSpendConcept(conceptName || subName, {
      id,
      color: input.color,
      existing: concepts,
      subs: [sub],
    });
    return {
      concepts: [...concepts, concept],
      conceptId: concept.id,
      subId: sub.id,
    };
  }

  const same = parent.subs.find(
    (s) => s.name.trim().toLowerCase() === subNeedle
  );
  if (same) {
    return { concepts, conceptId: parent.id, subId: same.id };
  }

  const sub: SpendSub = {
    ...createSpendSub(parent.id, subName || parent.name),
    ...(input.isAnt ? { isAnt: true } : {}),
  };
  return {
    concepts: concepts.map((c) =>
      c.id === parent.id ? { ...c, subs: [...c.subs, sub] } : c
    ),
    conceptId: parent.id,
    subId: sub.id,
  };
}

/** Ensure a Créditos concept exists; add/return a sub for the debt name. */
export function ensureCreditSub(
  concepts: SpendConcept[],
  debtName: string
): { concepts: SpendConcept[]; subId: string } {
  const existing = concepts.find((c) => c.id === CREDITS_CONCEPT_ID);
  if (!existing) {
    const sub = createSpendSub(CREDITS_CONCEPT_ID, debtName);
    return {
      concepts: [
        {
          id: CREDITS_CONCEPT_ID,
          name: CREDITS_CONCEPT_NAME,
          color: nextConceptColor(concepts),
          icon: guessConceptIcon({ id: CREDITS_CONCEPT_ID, name: CREDITS_CONCEPT_NAME }),
          subs: [sub],
        },
        ...concepts,
      ],
      subId: sub.id,
    };
  }
  const same = existing.subs.find(
    (s) => s.name.trim().toLowerCase() === debtName.trim().toLowerCase()
  );
  if (same) {
    return { concepts, subId: same.id };
  }
  const sub = createSpendSub(CREDITS_CONCEPT_ID, debtName);
  return {
    concepts: concepts.map((c) =>
      c.id === CREDITS_CONCEPT_ID ? { ...c, subs: [...c.subs, sub] } : c
    ),
    subId: sub.id,
  };
}

export function applyCategoryIdRemaps<T extends { categoryId?: string }>(
  items: T[],
  remaps: Record<string, string>
): T[] {
  if (!remaps || Object.keys(remaps).length === 0) return items;
  let changed = false;
  const next = items.map((item) => {
    const id = item.categoryId;
    if (!id || !remaps[id] || remaps[id] === id) return item;
    changed = true;
    return { ...item, categoryId: remaps[id] };
  });
  return changed ? next : items;
}
