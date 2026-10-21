# eg-electricity-tariff

Egyptian **electricity tariffs for every customer class** and an exact **bill engine**, as data plus a tiny, dependency-light TypeScript library.

**Customer classes:**
- homes
- shops and offices (commercial)
- coded meters
- factories by supply voltage (380 V up to 220 kV)
- irrigation
- public lighting

**What the engine handles:**
- tiers and cliffs
- customer-service fees
- consumption stamps
- version history
- Ed25519-signed data

Every number is sourced. Research notes and confidence levels:
- [`docs/research/tariff.md`](https://github.com/phoenixak/addady/blob/main/docs/research/tariff.md) (homes)
- [`docs/research/tariff-classes.md`](https://github.com/phoenixak/addady/blob/main/docs/research/tariff-classes.md) (every other class)

> **Unofficial.** This package isn't affiliated with EgyptERA, the Ministry of Electricity or any distribution company. Results are estimates, not your bill.

## How Egyptian bills are priced
The month's **total** kWh selects one band of the customer's class, and each band prices **every** kWh from zero. One extra kWh at a band edge (a **cliff**) reprices the whole month.

**Homes (`residential`)**

| Month total | Rule |
|---|---|
| 0–100 kWh | progressive: 0–50 at tier 1, 51–100 at tier 2 |
| 101–650 kWh | progressive **from zero**: first 200 at tier 3, then tier 4 (to 350), then tier 5 (to 650) |
| 651–1000 kWh | **flat**: every kWh at tier 6 |
| over 1000 kWh | **flat**: every kWh at tier 7 |

**Shops and offices (`commercial`)**

| Month total | Rule |
|---|---|
| 0–100 | flat |
| 101–250 | flat |
| 251–1000 | progressive from zero (0–600, then 601–1000) |
| over 1000 | flat |

Commercial bills also carry a **3 piaster/kWh** stamp.

**Factories, irrigation and lighting**
- One flat price per kWh, set by the supply voltage: `lowVoltage`, `mediumVoltage`, `highVoltage`, `extraHighVoltage`.
- Irrigation has its own classes: `irrigationLowVoltage`, `irrigationMediumVoltage`. So does public lighting (`publicLighting`).
- Industry pays a stamp of **0.6 piasters per 10 kWh**.
- Voltage prices assume a power factor of at least 0.92. Demand charges and the 3 EGP annual stamp aren't included.

## Usage
```ts
import { bill, bundledTariffs, cliffs, nextCliff, versionFor } from 'eg-electricity-tariff';

const tariff = versionFor(bundledTariffs, '2026-10'); // consumption month

// Homes are the default class.
const b = bill(tariff, 300);
b.total; // 41400 piasters = 414.00 EGP (403.00 energy + 11.00 fee)
b.lines; // [{ tier: 3, kWh: 200, rate: 115, ... }, { tier: 4, kWh: 100, rate: 173, ... }]
nextCliff(tariff, 88); // { atKWh: 100, totalBefore: 8500, totalAfter: 12215, jump: 3715 }

// A shop: 700 kWh = 600 x 2.64 + 100 x 2.74, + 25 EGP fee, + 21 EGP stamp.
bill(tariff, 700, { customerClass: 'commercial' }).total; // 190400
cliffs(tariff, { customerClass: 'commercial' }).map((c) => c.atKWh); // [100, 250, 1000]

// A factory with its own medium-voltage transformer.
bill(tariff, 10_000, { customerClass: 'mediumVoltage' }); // energy 2550000, fee 3500, stamps 600

// A coded meter is always priced at the coded rate.
bill(tariff, 200, { meterType: 'coded' }).energy; // 54800
```

- All money is **integer piasters**, rounded half up once per line. kWh must be a non-negative integer.
- `bill().confidence` is the lower of the version's and the class's confidence.
- Show `medium` and `low` results as estimates.

### Verifying downloaded data
`data/tariffs.json` is signed (`data/tariffs.json.sig`). Verify it before trusting a copy fetched over the network:

```ts
import { parseTariffFile, verifyTariffSignature } from 'eg-electricity-tariff';

if (!verifyTariffSignature(bytes, signatureHex)) throw new Error('untrusted tariff data');
const tariffs = parseTariffFile(JSON.parse(new TextDecoder().decode(bytes)));
```

## Versions bundled
| id | Consumption from | Confidence |
|---|---|---|
| `2024-08` | Aug 2024 | high (EgyptERA). The coded rate is medium |
| `2026-04` | Apr 2026 | high (EgyptERA + EEHC worked examples) |
| `2026-07` | Jul 2026 ("August bill") | medium. Homes come from ministry figures; other classes repeat April 2026, since no change was reported |

## License
MIT. The data is public tariff information.
