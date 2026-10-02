import { CREDITS_CONCEPT_ID, localizeDefaultConcepts } from '@/src/data/spendConcepts';
import type { SpendConcept } from '@/src/types/settings';

const concept = (id: string, name: string): SpendConcept => ({ id, name, color: '#000', subs: [] });

describe('localizeDefaultConcepts', () => {
  it('translates default concepts created in another language', () => {
    const { concepts, changed } = localizeDefaultConcepts(
      [concept('concept-recibos', 'Bills'), concept('concept-transporte', 'Transport')],
      'es'
    );
    expect(changed).toBe(true);
    expect(concepts.map((c) => c.name)).toEqual(['Recibos', 'Transporte']);
  });

  it('switches back to English', () => {
    const { concepts } = localizeDefaultConcepts([concept('concept-vivienda', 'Vivienda')], 'en');
    expect(concepts[0].name).toBe('Housing');
  });

  it('localizes the credits concept that was always created in Spanish', () => {
    const { concepts } = localizeDefaultConcepts([concept(CREDITS_CONCEPT_ID, 'Créditos')], 'en');
    expect(concepts[0].name).toBe('Credit');
  });

  it('translates subcategories created from templates, but not your own', () => {
    const food: SpendConcept = {
      id: 'concept-alimentacion',
      name: 'Food',
      color: '#000',
      subs: [
        { id: 'sub-a', name: 'Coffee' },
        { id: 'sub-b', name: 'Almuerzo oficina' },
      ],
    };
    const { concepts } = localizeDefaultConcepts([food], 'es');
    expect(concepts[0].name).toBe('Alimentación');
    expect(concepts[0].subs.map((s) => s.name)).toEqual(['Café', 'Almuerzo oficina']);
    expect(concepts[0].subs[0].id).toBe('sub-a');
  });

  it('never touches concepts the user named', () => {
    const own = [concept('concept-recibos', 'Servicios de casa'), concept('custom-x', 'Mascotas')];
    const { concepts, changed } = localizeDefaultConcepts(own, 'en');
    expect(changed).toBe(false);
    expect(concepts).toBe(own);
  });
});
