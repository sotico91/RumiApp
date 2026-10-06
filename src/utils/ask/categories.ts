import { CATEGORIES } from '@/src/data/financeDefaults';
import { CREDITS_CONCEPT_ID, findSpendSub, flattenSpendSubs } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { isExpenseTx, isObligationTx } from './ledger';
import { MONTHS_EN, MONTHS_ES } from './period';
import { hasStem, includesAny, normalize, tokenize } from './text';

export const CATEGORY_ALIASES: Record<string, string[]> = {
  cafe: ['cafe', 'café', 'coffee', 'cafes'],
  delivery: ['delivery', 'domicilio', 'domicilios', 'uber eats', 'rappi'],
  snacks: ['snack', 'snacks', 'antojo', 'antojos'],
  alimentacion: [
    'alimentacion',
    'alimentación',
    'comida',
    'restaurant',
    'restaurante',
    'restaurantes',
    'food',
    'almuerzo',
    'cena',
  ],
  transporte: [
    'transporte',
    'transport',
    'uber',
    'taxi',
    'bus',
    'metro',
  ],
  gasolina: ['gasolina', 'combustible', 'fuel', 'gasolina', 'petrol'],
  entretenimiento: ['entretenimiento', 'entertainment', 'ocio', 'salida'],
  cine: ['cine', 'cinema', 'pelicula', 'película', 'movie'],
  compras: ['compras', 'shopping', 'ropa', 'amazon'],
  vivienda: ['vivienda', 'housing', 'arriendo', 'renta', 'alquiler', 'rent'],
  luz: ['luz', 'energia', 'energía', 'electricidad', 'electricity'],
  agua: ['agua', 'water', 'acueducto'],
  gas: ['gas hogar', 'gas natural', 'pipeta', 'recibo gas'],
  internet: ['internet', 'wifi', 'fibra', 'banda ancha'],
  telefonia: [
    'telefonia',
    'telefonía',
    'celular',
    'movil',
    'móvil',
    'plan datos',
    'phone',
  ],
  suscripciones: ['suscripciones', 'subscriptions', 'netflix', 'spotify'],
  salud: [
    'salud',
    'health',
    'medico',
    'médico',
    'farmacia',
    'ejercicio',
    'gym',
    'gimnasio',
    'deporte',
    'entrenamiento',
  ],
  educacion: ['educacion', 'educación', 'colegio', 'universidad', 'curso'],
  salario: ['salario', 'sueldo', 'nomina', 'nómina', 'payroll', 'salary'],
  freelance: ['freelance', 'independiente', 'honorarios', 'consultoria', 'consultoría'],
  bonos: ['bono', 'bonos', 'bonus', 'comision', 'comisión', 'comisiones'],
  reembolsos: ['reembolso', 'reembolsos', 'refund', 'devolucion', 'devolución'],
  ingresos: ['ingresos', 'income', 'otros ingresos'],
  otros: ['otros', 'other', 'miscelaneos', 'varios'],
};

export function isIncomeUsedAsReference(q: string): boolean {
  return (
    hasStem(q, 'consum') ||
    includesAny(q, [
      'de mi salario',
      'del salario',
      'de mi sueldo',
      'del sueldo',
      'de mi ingreso',
      'de mis ingresos',
      'del ingreso',
      'de los ingresos',
      'of my salary',
      'of my income',
      'of income',
      '% de mi',
      'porcentaje de mi',
      'percent of my',
      'percent of income',
    ])
  );
}

export function skipIncomeCategoryMatch(q: string): boolean {
  return (
    isIncomeUsedAsReference(q) ||
    hasStem(q, 'gast') ||
    hasStem(q, 'ahorr') ||
    hasStem(q, 'categ') ||
    includesAny(q, ['%', 'porcentaje', 'percent', 'spend', 'spent', 'save', 'saved'])
  );
}

export const INCOME_CATEGORY_IDS = ['salario', 'freelance', 'bonos', 'reembolsos', 'ingresos'];

export const FOOD_GROUP = ['alimentacion', 'delivery', 'cafe', 'snacks'];

