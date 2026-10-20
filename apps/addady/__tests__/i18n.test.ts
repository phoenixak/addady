import { collectStrings, reversedArabicReason } from '@addady/ui-ar/arabic-text';

import ar from '../i18n/ar.json';

describe('ar.json', () => {
  it('stores every value in logical (not visual/reversed) order', () => {
    const problems = collectStrings(ar)
      .map(({ path, text }) => ({ path, reason: reversedArabicReason(text) }))
      .filter((p) => p.reason !== null);
    expect(problems).toEqual([]);
  });

  it('starts "estimated" with teh (U+062A)', () => {
    expect(ar.common.estimated.codePointAt(0)).toBe(0x062a);
  });
});
