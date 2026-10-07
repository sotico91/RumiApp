import { CREDITS_CONCEPT_ID, isGeneralSubName } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { normalize, tokenize } from '@/src/utils/ask/text';

/** Category a new spend kind creates when the user has none for it (copy: `newCat.<id>`). */
export type NewConceptId =
  | 'food'
  | 'transport'
  | 'sport'
  | 'leisure'
  | 'health'
  | 'bills'
  | 'housing'
  | 'education'
  | 'shopping'
  | 'pets'
  | 'care';

/** Subcategory a spend kind creates (copy: `newSub.<id>`). */
export type NewSubId =
  | 'meals'
  | 'groceries'
  | 'coffee'
  | 'snacks'
  | 'delivery'
  | 'transit'
  | 'rides'
  | 'parking'
  | 'fuel'
  | 'football'
  | 'gym'
  | 'otherSport'
  | 'outings'
  | 'subscriptions'
  | 'health'
  | 'power'
  | 'water'
  | 'gas'
  | 'internet'
  | 'phone'
  | 'rent'
  | 'courses'
  | 'clothes'
  | 'online'
  | 'pets'
  | 'hair';

/**
 * Where a spend probably belongs, read from its description ("almuerzo",
 * "cancha fútbol", "uber"). Either a subcategory the user already has, or
 * one to create (`create`) when nothing fits that kind of spend yet.
 */
export type CategorySuggestion =
  | {
      conceptId: string;
      subId: string;
      /** name = a subcategory is named in the note; history = past spends; keyword = common words. */
      source: 'name' | 'history' | 'keyword';
      create?: undefined;
    }
  | {
      source: 'keyword';
      create: {
        /** Existing category to add the subcategory to; absent = create the category too. */
        conceptId?: string;
        concept: NewConceptId;
        sub: NewSubId;
        isAnt: boolean;
      };
      conceptId?: undefined;
      subId?: undefined;
    };

/**
 * A kind of spend people describe. `words` include the names Rumi gives what
 * it creates, so the next spend finds that subcategory instead of creating it again.
 */
type SpendKind = {
  words: string[];
  /** Words that find the user's own category for it, in order of preference. */
  concept: string[];
  create: { concept: NewConceptId; sub: NewSubId; isAnt?: boolean };
};

const FOOD = ['alimentacion', 'comida', 'comidas', 'food', 'restaurantes', 'mercado'];
const TRANSPORT = ['transporte', 'transport', 'movilidad', 'carro', 'vehiculo'];
const SPORT = ['deporte', 'deportes', 'sport', 'sports'];
const LEISURE = ['ocio', 'entretenimiento', 'diversion', 'salidas', 'recreacion', 'leisure', 'entertainment', 'fun'];
const BILLS = ['recibos', 'servicios', 'bills', 'utilities'];

