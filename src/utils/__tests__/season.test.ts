import { isChristmasSeason } from '../season';

describe('isChristmasSeason', () => {
  it('is on from December 1 to January 6', () => {
    expect(isChristmasSeason(new Date(2026, 11, 1))).toBe(true);
    expect(isChristmasSeason(new Date(2026, 11, 31, 23, 59))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 0, 6, 23, 59))).toBe(true);
  });

  it('is off the rest of the year', () => {
    expect(isChristmasSeason(new Date(2026, 10, 30, 23, 59))).toBe(false);
    expect(isChristmasSeason(new Date(2027, 0, 7))).toBe(false);
    expect(isChristmasSeason(new Date(2027, 6, 15))).toBe(false);
  });
});
