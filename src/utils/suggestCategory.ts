import { CREDITS_CONCEPT_ID, findSpendSub, isGeneralSubName } from '@/src/data/spendConcepts';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { STOPWORDS } from '@/src/utils/ask/text';

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
  | 'care'
  | 'insurance'
  | 'gifts'
  | 'travel'
  | 'banks'
  | 'donations';

/** Subcategory a spend kind creates (copy: `newSub.<id>`). */
export type NewSubId =
  | 'lunch'
  | 'breakfast'
  | 'dinner'
  | 'meals'
  | 'groceries'
  | 'coffee'
  | 'snacks'
  | 'delivery'
  | 'transit'
  | 'rides'
  | 'parking'
  | 'fuel'
  | 'upkeep'
  | 'football'
  | 'gym'
  | 'otherSport'
  | 'outings'
  | 'games'
  | 'subscriptions'
  | 'health'
  | 'power'
  | 'water'
  | 'gas'
  | 'internet'
  | 'phone'
  | 'rent'
  | 'home'
  | 'courses'
  | 'clothes'
  | 'online'
  | 'pets'
  | 'hair'
  | 'insurance'
  | 'gifts'
  | 'travel'
  | 'fees'
  | 'donations';

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
  create: {
    concept: NewConceptId;
    sub: NewSubId;
    isAnt?: boolean;
    /**
     * Words people keep apart (lunch vs breakfast): the sub is created and
     * matched under that name, not the kind's general one.
     */
    subFor?: Record<string, NewSubId>;
  };
};

const FOOD = ['alimentacion', 'comida', 'comidas', 'food', 'restaurantes'];
const TRANSPORT = ['transporte', 'transport', 'movilidad', 'carro', 'vehiculo', 'car'];
const SPORT = ['deporte', 'deportes', 'sport', 'sports'];
const LEISURE = ['ocio', 'entretenimiento', 'diversion', 'salidas', 'recreacion', 'leisure', 'entertainment', 'fun'];
const BILLS = ['recibos', 'servicios', 'bills', 'utilities'];
const HOME = ['vivienda', 'hogar', 'casa', 'housing', 'home'];

/**
 * What people write, grouped by the kind of spend it is. Spanish (Colombia
 * first) and English, with local brands and slang. Accents and ñ do not
 * matter; plurals, small endings and one-letter typos are tolerated.
 * Ambiguous words sit with their everyday meaning: "tenis" are shoes,
 * "recarga" alone is the phone, an empanada is a snack.
 */
