# Research: appliance defaults

- Researched: 2026-10-20 from public sources only.
- These values are used **only when the user hasn't entered the label value**. Every estimate that relies on one is shown as a range and marked with its confidence.
- The keys match `DEFAULTS` in `packages/energy-model/src/appliances.ts`.

| Key | Value | Confidence | Source / basis |
|---|---|---|---|
| `ac.btuPerHp` | 8,000 BTU/h per marketed HP (1.5 HP = 12,000) | medium | Egyptian retailer listings of 1.5 HP split units: [B.TECH](https://btech.com/ar/p/beko-split-ac-inverter-1-5hp-cool-bict1220), [Carrefour Egypt](https://www.carrefouregypt.com/mafegy/ar/air-conditioners/beko-ac-biht1241x-1-5hp-h-c-fa/p/652999) |
| `ac.eer.inverter` | 11.5 BTU/Wh | medium | [Carrier 1.5 HP inverter](https://www.carrefouregypt.com/mafegy/ar/air-conditioners/carrier-a-c-53qheft12dn8-708f1-5hp/p/661122): 12,400 BTU/h cooling at 1,080 W |
| `ac.eer.fixed` | 9.5 BTU/Wh | **low** | Assumption. Egypt's label standard ES 3795/2023 ([CLASP](https://cprc-clasp.ngo/policies/37952023-energy-efficiency-label-requirements-air-conditioner-room-air-conditioner-window)) is in force, but its EER classes weren't publicly available |
| `ac.designDeltaC` | 12 °C | low | Assumption. Each home's AC runtime factor `k` is fitted from its own readings |
| `motor.powerFactor` | 0.8 | medium | Typical small single-phase induction motor |
| `motor.loadFactor.*` | pump 0.8, fan 0.6 | low | Assumption: the current on the nameplate is the maximum, not the average |
| `fridge.kWhPerYear` | 400 | **low** | No Egyptian label data found. US ENERGY STAR 16 ft³ units are 347–452 kWh/yr ([example](https://www.energystar.gov/productfinder/product/certified-residential-refrigerators/details/2381220/export/pdf)) |
| `fridge.dutyCycle` | 0.4 | low | Assumption (35–50% compressor runtime) |
| `fridge.summerFactor` | 1.25 | low | Assumption: a hotter kitchen raises consumption by 20–30% |
| `heater.standbyKWhPerDayAt80L` | 1.0 kWh/day, scaled by (litres/80)^(2/3) | low | Manufacturer figure for an 80 L tank (~1 kWh/day); one measured ~72 L tank at 60 °C lost 0.5 kWh/day ([source](https://kaspars.net/blog/electric-hot-water-heater-insulation-efficiency/md)). Heat loss scales with surface area, hence ^(2/3) |
| `heater.inletC.*` | winter 16 °C, summer 27 °C | low | Assumption for Nile Valley mains water |
| water heating | L × ΔT × 4.186 / 3600 kWh | high | Physics (specific heat of water) |
| 1 HP | 746 W | high | Definition (mechanical horsepower) |

## Follow-ups
- Look for Egyptian energy-label databases (fridges, ACs) to replace the low-confidence defaults.
- After launch, opt-in anonymous calibration results (appliance type → fitted scale) can replace the defaults with real Egyptian data.
