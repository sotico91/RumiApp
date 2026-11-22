import { interpolate } from '@/src/i18n/interpolate';
import { translations, type TranslationKey } from '@/src/i18n/translations';
import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { askRumi } from '@/src/utils/ask';
import { formatMoney } from '@/src/utils/money';

/**
 * Questions name spends the way notes do ("gasolina", "el perro"), not by the
 * category name. They must reach the person's own category for that kind of
 * spend, and "la comida de mi mascota" is a pet spend, not food.
 */
function translator(lang: 'en' | 'es') {
  const dict = translations[lang] as Record<string, string>;
  return (key: TranslationKey, params?: Record<string, string | number>) =>
    interpolate(dict[key] ?? key, params);
}
const format = (n: number) => formatMoney(n, 'COP');

const concept = (id: string, name: string, subs: [string, string][]): SpendConcept => ({
  id,
  name,
  color: '#000',
  subs: subs.map(([subId, subName]) => ({ id: subId, name: subName })),
});

const tree: SpendConcept[] = [
  concept('concept-alimentacion', 'Alimentación', [['sub-lunch', 'Almuerzos'], ['sub-groceries', 'Mercado']]),
  concept('concept-transporte', 'Transporte', [['sub-fuel', 'Gasolina'], ['sub-upkeep', 'Mantenimiento']]),
  concept('concept-vivienda', 'Vivienda', [['sub-rent', 'Arriendo']]),
  concept('concept-salud', 'Salud', [['sub-doctor', 'Médico']]),
  concept('concept-pets', 'Mascotas', [['sub-vet', 'Veterinario'], ['sub-petfood', 'Concentrado']]),
];

let seq = 0;
const spend = (amount: number, when: string, categoryId: string, note?: string): Transaction => {
  seq += 1;
  return { id: `k${seq}`, type: 'expense', amount, createdAt: new Date(when).toISOString(), accountId: 'cash', categoryId, note };
};

const data = [
  spend(90_000, '2026-11-04T10:00', 'sub-petfood', 'Bulto Dog Chow'),
  spend(120_000, '2026-10-20T10:00', 'sub-vet', 'Vacunas'),
  spend(200_000, '2026-11-02T10:00', 'sub-groceries', 'D1'),
  spend(150_000, '2026-11-10T10:00', 'sub-fuel', 'Terpel'),
  spend(80_000, '2026-11-12T10:00', 'sub-upkeep', 'Cambio de aceite'),
  spend(1_500_000, '2026-11-01T10:00', 'sub-rent'),
  spend(60_000, '2026-11-08T10:00', 'sub-doctor', 'Cita'),
];

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-11-21T12:00:00'));
});
afterEach(() => jest.useRealTimers());

const ask = (q: string, language: 'es' | 'en' = 'es', concepts = tree, txs = data) =>
  askRumi(q, txs, format, translator(language), { language, spendConcepts: concepts });

describe('spend words reach the person’s category', () => {
  it.each<[string, 'es' | 'en', string]>([
    ['¿en qué fecha compré la comida de mi mascota?', 'es', 'Mascotas'],
    ['¿cuánto gasté en comida para el perro?', 'es', 'Mascotas'],
    ['when did I buy food for my dog?', 'en', 'Mascotas'],
    ['¿cuándo compré el concentrado del perro?', 'es', 'Mascotas/Concentrado'],
    ['¿cuándo llevé al gato al veterinario?', 'es', 'Mascotas/Veterinario'],
    ['¿qué día eché gasolina?', 'es', 'Transporte/Gasolina'],
    ['¿cuándo tanqueé el carro?', 'es', 'Transporte/Gasolina'],
    ['when did I buy fuel?', 'en', 'Transporte/Gasolina'],
    ['¿cuándo le hice mantenimiento a la moto?', 'es', 'Transporte/Mantenimiento'],
    ['¿en qué fecha fui al médico?', 'es', 'Salud/Médico'],
    ['¿cuándo hice mercado?', 'es', 'Alimentación/Mercado'],
  ])('%s → %s', (q, language, concept) => {
    expect(ask(q, language).understood?.concept).toBe(concept);
  });

  it('gives every date when it happened more than once', () => {
    const r = ask('¿en qué fecha compré la comida de mi mascota?');
    expect(r.intent).toBe('when');
    expect(r.text).toBe(
      `“Mascotas” (todo tu historial): 2 veces, ${format(210_000)} en total. ` +
        `4 de noviembre: Bulto Dog Chow ${format(90_000)} · 20 de octubre: Vacunas ${format(120_000)}.`
    );
  });

  it('with no pet category, "comida" does not answer with all the food', () => {
    const noPets = tree.filter((c) => c.id !== 'concept-pets');
    const txs = [spend(60_000, '2026-10-12T10:00', 'sub-groceries', 'Comida del perro'), ...data.slice(2)];
    const r = ask('¿cuándo compré la comida de mi perro?', 'es', noPets, txs);
    expect(r.intent).toBe('when');
    expect(r.text).toBe(`“comida perro”: el 12 de octubre, por ${format(60_000)}.`);
  });

  it('a category name in the question still wins over a spend word', () => {
    expect(ask('¿cuánto gasté en mascotas?').understood?.concept).toBe('Mascotas');
    expect(ask('¿cuánto gasté en arriendo?').understood?.concept).toBe('Vivienda/Arriendo');
  });
});
