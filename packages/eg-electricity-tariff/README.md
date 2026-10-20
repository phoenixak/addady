# eg-electricity-tariff

Egyptian **residential electricity tariffs** and an exact **bill engine**, as data plus a tiny, dependency-light TypeScript library:
- tiers and cliffs
- customer-service fees
- coded meters
- version history
- Ed25519-signed data

Every number is sourced. Research notes and confidence levels are in [`docs/research/tariff.md`](https://github.com/phoenixak/addady/blob/main/docs/research/tariff.md).

> **Unofficial.** This package isn't affiliated with EgyptERA, the Ministry of Electricity or any distribution company. Results are estimates, not your bill.

## How Egyptian residential bills work
The month's **total** kWh selects one band, and each band prices **every** kWh from zero:

| Month total | Rule |
|---|---|
| 0–100 kWh | progressive: 0–50 at tier 1, 51–100 at tier 2 |
| 101–650 kWh | progressive **from zero**: first 200 at tier 3, then tier 4 (to 350), then tier 5 (to 650) |
| 651–1000 kWh | **flat**: every kWh at tier 6 |
| over 1000 kWh | **flat**: every kWh at tier 7 |

So there are **cliffs** at 100 → 101, 650 → 651 and 1000 → 1001 kWh, where one extra kWh reprices the whole month. A monthly customer-service fee is added according to the band.

## Usage
```ts
import { bill, bundledTariffs, versionFor, nextCliff } from 'eg-electricity-tariff';

const tariff = versionFor(bundledTariffs, '2026-10'); // consumption month
const b = bill(tariff, 300);
b.total;  // 41400 piasters = 414.00 EGP (403.00 energy + 11.00 fee)
b.lines;  // [{ tier: 3, kWh: 200, rate: 115, amount: 23000 }, { tier: 4, kWh: 100, rate: 173, amount: 17300 }]

nextCliff(tariff, 88); // { atKWh: 100, totalBefore: 8500, totalAfter: 12215, jump: 3715 }

bill(tariff, 200, { meterType: 'coded' }).total; // flat 274 piasters/kWh
```

All money is **integer piasters**. kWh must be a non-negative integer.

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
| `2024-08` | Aug 2024 | high (EgyptERA) |
| `2026-04` | Apr 2026 | high (EgyptERA + EEHC worked examples) |
| `2026-07` | Jul 2026 ("August bill") | medium (ministry figures; not yet on EgyptERA's site) |

## License
MIT. The data is public tariff information.