export const SPEND_KINDS: SpendKind[] = [
  {
    words: [
      'almuerzo', 'almuerzos', 'almorce', 'almorzar', 'almorzamos', 'desayuno', 'desayunos', 'desayune',
      'cena', 'cenas', 'cene', 'comida', 'comidas', 'corrientazo', 'ejecutivo', 'menu del dia', 'bandeja paisa',
      'restaurante', 'restaurant', 'pizza', 'hamburguesa', 'salchipapa', 'perro caliente', 'pollo asado',
      'arepa', 'arepas', 'pollo', 'sushi', 'ajiaco', 'sancocho', 'frisby', 'kfc', 'mcdonalds', 'burger king',
      'el corral', 'crepes', 'comida rapida', 'lunch', 'breakfast', 'dinner', 'brunch', 'meal', 'meals',
      'burger', 'burgers', 'takeout', 'diner',
    ],
    // Meals out are food, never "Mercado" (that is groceries for home).
    concept: FOOD,
    create: {
      concept: 'food',
      sub: 'meals',
      subFor: {
        almuerzo: 'lunch',
        almuerzos: 'lunch',
        almorce: 'lunch',
        almorzar: 'lunch',
        almorzamos: 'lunch',
        lunch: 'lunch',
        desayuno: 'breakfast',
        desayunos: 'breakfast',
        desayune: 'breakfast',
        breakfast: 'breakfast',
        cena: 'dinner',
        cenas: 'dinner',
        cene: 'dinner',
        dinner: 'dinner',
      },
    },
  },
  {
    words: [
      'mercado', 'supermercado', 'tienda', 'fruver', 'plaza', 'verduras', 'frutas', 'carne', 'huevos', 'leche',
      'pan', 'panaderia', 'viveres', 'abarrotes', 'd1', 'ara', 'exito', 'carulla', 'olimpica', 'jumbo', 'makro',
      'pricesmart', 'surtimax', 'metro supermercado', 'justo y bueno', 'isimo', 'groceries', 'grocery',
      'supermarket', 'bakery', 'walmart', 'costco',
    ],
    concept: [...FOOD, 'mercado', 'hogar'],
    create: { concept: 'food', sub: 'groceries' },
  },
  {
    words: ['cafe', 'tinto', 'capuchino', 'latte', 'aromatica', 'juan valdez', 'oma', 'tostao', 'starbucks', 'coffee'],
    concept: [...FOOD, 'antojos'],
    create: { concept: 'food', sub: 'coffee', isAnt: true },
  },
  {
    words: [
      'mecato', 'snack', 'snacks', 'onces', 'antojo', 'antojos', 'gaseosa', 'dulce', 'dulces', 'helado', 'galletas',
      'chocolatina', 'empanada', 'empanadas', 'bunuelo', 'pandebono', 'postre', 'paquete de papas', 'chicle',
      'candy', 'soda', 'chips', 'ice cream',
    ],
    concept: ['antojos', ...FOOD],
    create: { concept: 'food', sub: 'snacks', isAnt: true },
  },
  {
    words: ['domicilio', 'domicilios', 'rappi', 'ifood', 'delivery', 'didi food', 'uber eats', 'doordash'],
    concept: [...FOOD, 'domicilios'],
    create: { concept: 'food', sub: 'delivery', isAnt: true },
  },
  {
    words: [
      'bus', 'buseta', 'colectivo', 'transmilenio', 'metro', 'metrocable', 'sitp', 'megabus', 'mio', 'pasaje',
      'pasajes', 'tullave', 'civica', 'train', 'transit', 'bus fare',
    ],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'transit' },
  },
  {
    words: ['taxi', 'taxis', 'uber', 'didi', 'cabify', 'indriver', 'indrive', 'picap', 'mototaxi', 'ride', 'rides', 'lyft'],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'rides', isAnt: true },
  },
  {
    words: ['peaje', 'peajes', 'parqueadero', 'parqueo', 'parking', 'toll', 'tolls'],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'parking' },
  },
  {
    words: [
      'gasolina', 'tanqueo', 'tanqueada', 'tanquear', 'tanquee', 'combustible', 'acpm', 'diesel', 'gnv',
      'gas station', 'fuel', 'petrol',
    ],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'fuel' },
  },
  {
    words: [
      'taller', 'mecanico', 'cambio de aceite', 'llantas', 'llanta', 'lavada', 'lavado del carro', 'repuestos',
      'tecnomecanica', 'mantenimiento', 'mechanic', 'car wash', 'tires', 'oil change', 'upkeep',
    ],
    concept: TRANSPORT,
    create: { concept: 'transport', sub: 'upkeep' },
  },
  {
    words: ['futbol', 'cancha', 'partido', 'microfutbol', 'guayos', 'soccer', 'football'],
    concept: [...SPORT, ...LEISURE],
    create: { concept: 'sport', sub: 'football' },
  },
  {
    words: ['gimnasio', 'gym', 'smart fit', 'bodytech', 'crossfit', 'yoga', 'pilates', 'natacion', 'piscina', 'spinning'],
    concept: [...SPORT, 'salud', 'health', ...LEISURE],
    create: { concept: 'sport', sub: 'gym' },
  },
  {
    words: ['deporte', 'deportes', 'padel', 'bici', 'ciclismo', 'sport', 'sports'],
    concept: [...SPORT, ...LEISURE],
    create: { concept: 'sport', sub: 'otherSport' },
  },
  {
    words: [
      'cine', 'cinecolombia', 'cinemark', 'pelicula', 'boletas', 'concierto', 'teatro', 'rumba', 'bar', 'cerveza',
      'cervezas', 'pola', 'polas', 'trago', 'tragos', 'guaro', 'aguardiente', 'fiesta', 'discoteca', 'parche',
      'paseo', 'bolos', 'salidas', 'movie', 'movies', 'cinema', 'concert', 'beer', 'drinks', 'party', 'going out',
    ],
    concept: LEISURE,
    create: { concept: 'leisure', sub: 'outings' },
  },
  {
    words: ['videojuego', 'videojuegos', 'juegos', 'steam', 'playstation', 'xbox', 'nintendo', 'games', 'game'],
    concept: LEISURE,
    create: { concept: 'leisure', sub: 'games' },
  },
  {
    words: [
      'netflix', 'spotify', 'disney', 'youtube', 'prime video', 'hbo', 'icloud', 'google one', 'chatgpt',
      'crunchyroll', 'paramount', 'deezer', 'apple music', 'suscripcion', 'suscripciones', 'subscription',
      'subscriptions',
    ],
    concept: ['suscripciones', 'subscriptions', ...LEISURE, ...BILLS],
    create: { concept: 'leisure', sub: 'subscriptions', isAnt: true },
  },
  {
    words: [
      'farmacia', 'drogueria', 'drogas', 'medicamento', 'medicamentos', 'medicina', 'pastillas', 'medico',
      'cita medica', 'consulta', 'odontologo', 'odontologia', 'ortodoncia', 'dentista', 'examen', 'examenes',
      'laboratorio', 'eps', 'copago', 'terapia', 'psicologo', 'optometra', 'gafas', 'vacuna', 'pharmacy',
      'doctor', 'dentist', 'medicine', 'pills',
    ],
    concept: ['salud', 'health', 'medico'],
    create: { concept: 'health', sub: 'health' },
  },
  {
    words: ['luz', 'energia', 'enel', 'codensa', 'epm', 'electricaribe', 'electricity', 'power'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'power' },
  },
  {
    words: ['agua', 'acueducto', 'water'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'water' },
  },
  {
    words: ['gas', 'gas natural', 'vanti', 'pipeta'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'gas' },
  },
  {
    words: ['internet', 'wifi', 'etb', 'fibra'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'internet' },
  },
  {
    words: ['celular', 'recarga celular', 'plan celular', 'telefono', 'claro', 'movistar', 'tigo', 'wom', 'phone'],
    concept: [...BILLS, 'hogar', 'vivienda'],
    create: { concept: 'bills', sub: 'phone' },
  },
  {
    words: ['arriendo', 'alquiler', 'administracion', 'renta', 'predial', 'rent'],
    concept: HOME,
    create: { concept: 'housing', sub: 'rent' },
  },
  {
    words: [
      'aseo', 'limpieza', 'detergente', 'jabon', 'papel higienico', 'escoba', 'ferreteria', 'bombillo', 'plomero',
      'cleaning', 'detergent', 'hardware',
    ],
    concept: HOME,
    create: { concept: 'housing', sub: 'home' },
  },
  {
    words: [
      'curso', 'cursos', 'colegio', 'universidad', 'matricula', 'libro', 'libros', 'pension', 'clase', 'clases',
      'utiles', 'cuadernos', 'fotocopias', 'copias', 'platzi', 'udemy', 'coursera', 'course', 'courses',
      'school', 'tuition', 'book', 'books',
    ],
    concept: ['educacion', 'estudio', 'estudios', 'education'],
    create: { concept: 'education', sub: 'courses' },
  },
  {
    words: [
      'ropa', 'zapatos', 'tenis', 'camisa', 'camiseta', 'pantalon', 'jean', 'vestido', 'chaqueta', 'medias',
      'clothes', 'shoes', 'sneakers', 'shirt',
    ],
    concept: ['compras', 'ropa', 'shopping'],
    create: { concept: 'shopping', sub: 'clothes' },
  },
  {
    words: ['amazon', 'mercadolibre', 'mercado libre', 'temu', 'shein', 'aliexpress', 'online'],
    concept: ['compras', 'shopping'],
    create: { concept: 'shopping', sub: 'online' },
  },
  {
    words: [
      'veterinario', 'veterinaria', 'concentrado', 'mascota', 'mascotas', 'perro', 'gato', 'arena gato', 'vet',
      'pet', 'pets', 'dog', 'cat',
    ],
    concept: ['mascotas', 'mascota', 'pets', 'pet'],
    create: { concept: 'pets', sub: 'pets' },
  },
  {
    words: [
      'peluqueria', 'barberia', 'corte de pelo', 'uñas', 'manicure', 'pedicure', 'depilacion', 'spa', 'maquillaje',
      'haircut', 'barber', 'hair', 'nails',
    ],
    concept: ['cuidado personal', 'personal', 'belleza', 'care'],
    create: { concept: 'care', sub: 'hair' },
  },
  {
    words: ['seguro', 'seguros', 'soat', 'poliza', 'insurance'],
    concept: ['seguros', 'seguro', 'insurance'],
    create: { concept: 'insurance', sub: 'insurance' },
  },
  {
    words: ['regalo', 'regalos', 'cumpleanos', 'detalle', 'flores', 'gift', 'gifts', 'present', 'birthday'],
    concept: ['regalos', 'gifts'],
    create: { concept: 'gifts', sub: 'gifts' },
  },
  {
    words: ['hotel', 'hostal', 'airbnb', 'vuelo', 'tiquete', 'avion', 'viaje', 'viajes', 'flight', 'trip', 'travel'],
    concept: ['viajes', 'viaje', 'travel'],
    create: { concept: 'travel', sub: 'travel' },
  },
  {
    words: ['cuota de manejo', 'comision', 'comisiones', '4x1000', 'gmf', 'bank fee', 'fees', 'fee'],
    concept: ['bancos', 'banco', 'banks', 'bank'],
    create: { concept: 'banks', sub: 'fees' },
  },
  {
    words: ['diezmo', 'ofrenda', 'donacion', 'donaciones', 'limosna', 'donation', 'donations', 'charity'],
    concept: ['donaciones', 'donations'],
    create: { concept: 'donations', sub: 'donations' },
  },
];

