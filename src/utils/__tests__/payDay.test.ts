import { clampPayDay, dueBeforePayment, nextDueAfterPayment, nextPaymentIsoFromDay } from '../payDay';

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

describe('nextDueAfterPayment', () => {
  const due = (iso: string) => new Date(iso).toDateString();
  const oct20 = new Date('2026-10-20T12:00:00').toISOString();
  const at = (iso: string) => new Date(iso).toISOString();

  it('keeps the pay day when paying early', () => {
    expect(due(nextDueAfterPayment(oct20, at('2026-10-08T09:00')))).toBe(due('2026-11-20T12:00:00'));
  });

  it('counts a payment a few days late for that due date', () => {
    expect(due(nextDueAfterPayment(oct20, at('2026-10-28T09:00')))).toBe(due('2026-11-20T12:00:00'));
  });

  it('does not skip a month on a second payment in the same cycle', () => {
    const afterFirst = nextDueAfterPayment(oct20, at('2026-10-08T09:00'));
    expect(due(nextDueAfterPayment(afterFirst, at('2026-10-15T09:00')))).toBe(due('2026-11-20T12:00:00'));
  });

  it('pays next month’s installment ahead when paid well after this one', () => {
    const nov20 = new Date('2026-11-20T12:00:00').toISOString();
    expect(due(nextDueAfterPayment(nov20, at('2026-11-05T09:00')))).toBe(due('2026-12-20T12:00:00'));
  });

  it('clamps day 31 to short months', () => {
    const oct31 = new Date('2026-10-31T12:00:00').toISOString();
    expect(due(nextDueAfterPayment(oct31, at('2026-10-30T09:00')))).toBe(due('2026-11-30T12:00:00'));
  });
});

describe('dueBeforePayment', () => {
  const at = (iso: string) => new Date(iso).toISOString();
  const oct20 = new Date('2026-10-20T12:00:00').toISOString();

  it('undoing the payment that moved the date brings it back', () => {
    const moved = nextDueAfterPayment(oct20, at('2026-10-08T09:00'));
    expect(new Date(dueBeforePayment(moved, at('2026-10-08T09:00'))).toDateString()).toBe(
      new Date(oct20).toDateString()
    );
  });

  it('leaves the date alone when the payment did not move it', () => {
    const nov20 = new Date('2026-11-20T12:00:00').toISOString();
    expect(dueBeforePayment(nov20, at('2026-09-01T09:00'))).toBe(nov20);
  });
});
