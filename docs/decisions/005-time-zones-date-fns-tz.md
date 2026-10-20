# 005: Time zones with @date-fns/tz

- Status: accepted
- Date: 2026-10-20

## Context
docs/PLAN.md §9 asks the scaffold to pick `@date-fns/tz` or a Temporal polyfill. "Today", meter months and prepaid grace windows (17:00–10:00, Fridays) must be computed in `Africa/Cairo`, which has summer time.

## Decision
Use **`@date-fns/tz`** (1.5.0 at decision time) with `date-fns`, added to `energy-model` when their first date logic lands.
- It's small and tree-shakeable, and works in Hermes and Node. `TZDate` does zoned arithmetic, so it won't break on DST transitions.
- A Temporal polyfill is far larger. Revisit when Hermes ships native Temporal.

## Consequences
- Pure packages take an injected clock (`now: () => Date`), so tests can cross Cairo's DST transitions deterministically.
- This relies on the runtime's IANA tz data (Intl). If Hermes on old Android lacks `Africa/Cairo` rules, the Phase 2 simulator tests on device will show it.
