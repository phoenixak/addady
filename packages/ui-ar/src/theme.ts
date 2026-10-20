import { fontFamily } from './fonts';

export const palette = {
  light: {
    background: '#FBFAF7',
    surface: '#FFFFFF',
    text: '#1B1B1F',
    textMuted: '#5D5E66',
    primary: '#0F6E5C',
    onPrimary: '#FFFFFF',
    border: '#E2E0DA',
    ok: '#1E7A3D',
    warn: '#9A5B00',
    danger: '#B3261E',
  },
  dark: {
    background: '#121314',
    surface: '#1C1D1F',
    text: '#ECEBE8',
    textMuted: '#A6A7AD',
    primary: '#5CC4A9',
    onPrimary: '#06201A',
    border: '#2E2F33',
    ok: '#6FCF8A',
    warn: '#F2B451',
    danger: '#F2867E',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Text must still fit at 200% system font size (docs/PLAN.md §4). */
export const MAX_FONT_SCALE = 2;

export const typography = {
  title: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 36 },
  heading: { fontFamily: fontFamily.medium, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 26 },
  caption: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 20 },
} as const;

/** Minimum touch target in dp. */
export const TOUCH_TARGET = 48;
