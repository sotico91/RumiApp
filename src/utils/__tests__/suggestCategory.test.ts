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

  it('keeps breakfast apart from lunch, in the user food category', () => {
    expect(suggestCategory('Desayuno', concepts, empty)?.create).toEqual({
      conceptId: 'concept-alimentacion',
      concept: 'food',
      sub: 'breakfast',
      isAnt: false,
    });
  });

  it('never files a lunch under Mercado (groceries for home)', () => {
    const noLunch: SpendConcept[] = [
      {
        id: 'concept-alimentacion',
        name: 'Alimentación',
        color: '#E07A5F',
        subs: [{ id: 'sub-mercado', name: 'Mercado' }],
      },
    ];
    const history = buildNoteHistory([tx('1', 'almuerzo', 'sub-mercado'), tx('2', 'almuerzo', 'sub-mercado')]);
    expect(suggestCategory('almuerzo', noLunch, history)?.create).toMatchObject({
      conceptId: 'concept-alimentacion',
      sub: 'lunch',
    });
    // A category called Mercado is not a home for meals either.
    const mercado: SpendConcept[] = [
      { id: 'concept-mercado', name: 'Mercado', color: '#000000', subs: [{ id: 'sub-m', name: 'General' }] },
    ];
    expect(suggestCategory('almuerzo', mercado, empty)?.create?.conceptId).toBeUndefined();
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
    expect(suggestCategory('almuerzo', withExtra, history)?.subId).toBe('sub-almuerzo');
    expect(suggestCategory('corrientazo', withExtra, history)?.create).toMatchObject({
      conceptId: 'concept-alimentacion',
      sub: 'meals',
    });
  });

  it('uses past spends to pick the user own sub inside the right category', () => {
    const withRosa: SpendConcept[] = concepts.map((c) =>
      c.id === 'concept-alimentacion' ? { ...c, subs: [...c.subs, { id: 'sub-rosa', name: 'Donde Rosa' }] } : c
    );
    const history = buildNoteHistory([tx('1', 'corrientazo', 'sub-rosa'), tx('2', 'corrientazo', 'sub-rosa')]);
    expect(suggestCategory('corrientazo', withRosa, history)?.subId).toBe('sub-rosa');
  });

  it('counts past spends, not words: one spend with two words is one vote', () => {
    const bare: SpendConcept[] = [
      concepts[1],
      { id: 'concept-extra', name: 'Gastos adicionales', color: '#7A8790', subs: [{ id: 'sub-extra', name: 'Grupo Juan' }] },
    ];
    const history = buildNoteHistory([tx('1', 'cancha fútbol', 'sub-extra')]);
    expect(suggestCategory('cancha fútbol', bare, history)?.create?.sub).toBe('football');
    // Two different spends are a habit.
    const twice = buildNoteHistory([tx('1', 'cancha fútbol', 'sub-extra'), tx('2', 'fútbol', 'sub-extra')]);
    expect(suggestCategory('cancha fútbol', bare, twice)?.subId).toBe('sub-extra');
  });

  it('follows a habit when there is no category for that kind of spend', () => {
    const withLuna: SpendConcept[] = [
      ...concepts,
      { id: 'concept-luna', name: 'Luna', color: '#000000', subs: [{ id: 'sub-luna', name: 'Cosas de Luna' }] },
    ];
    const history = buildNoteHistory([tx('1', 'veterinario', 'sub-luna'), tx('2', 'veterinario', 'sub-luna')]);
    expect(suggestCategory('veterinario', withLuna, history)?.subId).toBe('sub-luna');
  });

  it('ignores a habit in a sub that means something else', () => {
    const history = buildNoteHistory([tx('1', 'veterinario', 'sub-salidas'), tx('2', 'veterinario', 'sub-salidas')]);
    expect(suggestCategory('veterinario', concepts, history)?.create?.sub).toBe('pets');
  });

  it('knows a lunch while it is being typed or fixed', () => {
    const noLunch: SpendConcept[] = [
      { id: 'concept-alimentacion', name: 'Alimentación', color: '#E07A5F', subs: [{ id: 'sub-mercado', name: 'Mercado' }] },
    ];
    for (const partial of ['almu', 'almue', 'almuer', 'almuerz', 'almuerzo', 'almerzo', 'almuerso']) {
      expect({ partial, sub: suggestCategory(partial, noLunch, empty)?.create?.sub }).toEqual({ partial, sub: 'lunch' });
    }
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
    expect(suggestCategory('breakfast', en, empty)?.create).toMatchObject({
      conceptId: 'concept-food',
      sub: 'breakfast',
    });
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

  it.each(['es', 'en'] as const)('finds Lunch / Breakfast / Dinner again, by any of their words (%s)', (lang) => {
    const copy = translations[lang] as Record<string, string>;
    const meals = SPEND_KINDS.find((k) => k.create.subFor)!;
    for (const [word, sub] of Object.entries(meals.create.subFor!)) {
      const tree: SpendConcept[] = [
        { id: 'c-food', name: copy['newCat.food'], color: '#000000', subs: [{ id: 's-x', name: copy[`newSub.${sub}`] }] },
      ];
      expect({ word, subId: suggestCategory(word, tree, empty)?.subId }).toEqual({ word, subId: 's-x' });
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
