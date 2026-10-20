# 003: RTL via the expo-localization plugin; Arabic digits formatted by ui-ar

- Status: accepted
- Date: 2026-10-20

## Context
docs/PLAN.md §4 said to set `expo.extra.supportsRTL` / `forcesRTL` and marked the keys **verify**.

## Decision
- **The original plan was wrong.** The keys are options of the **`expo-localization` config plugin**, not `expo.extra`:
  `["expo-localization", { "supportsRTL": true, "forcesRTL": true }]`. RTL support is on by default from SDK 58, and `forcesRTL` is documented for apps localized only for RTL locales.
- `I18nManager.forceRTL(true)` stays as a runtime fallback (`ensureRTL()` in `ui-ar`).
- SDK 58 changed iOS so `supportsRTL` no longer enables RTL from the device locale; layout follows `I18nManager`. Android is the target, so this doesn't affect us.
- **Numbers:** `ui-ar` formats with `Intl.NumberFormat('en-US')` grouping, then maps digits and separators itself (٠–٩, `٬` thousands, `٫` decimal, U+061C before a minus). This gives the same output on Hermes, Node (tests) and the web, without depending on Hermes's `ar-EG` locale data. The output matches what `ar-EG` produces. Western digits are an option.
- **Money:** `formatMoney(minorUnits, currency)` takes integer minor units only and throws on floats. Minor digits follow ISO 4217 (KWD/BHD/OMR = 3).
- **Lint:** ESLint fails on `left`/`right`/`marginLeft`/… style keys and `textAlign: 'left'|'right'` in app and ui-ar code.
- **Font scaling:** `ArText` sets `maxFontSizeMultiplier = 2` (the 200% gate).

## Sources
- https://docs.expo.dev/guides/localization/
- https://expo.dev/changelog/sdk-58 (expo-localization #48086)

## Verified on device (2026-10-20)
- The release APK on an API 36 emulator rendered `I18nManager.isRTL === true` with no runtime fallback. The Plex font and Eastern Arabic digits were correct (release APK screenshot not kept). At 200% font, RN text wrapped without clipping (`assets/006-spike-200.png`).
- **Copy rule:** don't put `·` between numbers. The Arabic zero `٠` is a small dot, so "١٠ · ٣٬٥٠٠" reads as "١٠ ٠ ٣٬٥٠٠". Use `،`, a dash or words (من، إلى) instead.
