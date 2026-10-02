import { csvEscape } from '@/src/utils/csv';

describe('csvEscape', () => {
  it('leaves plain text untouched', () => {
    expect(csvEscape('Almuerzo')).toBe('Almuerzo');
  });

  it('quotes values with commas, quotes or newlines', () => {
    expect(csvEscape('pan, leche')).toBe('"pan, leche"');
    expect(csvEscape('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(csvEscape('a\nb')).toBe('"a\nb"');
  });

  it.each(['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd'])(
    'neutralizes formula-like cell %p',
    (value) => {
      expect(csvEscape(value).replace(/^"/, '').startsWith("'")).toBe(true);
    }
  );
});
