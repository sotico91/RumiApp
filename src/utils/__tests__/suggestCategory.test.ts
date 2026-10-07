import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { buildNoteHistory, noteWords, suggestCategory } from '@/src/utils/suggestCategory';

const concepts: SpendConcept[] = [
  {
    id: 'concept-creditos',
    name: 'Créditos',
    color: '#E63946',
    subs: [{ id: 'sub-card', name: 'Tarjeta almuerzos' }],
  },
  {
    id: 'concept-alimentacion',
    name: 'Alimentación',
    color: '#E07A5F',
    subs: [
      { id: 'sub-general-food', name: 'General' },
      { id: 'sub-almuerzo', name: 'Almuerzo' },
      { id: 'sub-cafe', name: 'Café', isAnt: true },
      { id: 'sub-mercado', name: 'Mercado' },
    ],
  },
  {
    id: 'concept-transporte',
    name: 'Transporte',
    color: '#2EC4B6',
    subs: [
      { id: 'sub-general-transport', name: 'General' },
      { id: 'sub-taxi', name: 'Taxi y apps', isAnt: true },
    ],
  },
  {
    id: 'concept-ocio',
    name: 'Ocio',
    color: '#9B5DE5',
    subs: [{ id: 'sub-salidas', name: 'Salidas' }],
  },
];

const empty = buildNoteHistory([]);

function tx(id: string, note: string, categoryId: string): Transaction {
  return { id, type: 'expense', amount: 10000, categoryId, note, createdAt: '2026-09-01T12:00:00.000Z' };
}

describe('suggestCategory', () => {
  it('uses a subcategory named in the note', () => {
    expect(suggestCategory('almuerzo oficina', concepts, empty)).toMatchObject({
      subId: 'sub-almuerzo',
      source: 'name',
    });
  });

  it('places breakfast with meals, under the user food category', () => {
    expect(suggestCategory('Desayuno', concepts, empty)).toMatchObject({
      conceptId: 'concept-alimentacion',
      subId: 'sub-almuerzo',
      source: 'keyword',
    });
  });

  it('sends rides to transport, preferring a matching sub', () => {
    expect(suggestCategory('uber al trabajo', concepts, empty)?.subId).toBe('sub-taxi');
    expect(suggestCategory('pasaje bus', concepts, empty)?.subId).toBe('sub-taxi');
  });

  it('puts football under leisure when there is no sport category', () => {
    expect(suggestCategory('saqué plata para fútbol', concepts, empty)).toMatchObject({
      conceptId: 'concept-ocio',
      subId: 'sub-salidas',
    });
  });

  it('prefers a Fútbol subcategory when the user has one', () => {
    const withSport: SpendConcept[] = [
      ...concepts,
      { id: 'concept-deporte', name: 'Deporte', color: '#06D6A0', subs: [{ id: 'sub-futbol', name: 'Fútbol' }] },
    ];
    expect(suggestCategory('cancha futbol jueves', withSport, empty)?.subId).toBe('sub-futbol');
  });

  it('lets the first thing named win', () => {
    expect(suggestCategory('café con pan', concepts, empty)?.subId).toBe('sub-cafe');
  });

  it('learns the user words from past spends', () => {
    const history = buildNoteHistory([
      tx('1', 'donde Rosa', 'sub-almuerzo'),
      tx('2', 'Donde rosa', 'sub-almuerzo'),
    ]);
    expect(suggestCategory('donde rosa', concepts, history)).toMatchObject({
      subId: 'sub-almuerzo',
      source: 'history',
    });
  });

  it('never suggests Credits for a spend', () => {
    expect(suggestCategory('tarjeta almuerzos', concepts, empty)?.conceptId).not.toBe(
      'concept-creditos'
    );
  });

  it('gives nothing for an empty or unknown note', () => {
    expect(suggestCategory('', concepts, empty)).toBeNull();
    expect(suggestCategory('15.000', concepts, empty)).toBeNull();
    expect(suggestCategory('xyzzy', concepts, empty)).toBeNull();
  });

  it('ignores past spends in subcategories that no longer exist', () => {
    const history = buildNoteHistory([tx('1', 'gym', 'sub-borrada'), tx('2', 'gym', 'sub-borrada')]);
    expect(suggestCategory('gym', concepts, history)?.subId).toBe('sub-salidas');
  });
});

describe('noteWords', () => {
  it('drops amounts and filler', () => {
    expect(noteWords('Pagué almuerzo con Juan 15000')).toEqual(['almuerzo', 'juan']);
  });
});