export function scorePhraseInQuery(q: string, phrase: string): number {
  const p = normalize(phrase);
  if (!p || p.length < 2) return 0;

  // Exact phrase / word-boundary hit (strongest).
  if (includesAny(q, [p])) {
    let score = 40 + Math.min(p.length, 30);
    if (p.includes(' ') || p.includes('/')) score += 15;
    return score;
  }

  const qTokens = new Set(tokenize(q));
  const pTokens = tokenize(p);
  if (pTokens.length === 0) return 0;

  let hits = 0;
  for (const token of pTokens) {
    if (qTokens.has(token)) {
      hits += 1;
      continue;
    }
    // Prefix match for partial typing (cafe → cafeteria) only if token is long enough.
    if (token.length >= 4) {
      for (const qt of qTokens) {
        if (qt.startsWith(token) || token.startsWith(qt)) {
          hits += 0.6;
          break;
        }
      }
    }
  }

  if (hits <= 0) return 0;
  const coverage = hits / pTokens.length;
  if (coverage < 0.5) return 0;
  return Math.round(12 + coverage * 20 + hits * 4);
}

export type CategoryHit = {
  ids: string[];
  label: string;
  score: number;
  displayName?: string;
};

/**
 * Ranked match against user spend tree first, then legacy aliases.
 * Longer / more specific phrases win so "luz" beats vague concept names.
 */
