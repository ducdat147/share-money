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
