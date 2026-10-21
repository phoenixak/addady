import { fontFamily } from './fonts';

// Design tokens (docs/research/ux.md). Every text colour meets WCAG AA (4.5:1) on the surfaces it
// is used on, in light and dark (checked in theme.test.ts).
export const palette = {
  light: {
    background: '#F6F5F1',
    surface: '#FFFFFF',
    text: '#1B1B1F',
    textMuted: '#585A62',
    primary: '#0B6B58',
    onPrimary: '#FFFFFF',
    primarySoft: '#E1F2EC',
    border: '#E2E0DA',
    ok: '#1C7339',
    okSoft: '#E3F3E7',
    warn: '#8A5200',
    warnSoft: '#FDF0DC',
    danger: '#B3261E',
    dangerSoft: '#FBE5E3',
    shadow: '#000000',
  },
  dark: {
    background: '#111213',
    surface: '#1C1D20',
    text: '#ECEBE8',
    textMuted: '#A9AAB0',
    primary: '#5CC4A9',
    onPrimary: '#04211A',
    primarySoft: '#173A31',
    border: '#2E2F33',
    ok: '#74D18F',
    okSoft: '#16301F',
    warn: '#F2B451',
    warnSoft: '#3A2C12',
    danger: '#F28B82',
    dangerSoft: '#3D1D1B',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };
export type Tone = 'ok' | 'warn' | 'danger' | 'primary';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radii = { sm: 10, button: 14, card: 16, pill: 999 } as const;

/** Text must still fit at 200% system font size (docs/PLAN.md §4). */
export const MAX_FONT_SCALE = 2;

export const typography = {
  hero: { fontFamily: fontFamily.bold, fontSize: 40, lineHeight: 56 },
  title: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 34 },
  heading: { fontFamily: fontFamily.medium, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 26 },
  // Arabic descenders (dots under ي) need ~1.75x line height or Android clips them.
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 23 },
} as const;

/** Minimum touch target in dp. */
export const TOUCH_TARGET = 48;

/** WCAG relative-luminance contrast ratio of two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
