# .maestro

Maestro E2E flows, run on an Android emulator (locally or in CI):

- `onboarding-prepaid.yaml`: fresh install, prepaid setup, first reading, run-out card.
- `bill-check.yaml`: the bill checker reproduces an official EEHC example (300 kWh, 2026-04 tariff).

```sh
maestro test .maestro/
```