/** Words that say nothing about what was bought. */
const NOISE = new Set([
  'pago', 'pague', 'pagado', 'compra', 'compre', 'gasto', 'hoy', 'ayer', 'saque', 'plata', 'dinero',
  'efectivo', 'nequi', 'daviplata', 'tarjeta', 'para', 'con', 'del', 'los', 'las', 'varios', 'cosas',
  'otros', 'otro', 'paid', 'bought', 'cash', 'card', 'today', 'yesterday', 'money', 'stuff', 'misc',
]);

/**
 * Lowercase, no accents. "ñ" is kept apart as "nh" so "uñas" (nails) is not
 * "unas" (some).
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ñ/g, 'nh')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Meaningful words of a description: "Almuerzo con Juan 15.000" → ["almuerzo", "juan"]. */
export function noteWords(note: string): string[] {
  return fold(note)
    .split(/[^a-z0-9]+/)
    .filter(
      (w) =>
        // Brands like "D1" are short but have a digit.
        (w.length >= 3 || (w.length === 2 && /\d/.test(w))) &&
        !/^\d+$/.test(w) &&
        !STOPWORDS.has(w) &&
        !NOISE.has(w)
    );
}

function wordMatches(a: string, b: string): boolean {
  if (a === b) return true;
  // Plural / small endings: "almuerzos" ~ "almuerzo", "futbolito" ~ "futbol";
  // not another word that only starts the same ("mercadolibre" is not "mercado").
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 4) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/** One letter off ("almuerso", "gasolna"), only for longer words. */
function oneTypo(a: string, b: string): boolean {
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Position of the first word of `words` that names this phrase, or -1. */
function phraseAt(words: string[], text: string, phrase: string, typos = false): number {
  const p = fold(phrase);
  if (p.includes(' ')) {
    if (!fold(text).includes(p)) return -1;
    return words.findIndex((w) => p.startsWith(w));
  }
  return words.findIndex((w) => wordMatches(w, p) || (typos && oneTypo(w, p)));
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
      const len = fold(sub.name).length;
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

/** The kind of spend a note names first, and the word that named it. */
type KindMatch = { kind: SpendKind; word: string };

function matchKind(words: string[], note: string): KindMatch | null {
  // Exact words first; only when nothing matches, allow a one-letter typo,
  // so a typo never beats a well-written word of another kind.
  for (const typos of [false, true]) {
    // The kind named first wins: "café con pan" is a coffee, not groceries.
    let best: { kind: SpendKind; word: string; at: number } | null = null;
    for (const kind of SPEND_KINDS) {
      for (const k of kind.words) {
        const at = phraseAt(words, note, k, typos);
        if (at < 0) continue;
        // Same position: the longer phrase is more precise ("mercado libre" over "mercado").
        const better = !best || at < best.at || (at === best.at && fold(k).length > best.word.length);
        if (better) best = { kind, word: fold(k), at };
      }
    }
    if (best) return { kind: best.kind, word: best.word };
  }
  return null;
}

const specificWord = (match: KindMatch, k: string) => !!match.kind.create.subFor?.[fold(k)];

/** Same thing in other words: "almuerzo", "almuerzos" and "lunch" are all lunch. */
function sameAsWord(match: KindMatch, kw: string): boolean {
  if (wordMatches(kw, match.word)) return true;
  const subFor = match.kind.create.subFor;
  return !!subFor && !!subFor[kw] && subFor[kw] === subFor[match.word];
}

/**
 * Does a sub named like this hold this spend? "Almuerzos" holds a lunch,
 * "Comidas" holds any meal, "Desayuno" does not hold a lunch.
 */
function subHolds(subName: string, match: KindMatch): boolean {
  const names = noteWords(subName);
  return names.some((nw) =>
    match.kind.words.some((k) => {
      const kw = fold(k);
      if (!wordMatches(nw, kw)) return false;
      return !specificWord(match, kw) || sameAsWord(match, kw);
    })
  );
}

/** A sub named after this very word ("Almuerzo" for "almuerzo"). */
function subNamedForWord(subName: string, match: KindMatch): boolean {
  return noteWords(subName).some(
    (nw) => wordMatches(nw, match.word) || match.kind.words.some((k) => wordMatches(nw, fold(k)) && specificWord(match, k) && sameAsWord(match, fold(k)))
  );
}

function fitsAnyKind(subName: string): boolean {
  const names = noteWords(subName);
  return SPEND_KINDS.some((kind) =>
    names.some((nw) => kind.words.some((k) => wordMatches(nw, fold(k))))
  );
}

/**
 * Can past spends keep this one in that sub? Yes when the sub holds this kind
 * of spend, or is the user's own name for something ("Donde Rosa"). No when
 * it means something else ("Mercado" for a lunch) or nothing ("General").
 */
function subAccepts(subName: string, match: KindMatch): boolean {
  if (subHolds(subName, match)) return true;
  return !isGeneralSubName(subName) && !fitsAnyKind(subName);
}

/**
 * Whether a saved spend with this note already sits in a sub that fits it
 * (used by the category review). True for notes that name no known kind.
 */
export function noteFitsSub(note: string, subName: string): boolean {
  const match = matchKind(noteWords(note), note);
  return !match || subAccepts(subName, match);
}

/**
 * Common words ("almuerzo", "uber", "cancha") → the user's subcategory for that
 * kind of spend; if there is none, the one to create (in their category for it
 * when they have one).
 */
function byKeyword(match: KindMatch, concepts: SpendConcept[]): CategorySuggestion {
  // A sub named for this very word first, then one that holds the kind.
  for (const test of [subNamedForWord, subHolds]) {
    for (const concept of concepts) {
      for (const sub of concept.subs) {
        if (test(sub.name, match)) return { conceptId: concept.id, subId: sub.id, source: 'keyword' };
      }
    }
  }
  const { kind, word } = match;
  const home = kind.concept
    .map((name) => concepts.find((c) => phraseAt(noteWords(c.name), c.name, name) >= 0))
    .find(Boolean);
  return {
    source: 'keyword',
    create: {
      conceptId: home?.id,
      concept: kind.create.concept,
      sub: kind.create.subFor?.[word] ?? kind.create.sub,
      isAnt: kind.create.isAnt === true,
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

  const match = matchKind(words, note);
  const named = byName(words, concepts);
  // A sub named in the note wins, unless the note is about something it
  // does not hold ("mercado libre" is online shopping, not "Mercado").
  if (named && !named.create) {
    const sub = findSpendSub(concepts, named.subId)?.sub;
    if (!match || (sub && subAccepts(sub.name, match))) return named;
  }
  const past = byHistory(words, concepts, history, ignoreTxId);
  if (!match) return past?.s ?? null;
  const keyword = byKeyword(match, concepts);

  // Past spends only count where the sub can hold this spend: never
  // "Mercado" for a lunch, never a catch-all "General".
  const pastSub = past && !past.s.create ? findSpendSub(concepts, past.s.subId)?.sub : undefined;
  const pastOk = !!pastSub && subAccepts(pastSub.name, match);

  // The kind of spend picks the category ("almuerzo" is food); past spends
  // may pick the sub inside it.
  const home = keyword.create ? keyword.create.conceptId : keyword.conceptId;
  if (home) return pastOk && past!.s.conceptId === home ? past!.s : keyword;
  // No category of that kind at all: a habit (twice or more) beats creating one.
  return pastOk && past!.votes >= 2 ? past!.s : keyword;
}
