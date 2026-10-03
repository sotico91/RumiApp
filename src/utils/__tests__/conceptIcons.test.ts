import { CONCEPT_ICONS, ensureConceptIcons, guessConceptIcon } from '@/src/data/conceptIcons';
import { categoryVisual, createSpendConcept, subColor } from '@/src/data/spendConcepts';
import type { SpendConcept } from '@/src/types/settings';

describe('guessConceptIcon', () => {
  it.each([
    ['concept-recibos', 'Recibos', 'receipt-text-outline'],
    ['concept-creditos', 'Créditos', 'credit-card-outline'],
    ['x', 'Gasolina moto', 'gas-station'],
    ['x', 'Mercado', 'cart-outline'],
    ['x', 'Mascotas', 'paw'],
    ['x', 'Pets', 'paw'],
    ['x', 'Educación', 'school-outline'],
    ['x', 'Cosas raras', 'shape-outline'],
  ])('%s / %p → %p', (id, name, icon) => {
    expect(guessConceptIcon({ id, name })).toBe(icon);
  });

  it('only suggests icons from the catalog', () => {
    expect(CONCEPT_ICONS).toContain(guessConceptIcon({ id: 'x', name: 'Viajes' }));
  });
});

describe('ensureConceptIcons', () => {
  it('adds icons to concepts saved before icons existed, once', () => {
    const old: SpendConcept[] = [{ id: 'c1', name: 'Gasolina', color: '#000', subs: [] }];
    const first = ensureConceptIcons(old);
    expect(first.changed).toBe(true);
    expect(first.concepts[0].icon).toBe('gas-station');
    expect(ensureConceptIcons(first.concepts).changed).toBe(false);
  });

  it('keeps an icon the user picked', () => {
    const picked: SpendConcept[] = [{ id: 'c1', name: 'Gasolina', color: '#000', icon: 'car-outline', subs: [] }];
    expect(ensureConceptIcons(picked).changed).toBe(false);
  });
});

describe('category colors', () => {
  const concept: SpendConcept = {
    id: 'c1',
    name: 'Recibos',
    color: '#111111',
    icon: 'receipt-text-outline',
    subs: [
      { id: 's1', name: 'Luz', color: '#FF0000' },
      { id: 's2', name: 'Agua' },
    ],
  };

  it('uses the sub color, or falls back to the category color', () => {
    expect(subColor(concept, concept.subs[0])).toBe('#FF0000');
    expect(subColor(concept, concept.subs[1])).toBe('#111111');
  });

  it('pairs the category icon with the sub color', () => {
    expect(categoryVisual('s1', [concept])).toEqual({ icon: 'receipt-text-outline', color: '#FF0000' });
  });

  it('gives new concepts an icon from their name', () => {
    expect(createSpendConcept('Gasolina').icon).toBe('gas-station');
  });
});
