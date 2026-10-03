import { accountColors } from '@/src/utils/accountColors';

function colorOf(label: string, type: 'wallet' | 'bank' | 'cash' | 'savings' = 'wallet') {
  return accountColors([{ id: label, type, label }]).get(label)!;
}

describe('accountColors', () => {
  it('uses the brand colour for known wallets and banks', () => {
    expect(colorOf('Daviplata').color).toBe('#E1251B');
    expect(colorOf('Nequi').color).toBe('#DA0081');
    expect(colorOf('Dale').color).toBe('#0072CE');
    expect(colorOf('Bancolombia ahorros', 'bank').color).toBe('#FDDA24');
  });

  it('keeps names readable when the brand colour is light', () => {
    const c = colorOf('Bancolombia', 'bank');
    expect(c.text).toBe('#0F1C24');
    expect(c.onColor).toBe('#0F1C24');
  });

  it('does not read "dale" inside another word as the Dale wallet', () => {
    expect(colorOf('Vandalero').color).not.toBe('#0072CE');
  });

  it('never gives two unbranded accounts the same colour', () => {
    const list = ['Main bank', 'Virtual wallet', 'Movii', 'Lulo', 'Pibank'].map((label) => ({
      id: label,
      type: 'wallet' as const,
      label,
    }));
    const colors = [...accountColors(list).values()].map((c) => c.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('does not hand a brand colour to an unbranded account', () => {
    const map = accountColors([
      { id: 'n', type: 'wallet', label: 'Nequi' },
      { id: 'x', type: 'wallet', label: 'Otra' },
    ]);
    expect(map.get('x')!.color).not.toBe(map.get('n')!.color);
  });

  it('colours cash and savings by kind', () => {
    expect(colorOf('Efectivo', 'cash').color).toBe('#1F9D6C');
    expect(colorOf('Ahorros', 'savings').color).toBe('#B07D10');
  });
});
