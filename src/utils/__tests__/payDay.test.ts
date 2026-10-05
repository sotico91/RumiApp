import { clampPayDay, nextPaymentIsoFromDay } from '../payDay';

describe('clampPayDay', () => {
  it('keeps days that exist in every month', () => {
    expect(clampPayDay(1)).toBe(1);
    expect(clampPayDay(28)).toBe(28);
    expect(clampPayDay(14.6)).toBe(15);
  });

  it('rejects days some months do not have, and junk', () => {
    expect(clampPayDay(0)).toBeNull();
    expect(clampPayDay(29)).toBeNull();
    expect(clampPayDay(Number.NaN)).toBeNull();
  });
});

describe('nextPaymentIsoFromDay', () => {
  it('uses this month when the day is still ahead', () => {
    const from = new Date(2026, 9, 5, 9, 0);
    const next = new Date(nextPaymentIsoFromDay(20, from));
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2026, 9, 20]);
  });

  it('moves to next month when the day already passed', () => {
    const from = new Date(2026, 9, 5, 9, 0);
    const next = new Date(nextPaymentIsoFromDay(3, from));
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2026, 10, 3]);
  });

  it('rolls over the year in December', () => {
    const from = new Date(2026, 11, 20, 9, 0);
    const next = new Date(nextPaymentIsoFromDay(10, from));
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2027, 0, 10]);
  });
});
