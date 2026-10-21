# عدّادي · Addady

**اعرف إنت في أنهي شريحة قبل ما الفاتورة تفاجئك**: know which electricity tier you're in before the bill surprises you.

A free, open-source Android app for every electricity meter in Egypt: homes, shops, offices, factories and farms.
- **Your tier and bill:** this month's tier and the projected bill, priced with your EgyptERA class (residential, commercial, voltage level, irrigation).
- **Prepaid run-out:** when a prepaid meter will run out, counting the no-cut grace periods (Fridays, holidays, 17:00–10:00).
- **Tools:**
  - a bill checker
  - "ليه رصيدي اتخصم؟" (why was my balance deducted at recharge?)
  - tier cliffs
  - prices for every class
  - appliance costs from the label on the back
- **اعرف حقك (know your rights):** sourced step-by-step procedures (complaints, contesting a bill, meter tests, coded → legal meters), with a 121 call button.

No account, no ads, no trackers. Your readings stay on your phone.

> **Unofficial.** Addady has no connection to the Ministry of Electricity, EEHC, EgyptERA or any distribution company. Every number is an estimate, not your bill.

## Install (Android)
1. Open [Releases](https://github.com/phoenixak/addady/releases) and download `addady-<version>-arm64-v8a.apk`. Pick `armeabi-v7a` only for very old phones.
2. Open the file and allow "install unknown apps" for your browser or file manager when Android asks.
3. Optional: verify the download against `SHA256SUMS.txt` from the same release.

For automatic updates, add this repository to [Obtainium](https://github.com/ImranR98/Obtainium).

**Signing certificate (SHA-256):** `5F:87:46:51:51:7F:CF:6D:91:9A:A7:56:25:CB:D5:3C:C4:09:7A:5A:BA:DA:6F:4D:DE:50:36:31:84:33:BA:18`. Every official build is signed with this key. Android refuses an update signed with any other key.

## Status
Public beta. See `CHANGELOG.md` for what's in each release, `docs/PLAN.md` for the plan, and `docs/decisions/` for the architecture decisions.

## Packages
| Path | What it is |
|---|---|
| `apps/addady` | The Expo (React Native) app |
| `packages/eg-electricity-tariff` | Egyptian electricity tariffs for every customer class, and the bill engine ([npm](https://www.npmjs.com/package/eg-electricity-tariff), MIT) |
| `packages/energy-model` | Usage projection, prepaid run-out simulator, appliance models |
| `packages/ui-ar` | Arabic-first UI kit: RTL, Arabic numerals, money formatting |

## Development
Requirements: Node 24, pnpm 10. For device builds, JDK 17 and the Android SDK (see ADR 007).

```sh
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm test:apps
pnpm --filter @addady/app android   # dev build on a device or emulator
```

## License
The app and shared packages are GPL-3.0 (`LICENSE`). `packages/eg-electricity-tariff` is MIT. IBM Plex Sans Arabic is under OFL-1.1.
