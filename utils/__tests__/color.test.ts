import { expect, test } from '@jest/globals';
import { contrastRatio } from '../color';
import { LightColors, DarkColors } from '../../constants/theme';

test('contrastRatio: black on white is 21', () => {
  expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
});

test.each([['light', LightColors], ['dark', DarkColors]])(
  '%s: success/danger/text meet AA on surface',
  (_, c) => {
    expect(contrastRatio(c.success, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.danger, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
  },
);

test('G palette core values', () => {
  expect(LightColors.primary).toBe('#4D7C0F');
  expect(DarkColors.primary).toBe('#A3E635');
  expect(LightColors.background).toBe('#F5F3EC');
  expect(DarkColors.background).toBe('#14140F');
});
