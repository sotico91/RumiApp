import { CREDITS_CONCEPT_ID, isGeneralSubName } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept, SpendSub } from '@/src/types/settings';
import { normalize, tokenize } from '@/src/utils/ask/text';

/**
 * Where a spend probably belongs, read from its description ("almuerzo",
 * "cancha fútbol", "uber"). Only points at subcategories the user already has;
 * no match → no suggestion, and the spend is saved as picked.
 */
export type CategorySuggestion = {
  conceptId: string;
  subId: string;
  /** name = a subcategory is named in the note; history = past spends; keyword = common words. */
  source: 'name' | 'history' | 'keyword';
};

/** Kinds of spend people describe; `concept` words find the user's category for them. */
type SpendKind = { words: string[]; concept: string[] };

const KINDS: SpendKind[] = [
  {
    // Meals out.
    words: ['almuerzo', 'almuerzos', 'desayuno', 'desayunos', 'cena', 'cenas', 'comida', 'corrientazo', 'ejecutivo', 'restaurante', 'restaurant', 'pizza', 'hamburguesa', 'empanada', 'empanadas', 'arepa', 'arepas', 'pollo', 'sushi', 'lunch', 'breakfast', 'dinner', 'brunch', 'meal'],
    concept: ['alimentacion', 'comida', 'comidas', 'food', 'restaurantes', 'mercado'],
  },
  {
    words: ['mercado', 'supermercado', 'tienda', 'fruver', 'verduras', 'frutas', 'carne', 'huevos', 'leche', 'pan', 'panaderia', 'd1', 'ara', 'exito', 'carulla', 'olimpica', 'jumbo', 'groceries', 'grocery', 'supermarket', 'bakery'],
    concept: ['alimentacion', 'comida', 'mercado', 'food', 'hogar'],
  },
  {
    words: ['cafe', 'tinto', 'capuchino', 'latte', 'starbucks', 'coffee'],
    concept: ['alimentacion', 'comida', 'food', 'antojos'],
  },
  {
    words: ['mecato', 'snack', 'snacks', 'onces', 'antojo', 'antojos', 'gaseosa', 'dulce', 'dulces', 'helado', 'galletas', 'chocolatina', 'candy', 'soda'],
    concept: ['antojos', 'alimentacion', 'comida', 'food'],
  },
  {
    words: ['domicilio', 'domicilios', 'rappi', 'ifood', 'delivery', 'didi food'],
    concept: ['alimentacion', 'comida', 'food', 'domicilios'],
  },
  {
    words: ['bus', 'buseta', 'transmilenio', 'metro', 'sitp', 'pasaje', 'pasajes', 'taxi', 'uber', 'didi', 'cabify', 'indriver', 'indrive', 'picap', 'moto', 'peaje', 'peajes', 'parqueadero', 'parqueo', 'ride', 'parking', 'toll', 'train', 'subway'],
    concept: ['transporte', 'transport', 'movilidad', 'carro', 'vehiculo'],
  },
  {
    words: ['gasolina', 'tanqueo', 'tanquear', 'combustible', 'acpm', 'diesel', 'gas station', 'fuel', 'petrol'],
    concept: ['transporte', 'transport', 'movilidad', 'carro', 'vehiculo'],
  },
  {
    words: ['futbol', 'cancha', 'partido', 'microfutbol', 'deporte', 'gimnasio', 'gym', 'natacion', 'piscina', 'tenis', 'padel', 'bici', 'ciclismo', 'crossfit', 'yoga', 'soccer', 'football', 'sport', 'sports'],
    concept: ['deporte', 'deportes', 'ocio', 'entretenimiento', 'recreacion', 'diversion', 'salud', 'leisure', 'entertainment', 'fun'],
  },
  {
    words: ['cine', 'pelicula', 'concierto', 'teatro', 'rumba', 'bar', 'cerveza', 'cervezas', 'trago', 'tragos', 'fiesta', 'discoteca', 'juego', 'videojuego', 'movie', 'cinema', 'concert', 'beer', 'drinks', 'party'],
    concept: ['entretenimiento', 'ocio', 'diversion', 'salidas', 'recreacion', 'entertainment', 'leisure', 'fun'],
  },
  {
    words: ['farmacia', 'drogueria', 'medicamento', 'medicamentos', 'medicina', 'medico', 'cita', 'odontologo', 'dentista', 'examen', 'examenes', 'laboratorio', 'eps', 'pharmacy', 'doctor', 'dentist', 'medicine'],
    concept: ['salud', 'health', 'medico'],
  },
  {
    words: ['luz', 'energia', 'agua', 'acueducto', 'gas', 'internet', 'wifi', 'celular', 'recarga', 'telefono', 'electricity', 'water', 'phone'],
    concept: ['recibos', 'servicios', 'bills', 'utilities', 'hogar', 'vivienda'],
  },
  {
    words: ['arriendo', 'alquiler', 'administracion', 'renta', 'rent'],
    concept: ['vivienda', 'hogar', 'casa', 'housing', 'home'],
  },
  {
    words: ['netflix', 'spotify', 'disney', 'youtube', 'prime', 'hbo', 'icloud', 'chatgpt', 'suscripcion', 'subscription'],
    concept: ['suscripciones', 'subscriptions', 'entretenimiento', 'recibos', 'ocio'],
  },
  {
    words: ['curso', 'colegio', 'universidad', 'matricula', 'libro', 'libros', 'pension', 'clase', 'clases', 'course', 'school', 'tuition', 'book'],
    concept: ['educacion', 'estudio', 'estudios', 'education'],
  },
  {
    words: ['ropa', 'zapatos', 'tenis nuevos', 'camisa', 'pantalon', 'amazon', 'mercadolibre', 'temu', 'shein', 'clothes', 'shoes'],
    concept: ['compras', 'ropa', 'shopping'],
  },
  {
    words: ['veterinario', 'veterinaria', 'concentrado', 'mascota', 'perro', 'gato', 'vet', 'pet', 'dog', 'cat'],
    concept: ['mascotas', 'mascota', 'pets', 'pet'],
  },
  {
    words: ['peluqueria', 'barberia', 'corte', 'unas', 'manicure', 'haircut', 'barber'],
    concept: ['cuidado personal', 'personal', 'belleza', 'care'],
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
  // Plural / partial: "almuerzos" ~ "almuerzo", "futbolito" ~ "futbol".
  return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a));
}

