# عدّادي (Addady): project plan

**One line:** a free, open-source Arabic Android app that tells an Egyptian household **which tier they're in, what the bill will be, and when a prepaid meter will run out**, *before* it happens. It learns the home's real daily usage from the readings the user types in, and estimates each appliance from the label on its back.

- **Unofficial.** It has no link to any government or electricity-company system.
- **Distribution:** GitHub Releases only (also installable through Obtainium). No Google Play or App Store for now.
- **Cost:** $0.
- **License:** GPL-3.0 for the app, MIT for the `eg-electricity-tariff` npm package.

Sections 1–9 are the engineering rules; sections 10 onward cover the product. Decisions are recorded in `docs/decisions/`.

## 1. Versions
| Piece | Choice |
|---|---|
| Framework | Expo SDK 58 (React Native 0.88), New Architecture, TypeScript strict with `noUncheckedIndexedAccess` (ADR 001) |
| Package manager | pnpm workspaces with isolated installs (ADR 002) |
| Navigation | expo-router |
| Local DB | expo-sqlite + Drizzle ORM (ADR 004) |
| Charts | Victory Native XL, with Arabic labels drawn by Skia Paragraph (ADR 006) |
| Crypto | @noble/ciphers (XChaCha20-Poly1305), @noble/hashes, @noble/curves (Ed25519 for the signed `tariffs.json`) |
| Time | `@date-fns/tz`, with every computation in `Africa/Cairo` (ADR 005) |
| Tests | vitest + fast-check for pure packages (100% coverage); jest-expo + RNTL for components; Maestro for E2E |
| Backend (v2, opt-in features only) | Supabase: Postgres + RLS, Edge Functions |

## 2. Build machine
- Release builds run locally: `expo prebuild` plus Gradle, on Windows or Linux (ADR 007).
- No EAS credits are needed.
- The signing key stays outside the repo.

## 3. Repo layout
```
apps/addady/                  the Expo app (com.fynxforge.addady)
packages/eg-electricity-tariff  pure TS: tariffs.json schema + bill engine (npm, MIT)
packages/energy-model           pure TS: projection, prepaid run-out simulator, appliance models, calibration
packages/e2e-sync               pure TS: encryption + event log for household sync (v2)
packages/ui-ar                  theme, RTL helpers, Arabic numerals/currency, fonts
packages/config                 shared TS/ESLint/Prettier/vitest config + Expo config plugins
                                (tariffs.json + .sig live in packages/eg-electricity-tariff/data)
supabase/                       migrations, pgTAP tests, Edge Functions
web/                            static dashboard + landing page
docs/                           this plan, research notes, ADRs
```
The pure packages must not import React Native or Expo (ESLint enforces this). They're tested in Node with 100% coverage, and the UI stays thin.

## 4. RTL and Arabic
- RTL comes from the `expo-localization` plugin with `forcesRTL: true` (ADR 003).
- Styles use only start/end; ESLint rejects left/right.
- Numbers are always formatted by `ui-ar`: Eastern Arabic digits by default, Western digits as an option.
- Money is integer piasters.
- Don't put `·` between numbers, because the Arabic zero `٠` is a dot.
- Arabic copy lives in `apps/addady/i18n/ar.json`, stored in logical order (a test checks this).
- Text scaling up to 200% without clipping is a release gate.

## 5. Backend (v2, opt-in)
- One free Supabase project. RLS on every table, deny by default.
- Clients never read raw contributions.
- Writes go only through Edge Functions, which validate and rate-limit them.
- Secrets live in Supabase secrets and GitHub Actions secrets, never in the repo.
- Every feature that sends data off the phone is **off by default and opt-in**. It's also disabled for everyone until the Egyptian data-protection (PDPL) review in `docs/research/pdpl.md` concludes it's allowed.

## 6. Notifications
- All scheduling happens on the device; there's no push server.
- No exact-alarm permission: warnings are scheduled with hours of margin and rescheduled on every reading, recharge, app open and boot.
- One Android channel per notification type.

## 7. CI
GitHub Actions run on every push and PR:
- typecheck, lint, format
- vitest, jest-expo
- an Android bundle check
- gitleaks and the private-terms check
- later: pgTAP database tests, Maestro E2E on an emulator, and tagged releases

