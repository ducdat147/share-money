export type CurrencyCode = 'VND' | 'USD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  decimals: number;
  locale: string;
  position: 'prefix' | 'suffix';
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  VND: {
    code: 'VND',
    symbol: 'đ',
    decimals: 0,
    locale: 'vi-VN',
    position: 'suffix',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    decimals: 2,
    locale: 'en-US',
    position: 'prefix',
  },
};

// Default currency for the app
export const DEFAULT_CURRENCY: CurrencyCode = 'VND';

/**
 * Format a number to currency string (e.g. 100000 -> "100.000đ")
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = DEFAULT_CURRENCY): string {
  const config = CURRENCIES[currencyCode];
  const roundedAmount = roundCurrency(amount, currencyCode);
  
  const formattedNumber = roundedAmount.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return config.position === 'prefix' 
    ? `${config.symbol}${formattedNumber}`
    : `${formattedNumber} ${config.symbol}`.trim();
}

/**
 * Parse what a user typed into an amount field.
 * `formatCurrency` renders VND as "1.000.000 đ", so users retype that form —
 * a bare parseFloat would read it back as 1. Both the vi-VN ("." groups) and
 * en-US ("," groups) conventions have to survive the round trip.
 */
export function parseAmountInput(
  text: string,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Kept so a typed "-5" still parses negative and fails the caller's `<= 0`
  // check, instead of being silently accepted as 5.
  const sign = trimmed.startsWith('-') ? -1 : 1;
  const body = trimmed.replace(/[^\d.,]/g, '');
  if (!body) return 0;

  let normalized: string;
  if (CURRENCIES[currencyCode].decimals === 0) {
    // No fractional part exists, so every separator is a grouping mark.
    normalized = body.replace(/[.,]/g, '');
  } else {
    // The last separator is a decimal point only if it looks like one: 1-2
    // trailing digits, and not repeated earlier (which would make it a
    // grouping mark, as in "1.000.000").
    const lastSep = Math.max(body.lastIndexOf('.'), body.lastIndexOf(','));
    const fractionLength = body.length - lastSep - 1;
    const isDecimalPoint =
      lastSep >= 0 &&
      fractionLength >= 1 &&
      fractionLength <= 2 &&
      body.indexOf(body[lastSep]) === lastSep;

    normalized = isDecimalPoint
      ? `${body.slice(0, lastSep).replace(/[.,]/g, '')}.${body.slice(lastSep + 1)}`
      : body.replace(/[.,]/g, '');
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : sign * parsed;
}

/**
 * Round a number according to the currency's precision rules
 * e.g. VND rounds to 0 decimals, USD rounds to 2 decimals
 */
export function roundCurrency(amount: number, currencyCode: CurrencyCode = DEFAULT_CURRENCY): number {
  const config = CURRENCIES[currencyCode];
  const factor = Math.pow(10, config.decimals);
  // Sử dụng Math.abs và Math.sign để đảm bảo làm tròn đối xứng (symmetric rounding) cho số âm.
  // Cộng thêm Number.EPSILON để sửa lỗi sai số dấu phẩy động của JS (ví dụ: 1.005 * 100 = 100.4999999)
  return Math.sign(amount) * (Math.round(Math.abs(amount) * factor + Number.EPSILON) / factor);
}
