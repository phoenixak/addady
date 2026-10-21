# Changelog

## addady-v0.1.0: public beta (2026-10-21)

First public beta. Android only, from GitHub Releases.

### What it does
- **Setup in one step:**
  - meter type: prepaid card, postpaid or coded
  - governorate, meter month-start day, low-balance threshold
- **Readings in seconds:** the register for postpaid meters; "this month" kWh plus balance for prepaid. Arabic or Western digits both work.
- **Home screen:**
  - this month's kWh and current tier, on a tier "staircase"
  - what the bill would be today
  - the month-end projection as a range (P10–P90)
  - **cliff warnings**, with the daily kWh budget that keeps you below 100 / 650 / 1000 kWh
- **Prepaid run-out:**
  - when the balance hits zero, and when the meter can actually cut
  - honours Fridays and the 17:00–10:00 window
  - uses the *earliest* plausible time, so you're warned early
- **Bill checker:** the expected bill line by line, with likely causes for any gap.
- **History:** monthly bars with properly shaped Arabic labels.
- **Appliances from their labels,** and **what-if** savings priced with the real tariff.
- **Local notifications** for run-out, cliffs and reading reminders. No server; permission is asked only after the app explains why.
- **CSV export and JSON backup/restore,** through the Android share sheet.
- **Signed tariff updates** (Ed25519) from this repo, with no app update needed.

### Tariffs
- Three sourced versions are bundled: 2024-08, 2026-04 and 2026-07.
- The 2026-07 prices are **medium confidence** until EgyptERA publishes them, so results show "تقديري" (estimated).
- See `docs/research/tariff.md`.

### Known limitations
- Holidays aren't loaded yet, so no-cut holidays are treated as normal days. This errs on the safe side: warnings come earlier, never later.
- Weather-aware projections, household sync and anonymous contributions are planned for v2.
- An English UI isn't available yet.
