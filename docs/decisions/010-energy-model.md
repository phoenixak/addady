# 010: Energy model: Monte Carlo projections, prepaid run-out, appliance calibration

- Status: accepted
- Date: 2026-10-20

## Decision
1. **Uncertainty, not point estimates.** Projections are a seeded Monte Carlo bootstrap over recency-weighted daily rates.
   - The relative spread has a 15% floor, so a short history never looks certain.
   - The UI shows P10–P90. Notifications always use **P10**, the earliest plausible time.
2. **Prepaid run-out:**
   - Each kWh costs `energy(n+1) − energy(n)` under the band rules (ADR 009), so crossing a cliff charges the repricing at once.
   - Tiers reset on the meter's own month-start day.
   - The meter cuts at the first instant after zero balance that is outside grace: Fridays, confirmed holidays, and 17:00–10:00 Cairo time.
   - The hourly Cairo timeline is computed once and shared by all runs, which keeps it fast enough for a phone.
3. **Holidays are data, and only confirmed ones count.** Egypt moves holidays by decree, and lunar dates depend on moon sighting. An unconfirmed holiday is treated as a normal day, so a predicted cut can come early but never late.
4. **Time:** everything is computed in `Africa/Cairo` with `@date-fns/tz` (ADR 005). DST transitions are tested.
5. **Appliances:** label values always win over defaults. Every default has a source and a confidence (`docs/research/appliances.md`).
6. **Calibration:** ridge-regularised non-negative least squares (coordinate descent), with label-exact appliances held near their label. **Ranges come from the joint covariance** σ²(XᵀX + Λ)⁻¹, including the baseline.

## Finding (2026-10-20)
- fast-check found that a winter-heavy heater with a large year-round component **can't be recovered to ±15%** from monthly totals with 2% noise. It trades off against the constant baseline, and the error is about 27% even with no regularisation.
- The original per-appliance standard errors ignored this collinearity. Their "80%" intervals covered the truth only 25–30% of the time.
- With the joint covariance, coverage is 76–88%.

So the app shows such appliances with an honestly wide range. Strongly seasonal loads (AC) are recovered within ±15% (tested as a property).

## Consequences
- More frequent readings (weekly rather than monthly) and weather data (v2) will narrow these ranges. The model doesn't need to change.
