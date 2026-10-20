# عدّادي · Addady

**اعرف إنت في أنهي شريحة قبل ما الفاتورة تفاجئك**: know which electricity tier you're in before the bill surprises you.

A free, open-source Android app for Egyptian households:
- **Your tier and bill:** this month's tier and the projected bill.
- **Prepaid run-out:** when a prepaid meter will run out, counting the no-cut grace periods (Fridays, holidays, 17:00–10:00).
- **Your appliances:** what each appliance costs, estimated from the label on its back.

No account, no ads, no trackers. Your readings stay on your phone.

> **Unofficial.** Addady has no connection to the Ministry of Electricity, EEHC, EgyptERA or any distribution company. Every number is an estimate, not your bill.

## Status
Early development. See `docs/PLAN.md` for the plan and `docs/decisions/` for the architecture decisions.

## Packages
| Path | What it is |
|---|---|
| `apps/addady` | The Expo (React Native) app |
| `packages/eg-electricity-tariff` | Egyptian residential electricity tariffs and bill engine (MIT, to be published on npm) |
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
