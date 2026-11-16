import { expect, test } from '@jest/globals';
import { calculateSummary, getCustomSharesError, getExpenseShares } from '../calculator';
import { Expense, Member } from '../types';

const breakfast = { amount: 140000, participants: ['a', 'b', 'c', 'd'], customShares: { a: 30000, b: 40000 } };

test('getExpenseShares: no locks splits equally', () => {
  expect(getExpenseShares({ amount: 100, participants: ['a', 'b', 'c', 'd'] }))
    .toEqual({ a: 25, b: 25, c: 25, d: 25 });
});

test('getExpenseShares: breakfast — two locked, rest split equally', () => {
  expect(getExpenseShares(breakfast)).toEqual({ a: 30000, b: 40000, c: 35000, d: 35000 });
});

test('getExpenseShares: ignores locks of non-participants', () => {
  expect(getExpenseShares({ amount: 90, participants: ['a', 'b'], customShares: { z: 50 } }))
    .toEqual({ a: 45, b: 45 });
});

test('getExpenseShares: keeps values unrounded', () => {
  expect(getExpenseShares({ amount: 100, participants: ['a', 'b', 'c', 'd'], customShares: { a: 0 } }).b)
    .toBeCloseTo(100 / 3, 10);
});

test('getCustomSharesError', () => {
  expect(getCustomSharesError(140000, ['a', 'b', 'c', 'd'], { a: 30000, b: 40000 })).toBeNull();
  expect(getCustomSharesError(50000, ['a', 'b', 'c'], { a: 30000, b: 40000 })).toBe('exceeds_total');
  expect(getCustomSharesError(100, ['a', 'b'], { a: 30, b: 60 })).toBe('mismatch_total');
  expect(getCustomSharesError(100, ['a', 'b'], { a: 33.33, b: 66.665 })).toBeNull();
  expect(getCustomSharesError(100, ['a', 'b'], {})).toBeNull();
});

test('calculateSummary uses locked shares', () => {
  const members: Member[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, tripId: 't' }));
  const expense: Expense = { id: 'e', tripId: 't', description: 'Breakfast', createdAt: 0, paidBy: 'a', ...breakfast };
  const s = calculateSummary(members, [expense], [], undefined, 'VND');
  expect(s.find((m) => m.memberId === 'a')!.totalShare).toBe(30000);
  expect(s.find((m) => m.memberId === 'c')!.totalShare).toBe(35000);
  expect(s.reduce((sum, m) => sum + m.balance, 0)).toBeCloseTo(0, 2);
});

test('getCustomSharesError: no error while the amount is still empty', () => {
  expect(getCustomSharesError(0, ['a', 'b'], { a: 30000 })).toBeNull();
});

test('getCustomSharesError: locks use up the total while others are unlocked', () => {
  expect(getCustomSharesError(100, ['a', 'b', 'c', 'd'], { a: 70, b: 30 })).toBe('no_remainder');
  expect(getCustomSharesError(100, ['a', 'b', 'c'], { a: 70, b: 29.995 })).toBe('no_remainder');
  expect(getCustomSharesError(100, ['a', 'b', 'c'], { a: 70, b: 29 })).toBeNull();
});