/** Does the text (a name or the note) contain this word or phrase? */
function hasPhrase(words: string[], text: string, phrase: string): boolean {
  const p = normalize(phrase);
  if (p.includes(' ')) return normalize(text).includes(p);
  return words.some((w) => wordMatches(w, p));
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

/** Word → subcategory votes from past spends that had a description. */
export type NoteHistory = Map<string, Map<string, number>>;

export function buildNoteHistory(transactions: Transaction[]): NoteHistory {
  const index: NoteHistory = new Map();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.categoryId || !tx.note) continue;
    for (const word of new Set(noteWords(tx.note))) {
      const votes = index.get(word) ?? new Map<string, number>();
      votes.set(tx.categoryId, (votes.get(tx.categoryId) ?? 0) + 1);
      index.set(word, votes);
    }
  }
  return index;
}

/** The subcategory most past spends with these words went to, when it is a clear majority. */
function byHistory(
  words: string[],
  concepts: SpendConcept[],
  history: NoteHistory
): { s: CategorySuggestion; votes: number } | null {
  const live = new Map<string, string>();
  for (const c of concepts) for (const sub of c.subs) live.set(sub.id, c.id);

  const tally = new Map<string, number>();
  for (const word of words) {
    const votes = history.get(word);
    if (!votes) continue;
    for (const [subId, n] of votes) {
      if (live.has(subId)) tally.set(subId, (tally.get(subId) ?? 0) + n);
    }
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  const total = ranked.reduce((s, [, n]) => s + n, 0);
  const [subId, votes] = ranked[0];
  if (votes / total < 0.6) return null;
  return { s: { conceptId: live.get(subId)!, subId, source: 'history' }, votes };
}

/** Best subcategory inside a category for these words. */
function subInside(
  concept: SpendConcept,
  words: string[],
  kind: SpendKind,
  history: NoteHistory
): SpendSub {
  const named = concept.subs.find((sub) => {
    const n = noteWords(sub.name);
    return n.length > 0 && n.some((nw) => kind.words.some((k) => wordMatches(nw, normalize(k))));
  });
  if (named) return named;
  const general = concept.subs.find((sub) => isGeneralSubName(sub.name));
  if (general) return general;
  // The sub of this category the user picks most for these words, else the first.
  let best: { sub: SpendSub; n: number } | null = null;
  for (const sub of concept.subs) {
    let n = 0;
    for (const w of words) n += history.get(w)?.get(sub.id) ?? 0;
    if (n > 0 && (!best || n > best.n)) best = { sub, n };
  }
  return best?.sub ?? concept.subs[0];
}

/** Common words ("almuerzo", "uber", "cancha") → the user's category for that kind of spend. */
function byKeyword(
  words: string[],
  note: string,
  concepts: SpendConcept[],
  history: NoteHistory
): CategorySuggestion | null {
  // The kind named first wins: "café con pan" is a coffee, not groceries.
  const firstAt = (kind: SpendKind): number => {
    let at = Infinity;
    for (const k of kind.words) {
      const p = normalize(k);
      const i = p.includes(' ')
        ? (normalize(note).includes(p) ? words.findIndex((w) => p.startsWith(w)) : -1)
        : words.findIndex((w) => wordMatches(w, p));
      if (i >= 0) at = Math.min(at, i);
    }
    return at;
  };
  const kinds = KINDS.map((kind) => ({ kind, at: firstAt(kind) }))
    .filter((k) => k.at < Infinity)
    .sort((a, b) => a.at - b.at)
    .map((k) => k.kind);

  for (const kind of kinds) {

    // A subcategory anywhere named like this kind of spend ("Almuerzos", "Fútbol").
    for (const concept of concepts) {
      for (const sub of concept.subs) {
        const n = noteWords(sub.name);
        if (n.length > 0 && n.some((nw) => kind.words.some((k) => wordMatches(nw, normalize(k))))) {
          return { conceptId: concept.id, subId: sub.id, source: 'keyword' };
        }
      }
    }
    // Otherwise the category for it, in the kind's order of preference.
    for (const name of kind.concept) {
      const concept = concepts.find((c) => {
        const cw = noteWords(c.name);
        return hasPhrase(cw, c.name, name);
      });
      if (concept) {
        const sub = subInside(concept, words, kind, history);
        return { conceptId: concept.id, subId: sub.id, source: 'keyword' };
      }
    }
  }
  return null;
}

export function suggestCategory(
  note: string,
  spendConcepts: SpendConcept[],
  history: NoteHistory
): CategorySuggestion | null {
  const words = noteWords(note);
  if (words.length === 0) return null;
  const concepts = suggestible(spendConcepts);
  if (concepts.length === 0) return null;

  const named = byName(words, concepts);
  if (named) return named;
  // What the user did twice or more beats generic words; once, it only fills a gap.
  const past = byHistory(words, concepts, history);
  if (past && past.votes >= 2) return past.s;
  return byKeyword(words, note, concepts, history) ?? past?.s ?? null;
}
