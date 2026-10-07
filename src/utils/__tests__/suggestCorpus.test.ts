import { translations } from '@/src/i18n/translations';
import type { SpendConcept } from '@/src/types/settings';
import { buildNoteHistory, suggestCategory, type CategorySuggestion } from '@/src/utils/suggestCategory';

/**
 * Real-life descriptions → where a person would file them, on a tree like
 * the one onboarding leaves plus a couple of the user's own categories.
 * "+" marks a subcategory Rumi has to create.
 */
const es = translations.es as Record<string, string>;
const en = translations.en as Record<string, string>;

const esTree: SpendConcept[] = [
  { id: 'c-recibos', name: 'Recibos', color: '#000', subs: [{ id: 's-recibos-general', name: 'General' }, { id: 's-subs', name: 'Suscripciones', isAnt: true }] },
  { id: 'concept-creditos', name: 'Créditos', color: '#000', subs: [{ id: 's-cred', name: 'General' }] },
  { id: 'c-transporte', name: 'Transporte', color: '#000', subs: [{ id: 's-trans-general', name: 'General' }, { id: 's-taxi', name: 'Taxi y apps', isAnt: true }] },
  {
    id: 'c-alimentacion',
    name: 'Alimentación',
    color: '#000',
    subs: [
      { id: 's-mercado', name: 'Mercado' },
      { id: 's-cafe', name: 'Café', isAnt: true },
      { id: 's-domicilios', name: 'Domicilios', isAnt: true },
      { id: 's-antojos', name: 'Antojos', isAnt: true },
    ],
  },
  { id: 'c-vivienda', name: 'Vivienda', color: '#000', subs: [{ id: 's-viv-general', name: 'General' }] },
  { id: 'c-extra', name: 'Gastos adicionales', color: '#000', subs: [{ id: 's-extra', name: 'General' }] },
];

function label(s: CategorySuggestion | null, tree: SpendConcept[], copy: Record<string, string>): string {
  if (!s) return '—';
  if (s.create) {
    const parent = tree.find((c) => c.id === s.create.conceptId)?.name ?? copy[`newCat.${s.create.concept}`];
    return `+${parent} · ${copy[`newSub.${s.create.sub}`]}`;
  }
  const c = tree.find((x) => x.id === s.conceptId)!;
  const sub = c.subs.find((x) => x.id === s.subId)!;
  return sub.name === 'General' ? c.name : `${c.name} · ${sub.name}`;
}

