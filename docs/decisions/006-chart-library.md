# 006: Charts with Victory Native XL, with Arabic labels drawn by Skia Paragraph

- Status: accepted (spike 2026-10-20)
- Date: 2026-10-20

## Context
Addady needs bar and line charts with Arabic month labels and Eastern Arabic digits, in RTL, readable at 200% system font. No source confirmed RTL support for either candidate (docs/PLAN.md §1).

**Spike:** `apps/addady/src/app/spike.tsx`, a dev build on an API 36 emulator (SDK 58 / RN 0.88, `forcesRTL`), screenshotted at font scale 1.0 and 2.0 (`assets/006-*.png`).

## Results
| | Victory Native XL 42.0.1 (Skia 2.14.0) | react-native-gifted-charts 1.4.81 (SVG) |
|---|---|---|
| Arabic labels, default | **Unshaped**: isolated letter forms, reversed (Skia `Text`/`useFont` does no shaping) | Shaped (labels are RN `<Text>`) |
| Arabic labels, with a fix | **Shaped** via a custom `labelRenderer` that draws `Skia.ParagraphBuilder` paragraphs (HarfBuzz + bidi) with the bundled Plex TTF loaded via `useFonts` | — |
| RTL order (earliest month on the right) | Manual: map `x` to `n-1-i` and use `axisSide: 'right'` for the y-axis. Works | `BarChart`: `rtl` prop. Works. `LineChart` has **no** `rtl` prop, but the RTL layout already mirrors it correctly (a manual data reversal flips it back to LTR, so don't add one) |
| Eastern Arabic digits | Yes, via `formatXLabel`/`formatYLabel` + `ui-ar` | Yes, via `formatYLabel` + `ui-ar` |
| 200% font | Clean when the label font size is `12 × min(fontScale, 2)` | **x labels clipped and overlapping** (fixed-height label slots); every chart needs `xAxisLabelsHeight`/`labelWidth` tuning |
| Control | Full (Skia canvas, gestures, Reanimated) | Less; the layout is internal to the library |

## Decision
**Victory Native XL** for Addady charts. **Arabic labels always go through the Paragraph `labelRenderer`**, never `font`-only labels. Phase 3 moves the renderer from the spike into `apps/addady/src/charts/`. gifted-charts is the documented fallback, and is removed from `apps/addady` once the real charts exist.

## Consequences
- Every chart sets the time direction explicitly for RTL (x mapping plus the y-axis side). A small `useRtlTimeAxis` helper should own this.
- The outer bars were clipped at the chart edges with `domainPadding={24}`. Tune the padding per chart.
- **APK size is not measured yet.** Skia adds native libraries per ABI. Measure with per-ABI splits in Phase 3 against the 30 MB target, and if Skia breaks the budget, reconsider gifted-charts with tuned label slots.
- In digits-heavy copy, don't use `·` between numbers: the Arabic zero `٠` is a dot and reads the same (ADR 003).
