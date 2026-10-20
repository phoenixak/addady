# Architecture

```
 Phone (Expo app, offline-first)                       GitHub / static hosting ($0)
 ┌──────────────────────────────────┐  fetch (signed) ┌──────────────────────────────┐
 │ UI (expo-router, RTL, charts)    │◄────────────────│ tariffs.json + .sig          │
 │ eg-electricity-tariff (bill)     │                 │ aggregates (daily, k ≥ 20)   │
 │ energy-model (projection, prepaid│                 │ dashboard + landing page     │
 │   simulator, appliances)         │                 └──────────────────────────────┘
 │ SQLite (Drizzle): homes,         │
 │   readings, recharges, appliances│
 │ local notification scheduler     │
 └───────────────┬──────────────────┘
                 │ v2, opt-in only: E2E household sync (ciphertext),
                 │ anonymous monthly records and bill-mismatch reports
                 ▼
   Supabase (free): Edge Functions (validate, rate-limit) → tables with RLS
                 │ nightly GitHub Action: aggregate (k ≥ 20) → static JSON/CSV
```

- **The pure packages hold all the logic.** `eg-electricity-tariff`, `energy-model` and `e2e-sync` have no React Native or Expo imports, which ESLint enforces. They're tested in Node at 100% coverage.
- **The app holds no rules of its own.** Tariffs come only from `tariffs.json`, and the app checks its Ed25519 signature with a public key bundled in the app.
- **Money and time:** money is integer piasters. Time is stored in UTC and computed in `Africa/Cairo`.
- **Decisions:** see `docs/decisions/`.