## 8. Release
- Tags `addady-v*` build per-ABI APKs: arm64-v8a, plus armeabi-v7a for older phones.
- Each GitHub Release carries the changelog and SHA-256 checksums.
- The signing certificate fingerprint is published in the README.
- Tags `tariff-v*` publish `eg-electricity-tariff` to npm with provenance.
- The app's update check reads the GitHub Releases API and sends nothing.

## 9. Conventions
- Pure logic comes first, UI second.
- Money is integer minor units. Times are stored in UTC and computed in `Africa/Cairo`.
- No analytics or trackers. The only network calls: the GitHub release check, `tariffs.json`, Open-Meteo (v2), and Supabase (v2, opt-in).
- No secrets in the repo.
- Every decision gets a short ADR.

## 10. Research approach (no fieldwork)
Every fact comes from public sources, with a link. Test cases come from:
1. official worked examples published by the electricity companies or the regulator (EgyptERA)
2. figures where at least two independent news sources agree
3. bill screenshots people post publicly

Each case carries its source and a confidence level. A rule backed by a single source is **low-confidence**, and the app shows "تقديري" ("estimated") next to any result that depends on it.

After release, the app learns from opt-in, anonymous reports:
- "my bill didn't match"
- a check of the predicted vs actual run-out time after a recharge or a cut-off

These reports become new test cases and fixes to `tariffs.json`.

## 11. Features
### v1 (offline)
1. **Home setup:**
   - meter type: postpaid, prepaid card or coded
   - governorate, month-start day and contracted load
   - several homes
2. **Add a reading in 5 seconds:** kWh and/or the prepaid balance, plus recharge events. The app warns when a reading is lower than the last one.
3. **Home screen:**
   - this month's kWh and the current tier
   - the projected month-end kWh and bill, as a range
   - for prepaid meters, the projected run-out date and time, honouring grace periods
4. **Cliff warning,** with the kWh/day budget needed to stay below the next boundary.
5. **Prepaid run-out notifications:**
   - 3 days and 1 day before
   - on the morning of an expected 10:00 cut
   - a Thursday-evening weekend notice
   - a low-balance threshold
   - a "stale projection" nudge when there's been no reading for a while
6. **Postpaid notifications:** the cliff warning, a self-reading reminder and a month-end summary.
7. **Bill checker:** the expected bill line by line, with an explanation of any gap.
8. **Recharge planner** for prepaid meters.
9. **History and insights:** daily, monthly, summer vs winter, weekday vs weekend.
10. **Appliances from their labels,** with "where your kWh go" ranges.
11. **What-if simulator,** including the effect on your tier.
12. **Overload check** against the contracted load.
13. **Signed `tariffs.json` updates** without a new release.
14. **Export:** CSV, a PDF report, and a backup file (optionally encrypted).
15. **Unofficial-app disclaimer:** no logos, no government logins, no national ID or account numbers. Savings tips only ever cover using less.

### v2 (opt-in, behind the PDPL gate)
16. **Household sync:** end-to-end encrypted with a home key shared by QR. The server stores only ciphertext.
17. **Anonymous monthly usage contribution,** with "homes like yours" comparisons. Cells are published only when they hold k ≥ 20 contributions.
18. **Public open-data dashboard,** with CC BY 4.0 CSV downloads.
19. **Weather-aware projection** from Open-Meteo, using the governorate's centroid only.
20. **The two learning reports** described in §10.

### Never
Anything about meter tampering, scraping or logging into official portals, ads, or trackers.

## 12. Phases
| Phase | Scope | Done when |
|---|---|---|
| 0. Research | Tariff rules and golden cases with sources, prepaid facts, appliance defaults, PDPL review | `tariffs.json` v1 explains every golden case, or the case is flagged |
| 1. Tariff engine | `eg-electricity-tariff` with golden + property tests, signed data | 100% coverage; every golden case matches |
| 2. Energy model | projection, prepaid simulator, appliance models, calibration | simulator and calibration tests are green |
| 3. App v1 | features 1–15 | Maestro flows pass; 200% text gate; APK < 30 MB per ABI |
| 4. Public beta | GitHub pre-release | signed APK and checksums published |
| 5. Backend v2 | Supabase schema/RLS/pgTAP, Edge Functions, sync, contributions, dashboard | RLS tests green; DB dump holds no identifying data |
| 6. Launch | README, screenshots, landing page | a public 1.0 release |
