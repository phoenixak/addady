import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  MINOR_UNIT_DIGITS,
  formatMoney,
  formatNumber,
  normalizeDigits,
  toDigitStyle,
  type CurrencyCode,
} from './format';

describe('toDigitStyle', () => {
  it('maps digits and separators to Arabic-Indic forms', () => {
    expect(toDigitStyle('1,234.50', 'arab')).toBe('١٬٢٣٤٫٥٠');
  });

  it('leaves Latin output untouched', () => {
    expect(toDigitStyle('1,234.50', 'latn')).toBe('1,234.50');
  });

  it('keeps a leading minus attached with an Arabic letter mark', () => {
    const arabicLetterMark = String.fromCodePoint(0x061c); // invisible, so never typed literally
    expect(toDigitStyle('-5', 'arab')).toBe(`${arabicLetterMark}-٥`);
  });
});

describe('normalizeDigits', () => {
  it('converts Arabic-Indic and Persian digits to Latin', () => {
    expect(normalizeDigits('١٢٣۴۵')).toBe('12345');
  });

  it('converts the Arabic decimal and drops grouping marks', () => {
    expect(normalizeDigits('١٬٢٣٤٫٥')).toBe('1234.5');
  });

  it('round-trips with formatNumber for any integer', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e12 }), (n) => {
        expect(normalizeDigits(formatNumber(n))).toBe(String(n));
      }),
    );
  });
});

describe('formatNumber', () => {
  it('defaults to Eastern Arabic digits with grouping', () => {
    expect(formatNumber(1234567)).toBe('١٬٢٣٤٬٥٦٧');
  });

  it('supports Western digits', () => {
    expect(formatNumber(1234567, { digits: 'latn' })).toBe('1,234,567');
  });

  it('honours fraction digits', () => {
    expect(formatNumber(87.36, { maximumFractionDigits: 2 })).toBe('٨٧٫٣٦');
    expect(formatNumber(5, { minimumFractionDigits: 1, digits: 'latn' })).toBe('5.0');
  });
});

describe('formatMoney', () => {
  it('formats piasters as EGP with the Arabic symbol', () => {
    expect(formatMoney(123450, 'EGP')).toBe('١٬٢٣٤٫٥٠ ج.م');
  });

  it('hides a zero minor part by default and shows it on request', () => {
    expect(formatMoney(500000, 'EGP')).toBe('٥٬٠٠٠ ج.م');
    expect(formatMoney(500000, 'EGP', { minor: 'always' })).toBe('٥٬٠٠٠٫٠٠ ج.م');
  });

  it('uses three minor digits for KWD and the ISO code with Western digits', () => {
    expect(formatMoney(1005, 'KWD', { digits: 'latn' })).toBe('1.005 KWD');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-250, 'EGP', { digits: 'latn' })).toBe('-2.50 EGP');
  });

  it('rejects non-integer amounts', () => {
    expect(() => formatMoney(10.5, 'EGP')).toThrow(RangeError);
  });

  it('never loses a minor unit for any safe integer amount', () => {
    const currencies = Object.keys(MINOR_UNIT_DIGITS) as CurrencyCode[];
    fc.assert(
      fc.property(
        fc.integer({ min: -1e13, max: 1e13 }),
        fc.constantFrom(...currencies),
        (amount, currency) => {
          const text = formatMoney(amount, currency, { digits: 'latn', minor: 'always' });
          const numeric = text.split(' ')[0]!.replace(/,/g, '').replace('.', '');
          expect(Number(numeric)).toBe(amount);
        },
      ),
    );
  });
});
