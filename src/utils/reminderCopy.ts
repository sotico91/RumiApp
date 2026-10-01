import { findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import type { Language, TranslationKey } from '@/src/i18n/translations';
import type { SpendConcept } from '@/src/types/settings';
import { categoryLabel } from '@/src/utils/categoryLabel';

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

type ConceptKind =
  | 'recibos'
  | 'creditos'
  | 'transporte'
  | 'alimentacion'
  | 'vivienda'
  | 'other';

function conceptKind(name: string, id: string): ConceptKind {
  const n = fold(name);
  const i = fold(id);
  if (n.includes('recibo') || n === 'bills' || n === 'utilities' || n === 'servicios' || i.includes('recibo')) {
    return 'recibos';
  }
  if (n.includes('credito') || n.includes('deuda') || n === 'credits' || i.includes('credito')) {
    return 'creditos';
  }
  if (n.includes('transporte') || n.includes('movilidad') || n === 'transport') {
    return 'transporte';
  }
  if (n.includes('aliment') || n.includes('comida') || n === 'food') {
    return 'alimentacion';
  }
  if (n.includes('vivienda') || n.includes('hogar') || n === 'housing' || n === 'home') {
    return 'vivienda';
  }
  return 'other';
}

const FEMININE = new Set([
  'luz',
  'energia',
  'administracion',
  'television',
  'tv',
  'cuota',
  'renta',
  'tarjeta',
  'moto',
  'vivienda',
  'casa',
  'comida',
  'fibra',
]);

const MASCULINE_DEL = new Set([
  'agua',
  'gas',
  'telefono',
  'celular',
  'arriendo',
  'carro',
  'auto',
  'apartamento',
  'apto',
  'aseo',
  'cafe',
  'almuerzo',
  'desayuno',
]);

const DE_BARE = new Set(['internet', 'wifi', 'netflix', 'spotify']);

const BRANDS = new Set([
  'uber',
  'didi',
  'nequi',
  'claro',
  'tigo',
  'movistar',
  'netflix',
  'spotify',
  'daviplata',
  'rappi',
  'ifood',
]);

function looksLikeBrand(name: string): boolean {
  const k = fold(name);
  if (BRANDS.has(k)) return true;
  const letters = name.replace(/[^A-Za-záéíóúÁÉÍÓÚ]/g, '');
  const uppers = [...letters].filter((c) => c === c.toUpperCase()).length;
  return letters.length >= 2 && uppers >= 2;
}

function shownNoun(name: string): string {
  return looksLikeBrand(name) ? name.trim() : name.trim().toLowerCase();
}

/** "de la luz", "del agua", "de internet", "de Claro". */
function spanishDe(noun: string): string {
  const raw = noun.trim();
  const k = fold(raw);
  const shown = shownNoun(raw);
  if (DE_BARE.has(k)) return `de ${shown}`;
  if (FEMININE.has(k) || k.endsWith('cion') || k.endsWith('sion') || k.endsWith('dad')) {
    return `de la ${shown}`;
  }
  if (MASCULINE_DEL.has(k)) return `del ${shown}`;
  if (looksLikeBrand(raw)) return `de ${raw.trim()}`;
  if (k.endsWith('a') && k !== 'dia') return `de la ${shown}`;
  if (k.endsWith('o')) return `del ${shown}`;
  return `de ${shown}`;
}

function spanishArticleNoun(noun: string): string {
  const raw = noun.trim();
  const k = fold(raw);
  const shown = shownNoun(raw);
  if (looksLikeBrand(raw) && !FEMININE.has(k) && !MASCULINE_DEL.has(k)) return raw.trim();
  const de = spanishDe(raw);
  if (de.startsWith('de la ')) return `la ${shown}`;
  if (de.startsWith('del ')) return `el ${shown}`;
  return shown;
}

function englishBillNoun(sub: string): string {
  const k = fold(sub);
  if (k === 'luz' || k === 'energia' || k === 'power' || k === 'electricity') return 'electricity';
  if (k === 'agua' || k === 'water') return 'water';
  if (k === 'gas') return 'gas';
  if (k === 'internet' || k === 'wifi') return 'internet';
  return sub.trim();
}

function spanishPaidTarget(concept: string, sub: string | null, id: string): string {
  const kind = conceptKind(concept, id);
  if (kind === 'recibos') {
    return sub ? `el recibo ${spanishDe(sub)}` : 'los recibos';
  }
  if (kind === 'creditos') {
    return sub ? `la cuota ${spanishDe(sub)}` : 'la cuota';
  }
  if (sub) {
    if (kind === 'vivienda' || kind === 'alimentacion' || kind === 'transporte') {
      return spanishArticleNoun(sub);
    }
    return `${concept} / ${sub}`;
  }
  return concept;
}

function englishPaidTarget(concept: string, sub: string | null, id: string): string {
  const kind = conceptKind(concept, id);
  if (kind === 'recibos') {
    return sub ? `the ${englishBillNoun(sub)} bill` : 'your bills';
  }
  if (kind === 'creditos') {
    return sub ? `the ${sub} installment` : 'the installment';
  }
  if (!sub) return concept;
  return `${concept} / ${sub}`;
}

/** Noun phrase for “already paid X”, using concept + subcategory when possible. */
export function reminderPaidTarget(
  categoryId: string,
  spendConcepts: SpendConcept[],
  t: TFn,
  language: Language
): string {
  const hit = findSpendSub(spendConcepts, categoryId);
  if (!hit) return categoryLabel(categoryId, t, spendConcepts);

  const concept = hit.concept.name.trim();
  const subName = hit.sub.name.trim();
  const sub =
    !subName || isGeneralSubName(subName) || fold(subName) === fold(concept)
      ? null
      : subName;

  return language === 'en'
    ? englishPaidTarget(concept, sub, hit.concept.id)
    : spanishPaidTarget(concept, sub, hit.concept.id);
}

export function reminderPushCopy(
  categoryId: string,
  spendConcepts: SpendConcept[],
  t: TFn,
  language: Language
): { title: string; body: string } {
  return {
    title: t('reminder.pushTitle'),
    body: t('reminder.pushBody', {
      target: reminderPaidTarget(categoryId, spendConcepts, t, language),
    }),
  };
}