const ES_CASES: [string, string][] = [
  // Food out
  ['almuerzo', '+Alimentación · Almuerzo'],
  ['Almuerzo con compañeros', '+Alimentación · Almuerzo'],
  ['almorcé en la oficina', '+Alimentación · Almuerzo'],
  ['almuerso', '+Alimentación · Almuerzo'],
  ['corrientazo', '+Alimentación · Comidas'],
  ['menú del día', '+Alimentación · Comidas'],
  ['desayuno', '+Alimentación · Desayuno'],
  ['cena con mi novia', '+Alimentación · Cena'],
  ['hamburguesa', '+Alimentación · Comidas'],
  ['salchipapa', '+Alimentación · Comidas'],
  ['pizza', '+Alimentación · Comidas'],
  ['restaurante', '+Alimentación · Comidas'],
  ['frisby', '+Alimentación · Comidas'],
  ['mcdonalds', '+Alimentación · Comidas'],
  // Groceries
  ['mercado', 'Alimentación · Mercado'],
  ['mercado del mes', 'Alimentación · Mercado'],
  ['D1', 'Alimentación · Mercado'],
  ['éxito', 'Alimentación · Mercado'],
  ['tienda de la esquina', 'Alimentación · Mercado'],
  ['verduras plaza', 'Alimentación · Mercado'],
  ['huevos y leche', 'Alimentación · Mercado'],
  ['panadería', 'Alimentación · Mercado'],
  ['carulla', 'Alimentación · Mercado'],
  // Coffee / snacks / delivery
  ['tinto', 'Alimentación · Café'],
  ['juan valdez', 'Alimentación · Café'],
  ['café con pan', 'Alimentación · Café'],
  ['mecato', 'Alimentación · Antojos'],
  ['empanada', 'Alimentación · Antojos'],
  ['helado', 'Alimentación · Antojos'],
  ['gaseosa', 'Alimentación · Antojos'],
  ['rappi', 'Alimentación · Domicilios'],
  ['domicilio pizza', 'Alimentación · Domicilios'],
  // Transport
  ['uber', 'Transporte · Taxi y apps'],
  ['taxi al aeropuerto', 'Transporte · Taxi y apps'],
  ['didi', 'Transporte · Taxi y apps'],
  ['transmilenio', '+Transporte · Pasajes'],
  ['pasaje bus', '+Transporte · Pasajes'],
  ['recarga tullave', '+Transporte · Pasajes'],
  ['metro', '+Transporte · Pasajes'],
  ['gasolina', '+Transporte · Gasolina'],
  ['tanqueada', '+Transporte · Gasolina'],
  ['gasolna', '+Transporte · Gasolina'],
  ['peaje', '+Transporte · Peajes y parqueo'],
  ['parqueadero centro comercial', '+Transporte · Peajes y parqueo'],
  ['taller cambio de aceite', '+Transporte · Mantenimiento'],
  ['llantas', '+Transporte · Mantenimiento'],
  ['lavada del carro', '+Transporte · Mantenimiento'],
  ['soat', '+Seguros · Seguros'],
  // Bills
  ['recibo de la luz', '+Recibos · Luz'],
  ['enel', '+Recibos · Luz'],
  ['agua', '+Recibos · Agua'],
  ['gas natural', '+Recibos · Gas'],
  ['vanti', '+Recibos · Gas'],
  ['internet', '+Recibos · Internet'],
  ['plan celular', '+Recibos · Celular'],
  ['recarga celular', '+Recibos · Celular'],
  ['claro', '+Recibos · Celular'],
  ['netflix', 'Recibos · Suscripciones'],
  ['spotify', 'Recibos · Suscripciones'],
  // Housing / home
  ['arriendo', '+Vivienda · Arriendo'],
  ['administración del edificio', '+Vivienda · Arriendo'],
  ['detergente y jabón', '+Vivienda · Aseo y hogar'],
  ['papel higiénico', '+Vivienda · Aseo y hogar'],
  ['ferretería', '+Vivienda · Aseo y hogar'],
  // Health
  ['droguería', '+Salud · Farmacia y médico'],
  ['pastillas para el dolor', '+Salud · Farmacia y médico'],
  ['cita médica', '+Salud · Farmacia y médico'],
  ['odontólogo', '+Salud · Farmacia y médico'],
  ['copago eps', '+Salud · Farmacia y médico'],
  // Leisure / sport
  ['fútbol', '+Deporte · Fútbol'],
  ['cancha sintética', '+Deporte · Fútbol'],
  ['microfútbol con los amigos', '+Deporte · Fútbol'],
  ['gimnasio', '+Deporte · Gimnasio'],
  ['smart fit', '+Deporte · Gimnasio'],
  ['cine', '+Ocio · Salidas'],
  ['cervezas', '+Ocio · Salidas'],
  ['boletas concierto', '+Ocio · Salidas'],
  ['rumba viernes', '+Ocio · Salidas'],
  ['steam', '+Ocio · Juegos'],
  // Education / shopping / care / pets
  ['curso de inglés', '+Educación · Cursos y estudio'],
  ['matrícula universidad', '+Educación · Cursos y estudio'],
  ['útiles escolares', '+Educación · Cursos y estudio'],
  ['fotocopias', '+Educación · Cursos y estudio'],
  ['ropa', '+Compras · Ropa'],
  ['tenis nuevos', '+Compras · Ropa'],
  ['zapatos', '+Compras · Ropa'],
  ['amazon', '+Compras · Compras online'],
  ['mercadolibre', '+Compras · Compras online'],
  ['peluquería', '+Cuidado personal · Peluquería'],
  ['corte de pelo', '+Cuidado personal · Peluquería'],
  ['uñas', '+Cuidado personal · Peluquería'],
  ['veterinario', '+Mascotas · Veterinario y concentrado'],
  ['concentrado del perro', '+Mascotas · Veterinario y concentrado'],
  // Other life
  ['regalo cumpleaños mamá', '+Regalos · Regalos'],
  ['hotel en cartagena', '+Viajes · Viajes'],
  ['tiquete de avión', '+Viajes · Viajes'],
  ['cuota de manejo', '+Bancos · Comisiones'],
  ['4x1000', '+Bancos · Comisiones'],
  ['diezmo', '+Donaciones · Donaciones'],
  ['seguro del carro', '+Seguros · Seguros'],
  // Longer phrases beat a shorter word inside them
  ['mercado libre', '+Compras · Compras online'],
  ['uber eats', 'Alimentación · Domicilios'],
  ['metro supermercado', 'Alimentación · Mercado'],
  ['gas natural vanti', '+Recibos · Gas'],
  ['almuerzo y gaseosa', '+Alimentación · Almuerzo'],
  ['cambio de aceite', '+Transporte · Mantenimiento'],
  // Nothing to say
  ['pagué', '—'],
  ['varios', '—'],
];

