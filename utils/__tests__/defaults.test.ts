import { expect, test } from '@jest/globals';
import { autoExpenseDescription, fillMemberNames, getDefaultPayerId } from '../defaults';
import { Expense, Member } from '../types';

const m = (id: string): Member => ({ id, tripId: 't', name: id });
const e = (id: string, paidBy: string | undefined, createdAt: number): Expense => ({
  id,
  tripId: 't',
  description: id,
  amount: 0,
  participants: [],
  paidBy,
  createdAt,
});

test('payer: latest expense payer', () => {
  expect(getDefaultPayerId({ members: [m('a'), m('b')], treasurerId: 'a',
    expenses: [e('x', 'a', 1), e('y', 'b', 2)] })).toBe('b');
});
test('payer: latest payer removed → treasurer', () => {
  expect(getDefaultPayerId({ members: [m('a'), m('b')], treasurerId: 'a',
    expenses: [e('y', 'z', 2)] })).toBe('a');
});
test('payer: no expenses, no treasurer → first member', () => {
  expect(getDefaultPayerId({ members: [m('b'), m('c')], expenses: [] })).toBe('b');
});
test('payer: pre-migration expense without paidBy → treasurer', () => {
  expect(getDefaultPayerId({ members: [m('a')], treasurerId: 'a', expenses: [e('x', undefined, 1)] })).toBe('a');
});
test('fillMemberNames', () => {
  expect(fillMemberNames(['An', '  ', ' Chi '], (n) => `Người ${n}`)).toEqual(['An', 'Người 2', 'Chi']);
});
test('autoExpenseDescription pads time', () => {
  expect(autoExpenseDescription(new Date(2026, 0, 1, 9, 5), (t) => `Chi tiêu ${t}`)).toBe('Chi tiêu 09:05');
});