export const SPEND_KINDS: SpendKind[] = [
  {
    words: ['almuerzo', 'almuerzos', 'desayuno', 'desayunos', 'cena', 'cenas', 'comida', 'comidas', 'corrientazo', 'ejecutivo', 'restaurante', 'restaurant', 'pizza', 'hamburguesa', 'empanada', 'empanadas', 'arepa', 'arepas', 'pollo', 'sushi', 'lunch', 'breakfast', 'dinner', 'brunch', 'meal', 'meals'],
    concept: FOOD,
    create: { concept: 'food', sub: 'meals' },
  },
  {
    words: ['mercado', 'supermercado', 'tienda', 'fruver', 'verduras', 'frutas', 'carne', 'huevos', 'leche', 'pan', 'panaderia', 'ara', 'exito', 'carulla', 'olimpica', 'jumbo', 'groceries', 'grocery', 'supermarket', 'bakery'],
    concept: [...FOOD, 'hogar'],
    create: { concept: 'food', sub: 'groceries' },
  },
  {
    words: ['cafe', 'tinto', 'capuchino', 'latte', 'starbucks', 'coffee'],
    concept: [...FOOD, 'antojos'],
    create: { concept: 'food', sub: 'coffee', isAnt: true },
  },
  {
    words: ['mecato', 'snack', 'snacks', 'onces', 'antojo', 'antojos', 'gaseosa', 'dulce', 'dulces', 'helado', 'galletas', 'chocolatina', 'candy', 'soda'],
    concept: ['antojos', ...FOOD],
    create: { concept: 'food', sub: 'snacks', isAnt: true },
  },
  {
    words: ['domicilio', 'domicilios', 'rappi', 'ifood', 'delivery', 'didi food'],
    concept: [...FOOD, 'domicilios'],
    create: { concept: 'food', sub: 'delivery', isAnt: true },
  },
  {
    words: ['bus', 'buseta', 'transmilenio', 'metro', 'sitp', 'pasaje', 'pasajes', 'train', 'subway', 'transit'],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'transit' },
  },
  {
    words: ['taxi', 'taxis', 'uber', 'didi', 'cabify', 'indriver', 'indrive', 'picap', 'ride', 'rides'],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'rides', isAnt: true },
  },
  {
    words: ['peaje', 'peajes', 'parqueadero', 'parqueo', 'parking', 'toll', 'tolls'],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'parking' },
  },
  {
    words: ['gasolina', 'tanqueo', 'tanquear', 'combustible', 'acpm', 'diesel', 'gas station', 'fuel', 'petrol'],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'fuel' },
  },
  {
    words: ['futbol', 'cancha', 'partido', 'microfutbol', 'soccer', 'football'],
    concept: [...SPORT, ...LEISURE],
    create: { concept: 'sport', sub: 'football' },
  },
  {
    words: ['gimnasio', 'gym', 'crossfit', 'yoga', 'natacion', 'piscina'],
    concept: [...SPORT, 'salud', 'health', ...LEISURE],
    create: { concept: 'sport', sub: 'gym' },
  },
  {
    words: ['deporte', 'deportes', 'tenis', 'padel', 'bici', 'ciclismo', 'sport', 'sports'],
    concept: [...SPORT, ...LEISURE],
    create: { concept: 'sport', sub: 'otherSport' },
  },
  {
    words: ['cine', 'pelicula', 'concierto', 'teatro', 'rumba', 'bar', 'cerveza', 'cervezas', 'trago', 'tragos', 'fiesta', 'discoteca', 'videojuego', 'salidas', 'movie', 'cinema', 'concert', 'beer', 'drinks', 'party', 'going out'],
    concept: LEISURE,
    create: { concept: 'leisure', sub: 'outings' },
  },
  {
    words: ['netflix', 'spotify', 'disney', 'youtube', 'prime', 'hbo', 'icloud', 'chatgpt', 'suscripcion', 'suscripciones', 'subscription', 'subscriptions'],
    concept: ['suscripciones', 'subscriptions', ...LEISURE, ...BILLS],
    create: { concept: 'leisure', sub: 'subscriptions', isAnt: true },
  },
  {
    words: ['farmacia', 'drogueria', 'medicamento', 'medicamentos', 'medicina', 'medico', 'cita medica', 'odontologo', 'dentista', 'examen', 'examenes', 'laboratorio', 'eps', 'pharmacy', 'doctor', 'dentist', 'medicine'],
    concept: ['salud', 'health', 'medico'],
    create: { concept: 'health', sub: 'health' },
  },
  {
    words: ['luz', 'energia', 'electricity', 'power'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'power' },
  },
  {
    words: ['agua', 'acueducto', 'water'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'water' },
  },
  {
    words: ['gas', 'gas natural'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'gas' },
  },
  {
    words: ['internet', 'wifi'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'internet' },
  },
  {
    words: ['celular', 'recarga', 'telefono', 'phone'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'phone' },
  },
  {
    words: ['arriendo', 'alquiler', 'administracion', 'renta', 'rent'],
    concept: ['vivienda', 'hogar', 'casa', 'housing', 'home'],
    create: { concept: 'housing', sub: 'rent' },
  },
  {
    words: ['curso', 'cursos', 'colegio', 'universidad', 'matricula', 'libro', 'libros', 'pension', 'clase', 'clases', 'course', 'courses', 'school', 'tuition', 'book'],
    concept: ['educacion', 'estudio', 'estudios', 'education'],
    create: { concept: 'education', sub: 'courses' },
  },
  {
    words: ['ropa', 'zapatos', 'camisa', 'pantalon', 'clothes', 'shoes'],
    concept: ['compras', 'ropa', 'shopping'],
    create: { concept: 'shopping', sub: 'clothes' },
  },
  {
    words: ['amazon', 'mercadolibre', 'temu', 'shein', 'online'],
    concept: ['compras', 'shopping'],
    create: { concept: 'shopping', sub: 'online' },
  },
  {
    words: ['veterinario', 'veterinaria', 'concentrado', 'mascota', 'mascotas', 'perro', 'gato', 'vet', 'pet', 'pets', 'dog', 'cat'],
    concept: ['mascotas', 'mascota', 'pets', 'pet'],
    create: { concept: 'pets', sub: 'pets' },
  },
  {
    words: ['peluqueria', 'barberia', 'corte de pelo', 'manicure', 'haircut', 'barber', 'hair'],
    concept: ['cuidado personal', 'personal', 'belleza', 'care'],
    create: { concept: 'care', sub: 'hair' },
  },
];

