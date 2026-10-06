import type { Debt, Transaction } from '@/src/types/finance';
import type { ReminderRule } from '@/src/types/settings';
import {
  DEBT_REMINDER_HOUR,
  MAX_PLANNED_REMINDERS,
  planAllReminders,
  planDebtReminders,
  planReminders,
  reminderFrequency,
  suggestReminders,
} from '@/src/utils/reminderPlan';
import type { SpendConcept } from '@/src/types/settings';

let seq = 0;
function tx(amount: number, when: string, categoryId: string): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    type: 'expense',
    amount,
    createdAt: new Date(when).toISOString(),
    accountId: 'cash',
    categoryId,
  };
}

const now = new Date('2026-10-10T12:00:00');
const adminHistory = [tx(300_000, '2026-08-14T09:00', 'admin'), tx(300_000, '2026-09-15T09:00', 'admin')];
const monthly: ReminderRule = { subId: 'admin', hour: 9, minute: 0, dayOfMonth: 15 };
const daily: ReminderRule = { subId: 'cafe', hour: 20, minute: 0 };

const plan = (rules: ReminderRule[], txs: Transaction[]) => planReminders(rules, txs, [], [], now);
const days = (list: ReturnType<typeof plan>) => list.map((o) => o.date.toISOString().slice(0, 10));

describe('planReminders — monthly bills', () => {
  it('plans the next three months with the usual amount', () => {
    const out = plan([monthly], adminHistory);
    expect(out.map((o) => o.date.getDate())).toEqual([15, 15, 15]);
    expect(out.map((o) => o.date.getMonth())).toEqual([9, 10, 11]);
    expect(out.every((o) => o.amount === 300_000)).toBe(true);
  });

  it('skips this month once the bill is logged', () => {
    const out = plan([monthly], [...adminHistory, tx(300_000, '2026-10-09T09:00', 'admin')]);
    expect(out[0].date.getMonth()).toBe(10);
  });

  it('reminds only what is left after a partial payment', () => {
    const out = plan([monthly], [...adminHistory, tx(100_000, '2026-10-09T09:00', 'admin')]);
    expect(out[0].date.getMonth()).toBe(9);
    expect(out[0].amount).toBe(200_000);
  });

  it('skips this month when anything was logged and the usual amount is unknown', () => {
    const out = plan([monthly], [tx(50_000, '2026-10-02T09:00', 'admin')]);
    expect(out[0].date.getMonth()).toBe(10);
    expect(out[0].amount).toBeNull();
  });

  it('starts next month when this month’s day already passed', () => {
    const out = plan([{ ...monthly, dayOfMonth: 5 }], adminHistory);
    expect(out[0].date.getMonth()).toBe(10);
  });
});

describe('planReminders — daily concepts', () => {
  const coffees = [
    tx(8_000, '2026-09-20T08:00', 'cafe'),
    tx(9_000, '2026-09-28T08:00', 'cafe'),
    tx(10_000, '2026-10-03T08:00', 'cafe'),
  ];

  it('plans a week ahead starting tonight, with the usual amount', () => {
    const out = plan([daily], coffees);
    expect(out).toHaveLength(7);
    expect(days(out)[0]).toBe(new Date('2026-10-10T20:00:00').toISOString().slice(0, 10));
    expect(out[0].amount).toBe(9_000);
  });

  it('skips tonight once that concept was logged today', () => {
    const out = plan([daily], [...coffees, tx(9_000, '2026-10-10T08:30', 'cafe')]);
    expect(out[0].date.getDate()).toBe(11);
  });

  it('leaves the amount out with too few samples', () => {
    expect(plan([daily], coffees.slice(0, 2))[0].amount).toBeNull();
  });
});

it('keeps the nearest reminders within the platform limit', () => {
  const rules = Array.from({ length: 10 }, (_, i) => ({ subId: `c${i}`, hour: 20, minute: 0 }));
  const out = plan(rules, []);
  expect(out).toHaveLength(MAX_PLANNED_REMINDERS);
  expect(out.every((o, i) => i === 0 || o.date >= out[i - 1].date)).toBe(true);
});

it('gives each occurrence a stable id', () => {
  expect(plan([monthly], adminHistory).map((o) => o.id)).toEqual(plan([monthly], adminHistory).map((o) => o.id));
});

describe('planDebtReminders', () => {
  const loan: Debt = {
    id: 'moto',
    name: 'Moto',
    balance: 2_000_000,
    installment: 300_000,
    interestRate: 0,
    termMonths: 10,
    nextPaymentDate: new Date('2026-10-20T00:00:00').toISOString(),
    paidCapital: 0,
    paidInterest: 0,
    otherCharges: 0,
    kind: 'installment',
  };
  const card: Debt = { ...loan, id: 'visa', name: 'Visa', installment: 0, kind: 'revolving', nextPaymentDate: new Date('2026-10-25T00:00:00').toISOString() };
  const pay = (debtId: string, amount: number, when: string): Transaction => ({
    ...tx(amount, when, ''),
    type: 'debt_payment',
    categoryId: undefined,
    debtId,
  });
  const debtPlan = (debts: Debt[], txs: Transaction[] = [], muted: string[] = []) =>
    planDebtReminders(debts, txs, [], new Set(muted), now);

  it('reminds the morning before each due date with the installment', () => {
    const out = debtPlan([loan]);
    expect(out).toHaveLength(3);
    expect(out[0].date).toEqual(new Date(2026, 9, 19, DEBT_REMINDER_HOUR));
    expect(out[0].dueDate).toEqual(new Date(2026, 9, 20));
    expect(out.every((o) => o.amount === 300_000)).toBe(true);
  });

  it('skips this month once the installment is paid', () => {
    const out = debtPlan([loan], [pay('moto', 300_000, '2026-10-08T09:00')]);
    expect(out[0].dueDate.getMonth()).toBe(10);
  });

  it('reminds what is left after a partial payment', () => {
    const out = debtPlan([loan], [pay('moto', 100_000, '2026-10-08T09:00')]);
    expect(out[0].dueDate.getMonth()).toBe(9);
    expect(out[0].amount).toBe(200_000);
  });

  it('reminds a card without an installment, until any payment this month', () => {
    expect(debtPlan([card])[0]).toMatchObject({ debtId: 'visa', amount: null });
    expect(debtPlan([card], [pay('visa', 50_000, '2026-10-05T09:00')])[0].dueDate.getMonth()).toBe(10);
  });

  it('leaves out muted and closed debts', () => {
    expect(debtPlan([loan, card], [], ['visa']).every((o) => o.debtId === 'moto')).toBe(true);
    expect(debtPlan([{ ...loan, closedAt: '2026-09-01T00:00:00Z' }])).toEqual([]);
  });

  it('moves a due day past the end of a short month to its last day', () => {
    const out = debtPlan([{ ...loan, nextPaymentDate: new Date('2026-10-31T00:00:00').toISOString() }]);
    expect(out.map((o) => o.dueDate.getDate())).toEqual([31, 30, 31]);
  });
});

