import { describe, expect, it } from 'vitest';

import { contrastRatio, palette } from './theme';

describe('palette contrast (WCAG AA, 4.5:1)', () => {
  const pairs: [keyof (typeof palette)['light'], keyof (typeof palette)['light']][] = [
    ['text', 'background'],
    ['text', 'surface'],
    ['textMuted', 'background'],
    ['textMuted', 'surface'],
    ['primary', 'surface'],
    ['onPrimary', 'primary'],
    ['primary', 'primarySoft'],
    ['ok', 'okSoft'],
    ['warn', 'warnSoft'],
    ['danger', 'dangerSoft'],
    ['text', 'okSoft'],
    ['text', 'warnSoft'],
    ['text', 'dangerSoft'],
    ['ok', 'surface'],
    ['warn', 'surface'],
    ['danger', 'surface'],
  ];
  for (const scheme of ['light', 'dark'] as const) {
    for (const [fg, bg] of pairs) {
      it(`${scheme}: ${fg} on ${bg}`, () => {
        expect(contrastRatio(palette[scheme][fg], palette[scheme][bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });
});