/** Words that say nothing about what was bought. */
const NOISE = new Set([
  'pago', 'pague', 'compra', 'compre', 'gasto', 'hoy', 'ayer', 'saque', 'plata', 'dinero',
  'efectivo', 'nequi', 'daviplata', 'tarjeta', 'para', 'con', 'del', 'los', 'las',
  'paid', 'bought', 'cash', 'card', 'today', 'yesterday', 'money',
]);

/** Meaningful words of a description: "Almuerzo con Juan 15.000" → ["almuerzo", "juan"]. */
export function noteWords(note: string): string[] {
  return tokenize(note).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !NOISE.has(w));
}

function wordMatches(a: string, b: string): boolean {
  if (a === b) return true;
  // Plural / small endings: "almuerzos" ~ "almuerzo", "futbolito" ~ "futbol";
  // not another word that only starts the same ("mercadolibre" is not "mercado").
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 4) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/** Position of the first word of `words` that names this phrase, or -1. */
function phraseAt(words: string[], text: string, phrase: string): number {
  const p = normalize(phrase);
  if (p.includes(' ')) {
    if (!normalize(text).includes(p)) return -1;
    return words.findIndex((w) => p.startsWith(w));
  }
  return words.findIndex((w) => wordMatches(w, p));
}

function suggestible(concepts: SpendConcept[]): SpendConcept[] {
  // Debt payments have their own flow; never send a spend to Credits.
  return concepts.filter((c) => c.id !== CREDITS_CONCEPT_ID && c.subs.length > 0);
}

/** A subcategory named in the note ("Almuerzo" in "almuerzo oficina"). */
function byName(words: string[], concepts: SpendConcept[]): CategorySuggestion | null {
  let best: { s: CategorySuggestion; len: number } | null = null;
  for (const concept of concepts) {
    for (const sub of concept.subs) {
      if (isGeneralSubName(sub.name)) continue;
      const nameWords = noteWords(sub.name);
      if (nameWords.length === 0 || !nameWords.every((nw) => words.some((w) => wordMatches(w, nw)))) {
        continue;
      }
      const len = normalize(sub.name).length;
      if (!best || len > best.len) {
        best = { s: { conceptId: concept.id, subId: sub.id, source: 'name' }, len };
      }
    }
  }
  return best?.s ?? null;
}

/** Word → subcategory → the past spends (ids) with that word filed there. */
export type NoteHistory = Map<string, Map<string, Set<string>>>;