describe('suggestReminders', () => {
  const concepts: SpendConcept[] = [
    {
      id: 'hogar',
      name: 'Hogar',
      subs: [
        { id: 'admin', name: 'Administración' },
        { id: 'internet', name: 'Internet' },
        { id: 'cafe', name: 'Café', isAnt: true },
      ],
    } as SpendConcept,
  ];
  const history = [
    ...adminHistory,
    tx(90_000, '2026-08-05T09:00', 'internet'),
    tx(90_000, '2026-09-05T09:00', 'internet'),
    tx(8_000, '2026-08-03T09:00', 'cafe'),
    tx(8_000, '2026-09-03T09:00', 'cafe'),
  ];
  const suggest = (rules: ReminderRule[] = [], dismissed: string[] = []) =>
    suggestReminders(history, [], concepts, rules, dismissed, now);

  it('offers monthly payments without a reminder, biggest first, the morning before', () => {
    const out = suggest();
    expect(out.map((s) => s.subId)).toEqual(['admin', 'internet']);
    expect(out[1]).toMatchObject({
      usualDay: 5,
      amount: 90_000,
      rule: { subId: 'internet', dayOfMonth: 4, hour: 9, minute: 0 },
    });
  });

  it('never offers ant spends', () => {
    expect(suggest().some((s) => s.subId === 'cafe')).toBe(false);
  });

  it('skips concepts that already have a reminder or were turned down', () => {
    expect(suggest([monthly], ['internet'])).toEqual([]);
  });
});

describe('planReminders — weekly and last day', () => {
  // now = Saturday 10 Oct 2026, 12:00.
  const saturday: ReminderRule = { subId: 'mercado', hour: 9, minute: 0, weekday: 6 };
  const sunday: ReminderRule = { ...saturday, weekday: 0 };

  it('plans the next four weeks on that weekday', () => {
    const out = plan([sunday], []);
    expect(out.map((o) => o.date.getDate())).toEqual([11, 18, 25, 1]);
    expect(out.every((o) => o.date.getDay() === 0 && o.date.getHours() === 9)).toBe(true);
  });

  it('starts next week when today’s time already passed', () => {
    expect(plan([saturday], [])[0].date.getDate()).toBe(17);
  });

  it('skips this week once it was bought since last week', () => {
    const out = plan([sunday], [tx(150_000, '2026-10-08T18:00', 'mercado')]);
    expect(out[0].date.getDate()).toBe(18);
  });

  it('reminds on the last day of each month', () => {
    const out = plan([{ subId: 'admin', hour: 9, minute: 0, lastDay: true }], adminHistory);
    expect(out.map((o) => o.date.getDate())).toEqual([31, 30, 31]);
  });

  it('reads the frequency of a rule', () => {
    expect(reminderFrequency(daily)).toBe('daily');
    expect(reminderFrequency(sunday)).toBe('weekly');
    expect(reminderFrequency(monthly)).toBe('monthly');
    expect(reminderFrequency({ ...daily, lastDay: true })).toBe('monthly');
  });
});

describe('planAllReminders', () => {
  const moto: Debt = {
    id: 'moto',
    name: 'Moto',
    balance: 2_000_000,
    installment: 300_000,
    interestRate: 0,
    termMonths: 10,
    nextPaymentDate: new Date('2026-10-20T00:00:00').toISOString(),
    paidCapital: 0,
    paidInterest: 0,
    otherCharges: 0,
    categoryId: 'cuota-moto',
  };
  const conceptRule: ReminderRule = { subId: 'cuota-moto', hour: 9, minute: 0, dayOfMonth: 19 };

  it('does not remind the same payment twice: the debt reminder covers its concept', () => {
    const out = planAllReminders([conceptRule], [moto], [], [], new Set(), now);
    expect(out.debts.length).toBeGreaterThan(0);
    expect(out.expenses).toEqual([]);
  });

  it('keeps the concept reminder when that debt reminder is off', () => {
    const out = planAllReminders([conceptRule], [moto], [], [], new Set(['moto']), now);
    expect(out.debts).toEqual([]);
    expect(out.expenses.length).toBeGreaterThan(0);
  });

  it('stays within the platform limit in total', () => {
    const rules = Array.from({ length: 10 }, (_, i) => ({ subId: `c${i}`, hour: 20, minute: 0 }));
    const out = planAllReminders(rules, [moto], [], [], new Set(), now);
    expect(out.debts.length + out.expenses.length).toBe(MAX_PLANNED_REMINDERS);
  });
});
