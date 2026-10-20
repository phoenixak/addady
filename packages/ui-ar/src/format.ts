// Number and money formatting for Arabic UIs. Pure TS (no React Native) so it runs in vitest.
//
// We format with en-US grouping and then map digits and separators ourselves instead of relying
// on Intl's 'ar-EG' locale data, so the output is identical on Hermes, Node and the web (ADR 003).

export type DigitStyle = 'arab' | 'latn';

export type CurrencyCode = 'EGP' | 'SAR' | 'AED' | 'KWD' | 'QAR' | 'OMR' | 'BHD';

/** Number of minor-unit digits per currency (ISO 4217). */
export const MINOR_UNIT_DIGITS: Readonly<Record<CurrencyCode, number>> = {
  EGP: 2,
  SAR: 2,
  AED: 2,
  QAR: 2,
  KWD: 3,
  OMR: 3,
  BHD: 3,
};

const CURRENCY_SYMBOL_AR: Readonly<Record<CurrencyCode, string>> = {
  EGP: 'ج.م',
  SAR: 'ر.س',
  AED: 'د.إ',
  QAR: 'ر.ق',
  KWD: 'د.ك',
  OMR: 'ر.ع.',
  BHD: 'د.ب',
};

// Special characters are built from code points so no invisible character appears in source.
const cp = (code: number) => String.fromCodePoint(code);

const ARABIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;
const ARABIC_INDIC_DIGITS = Array.from({ length: 10 }, (_, d) => cp(ARABIC_ZERO + d)).join('');
const ARABIC_THOUSANDS = cp(0x066c);
const ARABIC_DECIMAL = cp(0x066b);
/** Invisible; keeps a leading minus attached to the number in RTL text. */
const ARABIC_LETTER_MARK = cp(0x061c);

const ARABIC_DIGIT_RE = new RegExp(`[${cp(ARABIC_ZERO)}-${cp(ARABIC_ZERO + 9)}]`, 'g');
const PERSIAN_DIGIT_RE = new RegExp(`[${cp(PERSIAN_ZERO)}-${cp(PERSIAN_ZERO + 9)}]`, 'g');
const ARABIC_DECIMAL_RE = new RegExp(ARABIC_DECIMAL, 'g');
const GROUPING_MARKS_RE = new RegExp(`[${ARABIC_THOUSANDS}${ARABIC_LETTER_MARK}]`, 'g');

/** Converts a Latin-digit string (as produced by en-US formatting) to the chosen digit style. */
export function toDigitStyle(latin: string, digits: DigitStyle): string {
  if (digits === 'latn') return latin;
  return latin.replace(/[0-9.,-]/g, (ch) => {
    if (ch === ',') return ARABIC_THOUSANDS;
    if (ch === '.') return ARABIC_DECIMAL;
    if (ch === '-') return `${ARABIC_LETTER_MARK}-`;
    return ARABIC_INDIC_DIGITS[Number(ch)] as string;
  });
}

/** Turns user input typed with Arabic-Indic or Persian digits into Latin digits. */
export function normalizeDigits(input: string): string {
  return input
    .replace(ARABIC_DIGIT_RE, (ch) => String(ch.charCodeAt(0) - ARABIC_ZERO))
    .replace(PERSIAN_DIGIT_RE, (ch) => String(ch.charCodeAt(0) - PERSIAN_ZERO))
    .replace(ARABIC_DECIMAL_RE, '.')
    .replace(GROUPING_MARKS_RE, '');
}

export interface NumberFormatOptions {
  digits?: DigitStyle;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const { digits = 'arab', minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;
  const latin = new Intl.NumberFormat('en-US', {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits: Math.max(minimumFractionDigits, maximumFractionDigits),
  }).format(value);
  return toDigitStyle(latin, digits);
}

export interface MoneyFormatOptions {
  digits?: DigitStyle;
  /** 'auto' hides the minor part when it is zero (٥٬٠٠٠ ج.م); 'always' shows it (٥٬٠٠٠٫٠٠ ج.م). */
  minor?: 'auto' | 'always';
}

/**
 * Formats an integer amount of minor units (piasters for EGP). Money is never a float
 * (docs/PLAN.md §9), so non-integers throw instead of being rounded silently.
 */
export function formatMoney(
  minorUnits: number,
  currency: CurrencyCode,
  options: MoneyFormatOptions = {},
): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new RangeError(`formatMoney expects an integer number of minor units, got ${minorUnits}`);
  }
  const { digits = 'arab', minor = 'auto' } = options;
  const exponent = MINOR_UNIT_DIGITS[currency];
  const scale = 10 ** exponent;
  const abs = Math.abs(minorUnits);
  const major = Math.floor(abs / scale);
  const fraction = abs % scale;

  let latin = new Intl.NumberFormat('en-US', { useGrouping: true }).format(major);
  if (minor === 'always' || fraction !== 0) {
    latin += `.${String(fraction).padStart(exponent, '0')}`;
  }
  if (minorUnits < 0) latin = `-${latin}`;

  const symbol = digits === 'arab' ? CURRENCY_SYMBOL_AR[currency] : currency;
  return `${toDigitStyle(latin, digits)} ${symbol}`;
}