export function buildNoteHistory(transactions: Transaction[]): NoteHistory {
  const index: NoteHistory = new Map();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.categoryId || !tx.note) continue;
    for (const word of new Set(noteWords(tx.note))) {
      const bySub = index.get(word) ?? new Map<string, Set<string>>();
      const ids = bySub.get(tx.categoryId) ?? new Set<string>();
      ids.add(tx.id);
      bySub.set(tx.categoryId, ids);
      index.set(word, bySub);
    }
  }
  return index;
}

/** The subcategory most past spends with these words went to, when it is a clear majority. */
function byHistory(
  words: string[],
  concepts: SpendConcept[],
  history: NoteHistory,
  ignoreTxId?: string
): { s: CategorySuggestion; votes: number } | null {
  const live = new Map<string, string>();
  for (const c of concepts) for (const sub of c.subs) live.set(sub.id, c.id);

  // Votes are spends, not words: "cancha de fútbol" once is one vote.
  const spends = new Map<string, Set<string>>();
  for (const word of words) {
    const bySub = history.get(word);
    if (!bySub) continue;
    for (const [subId, ids] of bySub) {
      if (!live.has(subId)) continue;
      const set = spends.get(subId) ?? new Set<string>();
      for (const id of ids) if (id !== ignoreTxId) set.add(id);
      spends.set(subId, set);
    }
  }
  const ranked = [...spends.entries()]
    .map(([subId, ids]) => [subId, ids.size] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const total = ranked.reduce((s, [, n]) => s + n, 0);
  const [subId, votes] = ranked[0];
  if (votes / total < 0.6) return null;
  return { s: { conceptId: live.get(subId)!, subId, source: 'history' }, votes };
}

function subFitsKind(subName: string, kind: SpendKind): boolean {
  const n = noteWords(subName);
  return n.length > 0 && n.some((nw) => kind.words.some((k) => wordMatches(nw, normalize(k))));
}

/**
 * Common words ("almuerzo", "uber", "cancha") → the user's subcategory for that
 * kind of spend; if there is none, the one to create (in their category for it
 * when they have one).
 */
function byKeyword(words: string[], note: string, concepts: SpendConcept[]): CategorySuggestion | null {
  // The kind named first wins: "café con pan" is a coffee, not groceries.
  const ranked = SPEND_KINDS.map((kind) => {
    let at = Infinity;
    for (const k of kind.words) {
      const i = phraseAt(words, note, k);
      if (i >= 0) at = Math.min(at, i);
    }
    return { kind, at };
  })
    .filter((k) => k.at < Infinity)
    .sort((a, b) => a.at - b.at);
  const first = ranked[0]?.kind;
  if (!first) return null;

  for (const concept of concepts) {
    for (const sub of concept.subs) {
      if (subFitsKind(sub.name, first)) {
        return { conceptId: concept.id, subId: sub.id, source: 'keyword' };
      }
    }
  }
  const home = first.concept
    .map((name) => concepts.find((c) => phraseAt(noteWords(c.name), c.name, name) >= 0))
    .find(Boolean);
  return {
    source: 'keyword',
    create: {
      conceptId: home?.id,
      concept: first.create.concept,
      sub: first.create.sub,
      isAnt: first.create.isAnt === true,
    },
  };
}

export function suggestCategory(
  note: string,
  spendConcepts: SpendConcept[],
  history: NoteHistory,
  /** Reviewing a saved spend: it is not evidence for itself. */
  ignoreTxId?: string
): CategorySuggestion | null {
  const words = noteWords(note);
  if (words.length === 0) return null;
  const concepts = suggestible(spendConcepts);

  const named = byName(words, concepts);
  if (named) return named;
  const past = byHistory(words, concepts, history, ignoreTxId);
  const keyword = byKeyword(words, note, concepts);
  if (!keyword) return past?.s ?? null;

  // The kind of spend picks the category ("almuerzo" is food, even if older
  // lunches were filed under a catch-all); past spends only pick the sub in it.
  const home = keyword.create ? keyword.create.conceptId : keyword.conceptId;
  if (home) return past && past.s.conceptId === home ? past.s : keyword;
  // No category of that kind at all: a habit (twice or more) beats creating one.
  return past && past.votes >= 2 ? past.s : keyword;
}
