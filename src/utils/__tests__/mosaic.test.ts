import type { Transaction } from '@/src/types/finance';
import type { SpendConcept } from '@/src/types/settings';
import { buildMosaic, OTHERS_ID, readableTextOn, squarify } from '@/src/utils/mosaic';

const concepts: SpendConcept[] = [
  { id: 'food', name: 'Alimentación', color: '#E07A5F', subs: [{ id: 'mercado', name: 'Mercado' }, { id: 'cafe', name: 'Café', isAnt: true }] },
  { id: 'home', name: 'Hogar', color: '#3D5A80', subs: [{ id: 'arriendo', name: 'Arriendo' }] },
  { id: 'move', name: 'Transporte', color: '#81B29A', subs: [{ id: 'taxi', name: 'Taxi' }] },
  { id: 'fun', name: 'Ocio', color: '#F2CC8F', subs: [{ id: 'cine', name: 'Cine' }] },
  { id: 'pets', name: 'Mascotas', color: '#9C6644', subs: [{ id: 'gato', name: 'Gato' }] },
];

let seq = 0;
const spend = (amount: number, categoryId: string, when: string): Transaction => ({
  id: `t${++seq}`,
  type: 'expense',
  amount,
  categoryId,
  createdAt: new Date(when).toISOString(),
  accountId: 'cash',
});

const now = new Date('2026-11-15T12:00:00');

describe('buildMosaic', () => {
  it('shares add up to 100 and come biggest first', () => {
    const { tiles, total } = buildMosaic(
      [spend(600, 'arriendo', '2026-11-02'), spend(300, 'mercado', '2026-11-05'), spend(100, 'taxi', '2026-11-06')],
      concepts,
      [],
      now
    );
    expect(total).toBe(1000);
    expect(tiles.map((t) => [t.id, Math.round(t.percent)])).toEqual([
      ['home', 60],
      ['food', 30],
      ['move', 10],
    ]);
  });

  it('compares with the same days of last month, in percentage points', () => {
    const { tiles } = buildMosaic(
      [
        spend(500, 'mercado', '2026-11-03'),
        spend(500, 'taxi', '2026-11-04'),
        // Last month up to the 15th: food was 25%.
        spend(250, 'mercado', '2026-10-03'),
        spend(750, 'taxi', '2026-10-04'),
        // After the 15th of last month: not comparable, left out.
        spend(5000, 'mercado', '2026-10-25'),
      ],
      concepts,
      [],
      now
    );
    expect(tiles.find((t) => t.id === 'food')?.deltaPoints).toBeCloseTo(25);
    expect(tiles.find((t) => t.id === 'move')?.deltaPoints).toBeCloseTo(-25);
  });

  it('has no change to show without spending last month', () => {
    const { tiles } = buildMosaic([spend(100, 'mercado', '2026-11-03')], concepts, [], now);
    expect(tiles[0].deltaPoints).toBeNull();
  });

  it('marks categories with ant spends', () => {
    const { tiles } = buildMosaic(
      [spend(10, 'cafe', '2026-11-03'), spend(500, 'arriendo', '2026-11-02')],
      concepts,
      [],
      now
    );
    expect(tiles.find((t) => t.id === 'food')?.hasAnt).toBe(true);
    expect(tiles.find((t) => t.id === 'home')?.hasAnt).toBe(false);
  });

  it('folds tiny categories into one Others tile', () => {
    const { tiles } = buildMosaic(
      [
        spend(9000, 'arriendo', '2026-11-02'),
        spend(800, 'mercado', '2026-11-03'),
        spend(100, 'cine', '2026-11-04'),
        spend(100, 'gato', '2026-11-05'),
      ],
      concepts,
      [],
      now
    );
    expect(tiles.map((t) => t.id)).toEqual(['home', 'food', OTHERS_ID]);
    expect(tiles[2].others?.map((t) => t.id)).toEqual(['fun', 'pets']);
    expect(tiles[2].total).toBe(200);
  });

  it('is empty without spending this month', () => {
    expect(buildMosaic([], concepts, [], now)).toEqual({ tiles: [], total: 0 });
  });
});

describe('squarify', () => {
  it('fills the box with areas proportional to the values', () => {
    const rects = squarify([6, 6, 4, 3, 2, 2, 1], 600, 400);
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);
    expect(area).toBeCloseTo(600 * 400);
    rects.forEach((r, i) => expect(r.w * r.h).toBeCloseTo(([6, 6, 4, 3, 2, 2, 1][i] / 24) * 240000));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-0.001);
      expect(r.y).toBeGreaterThanOrEqual(-0.001);
      expect(r.x + r.w).toBeLessThanOrEqual(600.001);
      expect(r.y + r.h).toBeLessThanOrEqual(400.001);
    }
  });

  it('gives one value the whole box', () => {
    expect(squarify([5], 300, 200)).toEqual([{ x: 0, y: 0, w: 300, h: 200 }]);
  });
});

describe('readableTextOn', () => {
  it('picks dark text on light colors and white on dark ones', () => {
    expect(readableTextOn('#F2CC8F')).toBe('#0F1C24');
    expect(readableTextOn('#3D5A80')).toBe('#FFFFFF');
  });
});
