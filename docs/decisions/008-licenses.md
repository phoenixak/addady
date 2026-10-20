# 008: Licenses

- Status: accepted
- Date: 2026-10-20

## Decision
- **Apps and shared packages: GPL-3.0-only** (root `LICENSE`). It's an OSI license, as IzzyOnDroid requires, and it keeps forks open.
- **`packages/eg-electricity-tariff`: MIT** (its own `LICENSE`), so news sites and companies can embed the calculator.
- **Fonts:** IBM Plex Sans Arabic under OFL-1.1 (`packages/ui-ar/assets/fonts/OFL.txt`), taken from the google/fonts repository. The npm package `@ibm/plex-sans-arabic` ships only woff/woff2, which Android can't use.
