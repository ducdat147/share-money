import { CURRENCIES, CurrencyCode } from './currency';

export type NumPadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | '.' | 'back';

export const MAX_INTEGER_DIGITS = 12;

/**
 * Apply one NumPad key press to the raw entry string. The result holds only
 * digits and at most one '.'; read the amount with `parseAmountInput`.
 */
export function applyNumPadKey(text: string, key: NumPadKey, currency: CurrencyCode): string {
  if (key === 'back') return text.slice(0, -1);

  const { decimals } = CURRENCIES[currency];

  if (key === '.') {
    if (decimals === 0 || text.includes('.')) return text;
    return `${text || '0'}.`;
  }

  const dot = text.indexOf('.');
  if (dot >= 0) {
    return `${text.slice(0, dot)}.${(text.slice(dot + 1) + key).slice(0, decimals)}`;
  }

  if (!text && key === '000') return text;

  // Drop leading zeros, keeping one, then cap so "000" appends only the zeros that fit.
  return (text + key).replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS);
}
