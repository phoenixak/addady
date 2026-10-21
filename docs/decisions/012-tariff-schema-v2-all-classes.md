# 012: Tariff schema v2: every customer class, stamps, and places instead of homes

- Status: accepted
- Date: 2026-10-21

## Context
v0.1 priced homes only. Addady now also covers:
- shops, offices and companies (commercial)
- factories (priced by supply voltage)
- irrigation pumps
- public lighting

EgyptERA publishes all of these with the same "consumption band" wording it uses for homes. The research is in `docs/research/tariff-classes.md`.

## Decision
1. **Schema v2:** `versions[].classes` maps a customer class to a `ClassTariff`, which reuses the v1 band, fee and confidence model unchanged.
   - Classes: `residential`, `commercial`, `coded`, `lowVoltage`, `mediumVoltage`, `highVoltage`, `extraHighVoltage`, `irrigationLowVoltage`, `irrigationMediumVoltage`, `publicLighting`.
   - Commercial is four bands (flat / flat / progressive 0–600, then 601–1000 / flat).
   - Voltage classes are one unbounded flat band at tier 0.
   - The coded meter becomes a class like any other. Its fee falls back to the residential schedule, so the class stays low confidence.
   - `residential` is required; the other classes are optional.
2. **Stamps:**
   - `stamps.perKWh`: 3 piasters/kWh for commercial, lighting and irrigation.
   - `stamps.per10KWh`: 0.6 piasters per 10 kWh for industry.
   - The stamp is its own bill line, rounded half-up once, and is part of `total`.
   - Not modelled: the annual 3 EGP supply stamp, demand charges, and power-factor penalties.
     - The penalty formula has no official source yet; v0.3 adds it as an explicitly estimated line.
3. **API:** `bill(version, kWh, { customerClass = 'residential', meterType })`.
   - `meterType: 'coded'` always selects the coded class.
   - `Bill` gains `customerClass` and `stamps`.
   - `confidence` is the lower of the version's and the class's.
   - `cliffs` / `nextCliff` / `bandFor` take the same options. Single-band classes have no cliffs.
4. **2026-07 non-residential prices repeat 2026-04** at medium confidence, because no source reports a change (`tariff-classes.md` §1).
5. **No official worked examples were found** outside homes. The golden cases for other classes are hand-computed from the regulator's table and marked `kind: "regulator-table"`. Unit tests check every class: monotonic from 1 kWh, and the exact commercial and voltage arithmetic.
6. **App data:** the `homes` table keeps its name (no destructive migration) and gains:
   - `kind`: home / shop / office / factory / farm, picked in "مين إنت؟"
   - `customer_class`
   - `power_factor`

   Existing rows default to `home` / `residential`. Backups from v0.1 restore with the same defaults.

## Consequences
- **v0.1 installs** parse only schema 1. The signed v2 file on `main` fails their schema check, so they keep their bundled 2026-07 prices, which are still current. That fails closed and is harmless. Users get class support by updating the app.
- **Adding a class** (for example EV charging, decree 101/2025) is a data change plus a name in `CUSTOMER_CLASSES`.
- **The npm package** is published as `0.1.0` with this schema.
