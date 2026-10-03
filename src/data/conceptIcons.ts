import type { SpendConcept } from '@/src/types/settings';

/** MaterialCommunityIcons names a category can use. Checked against the glyph map. */
export const CONCEPT_ICONS = [
  'receipt-text-outline',
  'credit-card-outline',
  'home-outline',
  'silverware-fork-knife',
  'cart-outline',
  'food-apple-outline',
  'coffee-outline',
  'beer-outline',
  'glass-cocktail',
  'car-outline',
  'gas-station',
  'bus',
  'taxi',
  'motorbike',
  'bicycle',
  'airplane',
  'lightning-bolt-outline',
  'water-outline',
  'wifi',
  'cellphone',
  'play-box-multiple-outline',
  'gamepad-variant-outline',
  'ticket-outline',
  'medical-bag',
  'pill',
  'dumbbell',
  'school-outline',
  'book-open-variant',
  'baby-face-outline',
  'account-group-outline',
  'paw',
  'tshirt-crew-outline',
  'shopping-outline',
  'lipstick',
  'sofa-outline',
  'hammer-wrench',
  'flower-outline',
  'gift-outline',
  'heart-outline',
  'briefcase-outline',
  'bank-outline',
  'piggy-bank-outline',
  'chart-line',
  'cash-multiple',
  'shape-outline',
] as const;

export type ConceptIconName = (typeof CONCEPT_ICONS)[number];

export const DEFAULT_CONCEPT_ICON: ConceptIconName = 'shape-outline';

/** Built-in concepts from onboarding. */
const ICON_BY_CONCEPT_ID: Record<string, ConceptIconName> = {
  'concept-recibos': 'receipt-text-outline',
  'concept-creditos': 'credit-card-outline',
  'concept-transporte': 'car-outline',
  'concept-alimentacion': 'silverware-fork-knife',
  'concept-vivienda': 'home-outline',
};

/** First match wins; words are accent-free and lower case. */
const KEYWORDS: [string[], ConceptIconName][] = [
  [['gasolina', 'combustible', 'fuel', 'gas station'], 'gas-station'],
  [['recibo', 'servicio', 'bill', 'utilit'], 'receipt-text-outline'],
  [['luz', 'energia', 'electric', 'power'], 'lightning-bolt-outline'],
  [['agua', 'water'], 'water-outline'],
  [['internet', 'wifi'], 'wifi'],
  [['celular', 'telefon', 'phone', 'plan movil'], 'cellphone'],
  [['credito', 'tarjeta', 'deuda', 'credit', 'card', 'debt', 'loan', 'prestamo'], 'credit-card-outline'],
  [['arriendo', 'vivienda', 'hogar', 'casa', 'rent', 'housing', 'home'], 'home-outline'],
  [['mercado', 'super', 'grocer', 'market'], 'cart-outline'],
  [['aliment', 'comida', 'restaur', 'food', 'almuerzo', 'lunch'], 'silverware-fork-knife'],
  [['cafe', 'coffee'], 'coffee-outline'],
  [['trago', 'bar', 'cerveza', 'beer', 'drink'], 'beer-outline'],
  [['moto', 'motorbike'], 'motorbike'],
  [['taxi', 'uber', 'didi'], 'taxi'],
  [['bus', 'transmilenio', 'metro'], 'bus'],
  [['transport', 'carro', 'car', 'parqueadero', 'parking', 'peaje'], 'car-outline'],
  [['bici', 'bike'], 'bicycle'],
  [['viaje', 'vuelo', 'travel', 'trip', 'flight'], 'airplane'],
  [['suscrip', 'streaming', 'netflix', 'spotify', 'subscription'], 'play-box-multiple-outline'],
  [['ocio', 'entreten', 'juego', 'fun', 'game', 'entertain'], 'gamepad-variant-outline'],
  [['cine', 'evento', 'concierto', 'movie', 'event'], 'ticket-outline'],
  [['salud', 'medic', 'eps', 'health', 'doctor'], 'medical-bag'],
  [['farmacia', 'droga', 'pharma'], 'pill'],
  [['gym', 'gimnasio', 'deporte', 'sport', 'futbol'], 'dumbbell'],
  [['educa', 'colegio', 'universidad', 'school', 'curso', 'course'], 'school-outline'],
  [['libro', 'book'], 'book-open-variant'],
  [['bebe', 'hijo', 'baby', 'kid'], 'baby-face-outline'],
  [['familia', 'family'], 'account-group-outline'],
  [['mascota', 'perro', 'gato', 'pet', 'dog', 'cat'], 'paw'],
  [['ropa', 'clothes', 'clothing'], 'tshirt-crew-outline'],
  [['compra', 'shopping'], 'shopping-outline'],
  [['belleza', 'beauty', 'peluqueria'], 'lipstick'],
  [['mueble', 'furniture'], 'sofa-outline'],
  [['arreglo', 'reparac', 'repair', 'mantenimiento'], 'hammer-wrench'],
  [['regalo', 'gift'], 'gift-outline'],
  [['donac', 'donation', 'caridad'], 'heart-outline'],
  [['trabajo', 'oficina', 'work', 'office'], 'briefcase-outline'],
  [['impuesto', 'banco', 'tax', 'bank'], 'bank-outline'],
  [['ahorro', 'saving'], 'piggy-bank-outline'],
  [['inversion', 'invest'], 'chart-line'],
  [['otro', 'general', 'other', 'adicional'], 'cash-multiple'],
];

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Best icon for a concept from its id (built-ins) or its name. */
export function guessConceptIcon(concept: Pick<SpendConcept, 'id' | 'name'>): ConceptIconName {
  const byId = ICON_BY_CONCEPT_ID[concept.id];
  if (byId) return byId;
  const name = fold(concept.name);
  for (const [words, icon] of KEYWORDS) {
    if (words.some((w) => name.includes(w))) return icon;
  }
  return DEFAULT_CONCEPT_ICON;
}

export function isConceptIcon(value: unknown): value is ConceptIconName {
  return typeof value === 'string' && (CONCEPT_ICONS as readonly string[]).includes(value);
}

/** Give every concept an icon (existing data predates icons). */
export function ensureConceptIcons(concepts: SpendConcept[]): {
  concepts: SpendConcept[];
  changed: boolean;
} {
  let changed = false;
  const next = concepts.map((c) => {
    if (isConceptIcon(c.icon)) return c;
    changed = true;
    return { ...c, icon: guessConceptIcon(c) };
  });
  return { concepts: changed ? next : concepts, changed };
}
