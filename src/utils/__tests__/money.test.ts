import { formatAmountTyping, normalizeAmountDigits, parseAmountInput } from '@/src/utils/money';

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

describe('formatAmountTyping', () => {
  it('groups COP thousands with dots and drops everything else', () => {
    expect(formatAmountTyping('2500000', 'COP')).toBe('2.500.000');
    expect(formatAmountTyping('2.500.0001', 'COP')).toBe('25.000.001');
    expect(formatAmountTyping('15,5', 'COP')).toBe('155');
    expect(formatAmountTyping('007', 'COP')).toBe('7');
    expect(formatAmountTyping('', 'COP')).toBe('');
  });

  it('groups USD thousands with commas and keeps two decimals', () => {
    expect(formatAmountTyping('2500000', 'USD')).toBe('2,500,000');
    expect(formatAmountTyping('2500.5', 'USD')).toBe('2,500.5');
    expect(formatAmountTyping('2500.567', 'USD')).toBe('2,500.56');
    expect(formatAmountTyping('.5', 'USD')).toBe('0.5');
    expect(formatAmountTyping('12.', 'USD')).toBe('12.');
  });

  it('always parses back to the typed amount', () => {
    for (const raw of ['1', '999', '1000', '15000', '2500000', '123456789']) {
      expect(parseAmountInput(formatAmountTyping(raw, 'COP'), 'COP')).toBe(Number(raw));
    }
    for (const raw of ['1000', '2500.5', '1234567.89', '0.99']) {
      expect(parseAmountInput(formatAmountTyping(raw, 'USD'), 'USD')).toBe(Number(raw));
    }
  });
});
