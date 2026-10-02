import { normalizeAmountDigits, parseAmountInput } from '@/src/utils/money';

describe('normalizeAmountDigits', () => {
  it.each([
    ['15.000', '15000'],
    ['15,000', '15000'],
    ['1.234.567', '1234567'],
    ['1.234,56', '1234.56'],
    ['1,234.56', '1234.56'],
    ['15,5', '15.5'],
    ['$ 20 000', '20000'],
  ])('%p → %p', (input, expected) => {
    expect(normalizeAmountDigits(input)).toBe(expected);
  });
});

describe('parseAmountInput', () => {
  it('keeps COP as whole pesos', () => {
    expect(parseAmountInput('12.500,75', 'COP')).toBe(12501);
  });

  it('keeps USD cents', () => {
    expect(parseAmountInput('12.345', 'USD')).toBe(12345);
    expect(parseAmountInput('12.34', 'USD')).toBe(12.34);
  });

  it.each(['', 'abc', '0', '-'])('rejects %p', (input) => {
    expect(parseAmountInput(input)).toBeNull();
  });
});
