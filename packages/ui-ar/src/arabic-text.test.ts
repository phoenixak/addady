import { describe, expect, it } from 'vitest';
import { collectStrings, reversedArabicReason } from './arabic-text';

const reverse = (s: string) => [...s].reverse().join('');

// Real app copy, typed in logical order.
const LOGICAL = [
  'تقديري',
  'اعرف إنت في أنهي شريحة قبل ما الفاتورة تفاجئك',
  'الفاتورة المتوقعة',
  'استهلاك الكهرباء',
  'تطبيق غير رسمي؛ التقدير ليس فاتورتك',
  'الشريحة الحالية',
  'متتفاجئش إن الكهربا قطعت',
  'يلا نبدأ',
  'مثلا لو شغلت التكييف أصلا',
];

describe('reversedArabicReason', () => {
  it('accepts copy stored in logical order', () => {
    for (const text of LOGICAL) expect(reversedArabicReason(text)).toBeNull();
  });

  it('starts "estimated" with teh (U+062A)', () => {
    expect('تقديري'.codePointAt(0)).toBe(0x062a);
  });

  it('rejects the same copy reversed', () => {
    for (const text of LOGICAL.slice(1, 7))
      expect(reversedArabicReason(reverse(text))).not.toBeNull();
  });

  it('rejects a word that starts with teh marbuta or alef maksura', () => {
    expect(reversedArabicReason('ةروتافلا')).toMatch(/only ends words/);
    expect(reversedArabicReason('ىلع')).toMatch(/only ends words/);
  });

  it('rejects presentation forms', () => {
    const glyphs = String.fromCodePoint(0xfeb3, 0xfee0, 0xfe8e, 0xfee1); // presentation-form glyphs
    expect(reversedArabicReason(glyphs)).toMatch(/presentation forms/);
  });

  it('ignores strings without Arabic letters', () => {
    expect(reversedArabicReason('EGP 142.50')).toBeNull();
    expect(reversedArabicReason('')).toBeNull();
  });
});

describe('collectStrings', () => {
  it('flattens nested objects and arrays with dotted paths', () => {
    expect(collectStrings({ a: 'x', b: { c: ['y', 'z'] }, n: 1, z: null })).toEqual([
      { path: 'a', text: 'x' },
      { path: 'b.c.0', text: 'y' },
      { path: 'b.c.1', text: 'z' },
    ]);
  });

  it('handles a top-level string or array', () => {
    expect(collectStrings('x')).toEqual([{ path: '', text: 'x' }]);
    expect(collectStrings(['x'])).toEqual([{ path: '0', text: 'x' }]);
  });
});