const enTree: SpendConcept[] = [
  { id: 'c-food', name: 'Food', color: '#000', subs: [{ id: 's-groceries', name: 'Groceries' }, { id: 's-coffee', name: 'Coffee' }] },
  { id: 'c-transport', name: 'Transport', color: '#000', subs: [{ id: 's-rides', name: 'Rides & taxis' }] },
];

const EN_CASES: [string, string][] = [
  ['lunch', '+Food · Lunch'],
  ['lunch with the team', '+Food · Lunch'],
  ['breakfast', '+Food · Breakfast'],
  ['dinner', '+Food · Dinner'],
  ['burger', '+Food · Meals'],
  ['groceries', 'Food · Groceries'],
  ['supermarket', 'Food · Groceries'],
  ['starbucks', 'Food · Coffee'],
  ['uber', 'Transport · Rides & taxis'],
  ['gas station', '+Transport · Fuel'],
  ['parking', '+Transport · Tolls & parking'],
  ['car wash', '+Transport · Car upkeep'],
  ['electricity bill', '+Bills · Power'],
  ['rent', '+Housing · Rent'],
  ['pharmacy', '+Health · Pharmacy & doctor'],
  ['gym', '+Sport · Gym'],
  ['soccer', '+Sport · Football'],
  ['movie tickets', '+Leisure · Going out'],
  ['netflix', '+Leisure · Subscriptions'],
  ['haircut', '+Personal care · Hair & beauty'],
  ['birthday gift', '+Gifts · Gifts'],
  ['flight', '+Travel · Travel'],
  ['bank fee', '+Banks · Fees'],
  ['shoes', '+Shopping · Clothes'],
];

const empty = buildNoteHistory([]);

describe('real descriptions land where a person would put them', () => {
  it('Spanish (Colombia)', () => {
    const got = ES_CASES.map(([note]) => [note, label(suggestCategory(note, esTree, empty), esTree, es)]);
    const bad = got.filter(([n, l], i) => l !== ES_CASES[i][1]).map(([n, l]) => `${n} => ${l} (want ${ES_CASES.find((c) => c[0] === n)![1]})`);
    expect(bad).toEqual([]);
  });
  it('English', () => {
    const got = EN_CASES.map(([note]) => [note, label(suggestCategory(note, enTree, empty), enTree, en)]);
    const bad = got.filter(([n, l], i) => l !== EN_CASES[i][1]).map(([n, l]) => `${n} => ${l} (want ${EN_CASES.find((c) => c[0] === n)![1]})`);
    expect(bad).toEqual([]);
  });
});
