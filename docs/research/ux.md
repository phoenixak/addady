# Research → design spec: an Egyptian electricity app anyone can use

- Researched: 2026-10-21.
- Users range from teenagers to grandparents, on phones from new flagships to old 2 GB Androids, many with limited data and limited digital confidence.
- They already use **myFawry** (35M+ users; Fawry is the reference for "paying the electricity" [Shuttle](https://www.shuttleglobal.com/blog/the-most-popular-payment-methods-in-egypt/)), **InstaPay**, and the operators' wallet apps. So the patterns they know are:
  - a **status card at the top** (balance, what's due)
  - a **grid of big icon + word tiles** for services
  - a **bottom tab bar**
  - short Arabic labels
  - receipts and confirmations after every action
- What frustrates them in official apps: long forms that fail at the end, logins, and unclear errors ([App Store review](https://apple.co/3EcoZrC)).

## Principles
1. **One question per screen, one main button.** Progressive disclosure: advanced fields live behind "تفاصيل أكتر" (more details).
2. **The number is the hero.** kWh, EGP and days are big and bold, with the unit after. Every number has a one-line meaning in plain Egyptian Arabic ("يعني هتدفع حوالي…", "that means you'll pay about…").
3. **Status is colour + icon + word**, never colour alone: ✓ أمان (safe), ⚠ خد بالك (watch out), ⛔ خطر (danger).
4. **No account, no login, no forms that can fail.** Everything works offline, and saving is instant with a toast plus haptics. Destructive actions ask once and offer undo.
5. **Trust cues:**
   - "تطبيق غير رسمي" (unofficial app) is always visible but small
   - "بياناتك على موبايلك بس" (your data stays on your phone) shows on first run
   - every rule shows its source
   - estimates say "تقديري"
6. **Language:** Egyptian colloquial Arabic, short. Use "كيلو" in conversation and ك.و.س in tables. Explain a term once (e.g. "الشريحة"), never assume it.
7. **Accessible by default:**
   - 48 dp targets, body text ≥ 16 sp
   - works at 200% system text
   - TalkBack labels on every control
   - WCAG AA contrast in light and dark
8. **Light on the phone:** no heavy animation. Charts only where they add meaning. Skeletons instead of spinners.

## Information architecture (bottom tabs, RTL so the first tab is on the right)
| Tab | Purpose |
|---|---|
| **الرئيسية** (home) | The status card for the current place (tier, today's bill, month-end range, or the prepaid run-out countdown), the most urgent alert, and quick actions (سجل قراية / شحنت / راجع فاتورتك) |
| **قراياتي** (my readings) | Monthly chart, reading list, add or delete |
| **أدواتي** (my tools) | A grid of tools: bill checker, "ليه رصيدي اتخصم؟", cliff planner, appliances, what-if, later power factor, solar and backup |
| **اعرف حقك** (know your rights) | Step-by-step cards (complain, contest a bill, meter test, late fee, coded → legal, new meter), each with sources and the 121 call button |
| **الإعدادات** (settings) | Places, notifications, digits, backup, prices and sources, about and privacy |

## Onboarding ("مين إنت؟", who are you?)
Five large cards with icons: **بيت** (home) · **محل** (shop) · **مكتب أو شركة** (office or company) · **مصنع** (factory) · **مزرعة أو ري** (farm or irrigation). Each sets:

| Card | Customer class | Meter options |
|---|---|---|
| بيت | residential | prepaid / postpaid / coded |
| محل, مكتب أو شركة | commercial | prepaid / postpaid |
| مصنع | asks for the voltage in plain words: "عداد عادي في المصنع (380 فولت)" (a normal meter, 380 V) / "محول خاص جهد متوسط" (own transformer, medium voltage) / "جهد عالي" (high voltage) | — |
| مزرعة أو ري | irrigation, low or medium voltage | — |

Then governorate, then the meter's month-start day (with a picture-hint): **3 screens maximum**.

## Visual tokens (implemented in `packages/ui-ar/src/theme.ts`)
- **Primary:** deep teal (#0F6E5C light / #5CC4A9 dark). Amber for warnings, red only for danger.
- **Surfaces:** off-white background with white cards in light mode; near-black with lifted grey cards in dark.
- **Shape:** card radius 16 and button radius 14, with soft single-level elevation.
- **Type:** IBM Plex Sans Arabic. Hero numbers 40/48 bold, titles 22 bold, body 16, captions 13.
- **Icons:** MaterialCommunityIcons (bundled, offline), always paired with a label: lightning-bolt, gauge, calculator-variant, scale-balance, cog, store, factory, home, tractor.
