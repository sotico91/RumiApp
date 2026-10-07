import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { translations } from '@/src/i18n/translations';
import {
  buildNoteHistory,
  noteWords,
  SPEND_KINDS,
  suggestCategory,
} from '@/src/utils/suggestCategory';

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

  it('sends rides to the matching transport sub', () => {
    expect(suggestCategory('uber al trabajo', concepts, empty)?.subId).toBe('sub-taxi');
  });

  it('creates a missing sub inside the user category for it', () => {
    expect(suggestCategory('pasaje bus', concepts, empty)).toEqual({
      source: 'keyword',
      create: { conceptId: 'concept-transporte', concept: 'transport', sub: 'transit', isAnt: false },
    });
    expect(suggestCategory('gasolina', concepts, empty)?.create).toMatchObject({
      conceptId: 'concept-transporte',
      sub: 'fuel',
    });
  });

  it('puts football in leisure when there is no sport category', () => {
    expect(suggestCategory('saqué plata para fútbol', concepts, empty)?.create).toEqual({
      conceptId: 'concept-ocio',
      concept: 'sport',
      sub: 'football',
      isAnt: false,
    });
  });

  it('creates the category too when the user has none for it', () => {
    expect(suggestCategory('veterinario', concepts, empty)?.create).toEqual({
      conceptId: undefined,
      concept: 'pets',
      sub: 'pets',
      isAnt: false,
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

  it('keeps a lunch in food even if older lunches went to a catch-all', () => {
    const withExtra: SpendConcept[] = [
      ...concepts,
      { id: 'concept-extra', name: 'Gastos adicionales', color: '#7A8790', subs: [{ id: 'sub-extra', name: 'General' }] },
    ];
    const history = buildNoteHistory([
      tx('1', 'almuerzo', 'sub-extra'),
      tx('2', 'Almuerzo trabajo', 'sub-extra'),
      tx('3', 'almuerzo', 'sub-extra'),
    ]);
    expect(suggestCategory('desayuno', withExtra, history)?.subId).toBe('sub-almuerzo');
    expect(suggestCategory('corrientazo', withExtra, history)?.conceptId).toBe('concept-alimentacion');
  });

  it('uses past spends to pick the sub inside the right category', () => {
    const history = buildNoteHistory([tx('1', 'corrientazo', 'sub-mercado'), tx('2', 'corrientazo', 'sub-mercado')]);
    expect(suggestCategory('corrientazo', concepts, history)?.subId).toBe('sub-mercado');
  });

  it('follows a habit when there is no category for that kind of spend', () => {
    const history = buildNoteHistory([tx('1', 'veterinario', 'sub-salidas'), tx('2', 'veterinario', 'sub-salidas')]);
    expect(suggestCategory('veterinario', concepts, history)?.subId).toBe('sub-salidas');
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
    expect(suggestCategory('gym', concepts, history)?.create?.sub).toBe('gym');
  });
});

describe('English categories', () => {
  const en: SpendConcept[] = [
    {
      id: 'concept-food',
      name: 'Food',
      color: '#E07A5F',
      subs: [
        { id: 'sub-food-general', name: 'General' },
        { id: 'sub-food-lunch', name: 'Lunch' },
      ],
    },
    {
      id: 'concept-transport',
      name: 'Transport',
      color: '#2EC4B6',
      subs: [{ id: 'sub-transport-rides', name: 'Rides & taxis', isAnt: true }],
    },
  ];

  it('reads English notes like Spanish ones', () => {
    expect(suggestCategory('Lunch with Ana', en, empty)?.subId).toBe('sub-food-lunch');
    expect(suggestCategory('breakfast', en, empty)?.subId).toBe('sub-food-lunch');
    expect(suggestCategory('uber home', en, empty)?.subId).toBe('sub-transport-rides');
    expect(suggestCategory('gas station', en, empty)?.create).toMatchObject({
      conceptId: 'concept-transport',
      sub: 'fuel',
    });
    expect(suggestCategory('soccer field', en, empty)?.create).toMatchObject({
      conceptId: undefined,
      concept: 'sport',
      sub: 'football',
    });
  });

  it('understands Spanish words in an English tree too', () => {
    expect(suggestCategory('almuerzo', en, empty)?.subId).toBe('sub-food-lunch');
  });
});

describe('what Rumi creates', () => {
  // Creating once is enough: the next spend with the same word finds it.
  it.each(['es', 'en'] as const)('is found again next time (%s)', (lang) => {
    const copy = translations[lang] as Record<string, string>;
    for (const kind of SPEND_KINDS) {
      const conceptName = copy[`newCat.${kind.create.concept}`];
      const subName = copy[`newSub.${kind.create.sub}`];
      const tree: SpendConcept[] = [
        { id: 'c-new', name: conceptName, color: '#000000', subs: [{ id: 's-new', name: subName }] },
      ];
      const word = kind.words.find((w) => !w.includes(' '))!;
      const hit = suggestCategory(word, tree, empty);
      expect({ word, subId: hit?.subId }).toEqual({ word, subId: 's-new' });
    }
  });

  it.each(['es', 'en'] as const)('keeps every kind apart in a full tree (%s)', (lang) => {
    const copy = translations[lang] as Record<string, string>;
    const tree: SpendConcept[] = [];
    for (const kind of SPEND_KINDS) {
      const name = copy[`newCat.${kind.create.concept}`];
      let concept = tree.find((c) => c.name === name);
      if (!concept) {
        concept = { id: `c-${kind.create.concept}`, name, color: '#000000', subs: [] };
        tree.push(concept);
      }
      const subId = `s-${kind.create.sub}`;
      if (!concept.subs.some((sub) => sub.id === subId)) {
        concept.subs.push({ id: subId, name: copy[`newSub.${kind.create.sub}`] });
      }
    }
    for (const kind of SPEND_KINDS) {
      for (const word of kind.words.filter((w) => !w.includes(' '))) {
        const hit = suggestCategory(word, tree, empty);
        expect({ word, subId: hit?.subId }).toEqual({ word, subId: `s-${kind.create.sub}` });
      }
    }
  });

  it('has copy for every category and subcategory it creates', () => {
    for (const lang of ['es', 'en'] as const) {
      const copy = translations[lang] as Record<string, string>;
      for (const kind of SPEND_KINDS) {
        expect(copy[`newCat.${kind.create.concept}`]).toBeTruthy();
        expect(copy[`newSub.${kind.create.sub}`]).toBeTruthy();
      }
    }
  });
});

describe('noteWords', () => {
  it('drops amounts and filler', () => {
    expect(noteWords('Pagué almuerzo con Juan 15000')).toEqual(['almuerzo', 'juan']);
  });
});
