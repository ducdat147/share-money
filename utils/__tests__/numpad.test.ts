import { expect, test } from '@jest/globals';
import { applyNumPadKey } from '../numpad';

const run = (keys: string[], cur: 'VND' | 'USD') =>
  keys.reduce((t, k) => applyNumPadKey(t, k as any, cur), '');

test('VND: digits and 000', () => expect(run(['2', '5', '000'], 'VND')).toBe('25000'));
test('VND: leading zero dropped', () => expect(run(['0', '0', '7'], 'VND')).toBe('7'));
test('VND: 000 on empty does nothing', () => expect(run(['000'], 'VND')).toBe(''));
test('VND: dot ignored', () => expect(run(['1', '.', '5'], 'VND')).toBe('15'));
test('USD: one dot, max 2 decimals', () => expect(run(['1', '.', '.', '5', '0', '9'], 'USD')).toBe('1.50'));
test('USD: dot first becomes 0.', () => expect(run(['.', '5'], 'USD')).toBe('0.5'));
test('back removes last char', () => expect(run(['1', '2', 'back'], 'VND')).toBe('1'));
test('back on empty stays empty', () => expect(run(['back'], 'VND')).toBe(''));
test('caps integer part at 12 digits', () =>
  expect(run(['9', '000', '000', '000', '000', '000'], 'VND')).toBe('9000000000000'.slice(0, 12)));