export function detectCategories(
  q: string,
  spendConcepts: SpendConcept[] = []
): CategoryHit | null {
  const candidates: CategoryHit[] = [];

  if (includesAny(q, ['restaurante', 'restaurantes', 'restaurant', 'comida', 'food', 'alimentos'])) {
    // Prefer user's food-like concept tree if present.
    const foodSubs = flattenSpendSubs(spendConcepts).filter((sub) => {
      const n = normalize(sub.name);
      return includesAny(n, [
        'comida',
        'alimento',
        'delivery',
        'domicilio',
        'cafe',
        'café',
        'snack',
        'restaurante',
        'almuerzo',
        'cena',
      ]);
    });
    if (foodSubs.length > 0) {
      candidates.push({
        ids: foodSubs.map((s) => s.id),
        label: 'food-group',
        score: 55,
        displayName: 'food-group',
      });
    } else {
      candidates.push({
        ids: FOOD_GROUP,
        label: 'food-group',
        score: 50,
        displayName: 'food-group',
      });
    }
  }

  for (const concept of spendConcepts) {
    for (const sub of concept.subs) {
      const slug = sub.id.replace(/^(sub-|custom-|concept-)/, '').replace(/-/g, ' ');
      const phrases = [
        `${concept.name}/${sub.name}`,
        `${concept.name} ${sub.name}`,
        sub.name,
        slug,
      ];
      let best = 0;
      for (const phrase of phrases) {
        best = Math.max(best, scorePhraseInQuery(q, phrase));
      }
      // Sub names outrank bare concept matches.
      if (best > 0) {
        candidates.push({
          ids: [sub.id],
          label: sub.id,
          score: best + 8,
          displayName: `${concept.name}/${sub.name}`,
        });
      }
    }

    const conceptPhrases =
      concept.id === CREDITS_CONCEPT_ID
        ? [concept.name, 'creditos', 'créditos', 'credito', 'crédito', 'cuotas']
        : [concept.name];
    let conceptScore = 0;
    for (const phrase of conceptPhrases) {
      conceptScore = Math.max(conceptScore, scorePhraseInQuery(q, phrase));
    }
    if (conceptScore > 0 && concept.subs.length > 0) {
      candidates.push({
        ids: concept.subs.map((s) => s.id),
        label: concept.id,
        score: conceptScore + 2,
        displayName: concept.name,
      });
    }
  }

  for (const cat of CATEGORIES) {
    if (skipIncomeCategoryMatch(q) && INCOME_CATEGORY_IDS.includes(cat.id)) continue;
    const aliases = CATEGORY_ALIASES[cat.id] ?? [cat.id];
    let best = 0;
    for (const alias of aliases) {
      best = Math.max(best, scorePhraseInQuery(q, alias));
    }
    if (best <= 0) continue;

    const fromTree = flattenSpendSubs(spendConcepts).filter((sub) => {
      const slug = sub.id.replace(/^(sub-|custom-|concept-)/, '');
      const subName = normalize(sub.name);
      return (
        sub.id === cat.id ||
        sub.id === `sub-${cat.id}` ||
        slug === cat.id ||
        subName === normalize(cat.id) ||
        aliases.some((a) => {
          const na = normalize(a);
          return subName === na || (na.length >= 3 && subName.includes(na));
        })
      );
    });

    if (fromTree.length > 0) {
      candidates.push({
        ids: fromTree.map((s) => s.id),
        label: fromTree[0].id,
        score: best + 5,
        displayName: fromTree.map((s) => s.name).join(' + '),
      });
    } else {
      candidates.push({
        ids: [cat.id],
        label: cat.id,
        score: best,
        // No displayName: built-in ids ("cafe") are translated via categoryLabel.
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || b.ids.length - a.ids.length);
  const top = candidates[0];
  // Ignore very weak matches (noise from stopwords / short tokens).
  if (top.score < 14) return null;
  return top;
}

/**
 * "café y delivery", "uber, taxi": one hit per part, merged. A single concept
 * whose own name has "y" in it ("Luz y agua") still wins as one.
 */
export function detectCategoryList(
  q: string,
  spendConcepts: SpendConcept[] = []
): CategoryHit | null {
  const whole = detectCategories(q, spendConcepts);
  const parts = q.split(/\s*(?:,|\+|\by\b|\be\b|\band\b)\s*/).filter((p) => p.trim().length >= 2);
  if (parts.length < 2) return whole;
  if (whole?.displayName && /(?:^|\s)(?:y|and)(?:\s|$)/.test(normalize(whole.displayName))) {
    return whole;
  }
  const hits: CategoryHit[] = [];
  for (const part of parts) {
    const hit = detectCategories(part, spendConcepts);
    if (hit && !hits.some((h) => h.ids.join() === hit.ids.join())) hits.push(hit);
  }
  if (hits.length < 2) return whole;
  const named = hits.every(
    (h) => h.displayName && h.label !== 'food-group' && !h.displayName.startsWith('concept-')
  );
  return {
    ids: [...new Set(hits.flatMap((h) => h.ids))],
    label: 'multi',
    score: Math.max(...hits.map((h) => h.score)),
    displayName: named ? hits.map((h) => h.displayName).join(' + ') : undefined,
  };
}

/** Words about time or the question itself, never what was bought. */
export const NON_NOTE_WORDS = new Set([
  'mes', 'meses', 'semana', 'semanas', 'dia', 'dias', 'hoy', 'ayer', 'anteayer', 'ano', 'anos',
  'pasado', 'pasada', 'anterior', 'ultimo', 'ultimos', 'ultima', 'ultimas', 'hace', 'fin', 'finde',
  'total', 'plata', 'dinero', 'gastado', 'gastamos', 'compre', 'compras', 'llevo', 'van', 'vez', 'veces',
  'month', 'months', 'week', 'weeks', 'day', 'days', 'today', 'yesterday', 'year', 'last', 'past',
  'ago', 'weekend', 'money', 'bought', 'buy', 'so', 'far', 'in', 'at',
  ...MONTHS_ES.map(normalize),
  ...MONTHS_EN,
]);

/** Leftover words of a question, to look for in notes: "¿cuánto gasté en pizza?" → ["pizza"]. */
export function noteSearchTokens(q: string): string[] {
  return tokenize(q).filter((tok) => tok.length >= 3 && !/^\d+$/.test(tok) && !NON_NOTE_WORDS.has(tok));
}

export function isCreditsCategoryHit(
  cats: CategoryHit | null,
  spendConcepts: SpendConcept[]
): boolean {
  if (!cats) return false;
  if (cats.ids.includes(CREDITS_CONCEPT_ID) || cats.label === CREDITS_CONCEPT_ID) {
    return true;
  }
  return cats.ids.some(
    (id) => findSpendSub(spendConcepts, id)?.concept.id === CREDITS_CONCEPT_ID
  );
}

export function matchTransactionsToCategories(
  list: Transaction[],
  cats: CategoryHit,
  spendConcepts: SpendConcept[],
  mode: 'expense' | 'obligation' | 'spendOut' = 'expense'
): Transaction[] {
  const idSet = new Set(cats.ids);
  return list.filter((x) => {
    const typeOk =
      mode === 'obligation'
        ? isObligationTx(x)
        : mode === 'expense'
          ? isExpenseTx(x)
          : isExpenseTx(x) || isObligationTx(x);
    if (!typeOk || !x.categoryId) {
      return false;
    }
    const categoryId = x.categoryId;
    if (idSet.has(categoryId)) return true;
    // Parent concept id (e.g. concept-creditos) should match all its subs.
    if (idSet.has(findSpendSub(spendConcepts, categoryId)?.concept.id ?? '')) {
      return true;
    }
    return cats.ids.some((id) => {
      if (categoryId === `sub-${id}` || id === `sub-${categoryId}`) return true;
      const hit = findSpendSub(spendConcepts, categoryId);
      if (!hit) return false;
      const slug = categoryId.replace(/^(sub-|custom-|concept-)/, '');
      return (
        slug === id ||
        normalize(hit.sub.name) === normalize(id) ||
        cats.ids.includes(hit.concept.id)
      );
    });
  });
}
