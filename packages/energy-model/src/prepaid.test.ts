import { describe, expect, it } from 'vitest';
import { bundledTariffs, versionById, versionFor } from 'eg-electricity-tariff';

import { simulateRunOut, type PrepaidInput } from './prepaid';
import { cairoTime } from './time';
import type { RateModel } from './usage';

const v = versionById(bundledTariffs, '2026-07');
const steady = (perDay: number, spread = 0): RateModel => ({
  meanPerDay: perDay,
  relativeSpread: spread,
  rates: [perDay],
  weights: [1],
  fallback: false,
});
const HOUR = 3_600_000;

const base = (over: Partial<PrepaidInput>): PrepaidInput => ({
  now: cairoTime(2026, 10, 18, 10), // Sunday
  balance: 5000,
  kWhThisMeterMonth: 0,
  meterMonthStartDay: 1,
  tariffFor: () => v,
  model: steady(10),
  runs: 20,
  ...over,
});

describe('simulateRunOut', () => {
  it('matches a hand calculation: 50 EGP at 10 kWh/day lasts ~6.63 days', () => {
    // 50 kWh x 0.68 = 34 EGP (5 days); 16 EGP / 0.98 = 16.3 kWh (1.63 days).
    const r = simulateRunOut(base({}));
    const expected = base({}).now.getTime() + 6.633 * 24 * HOUR;
    expect(Math.abs(r.zeroAt!.p50.getTime() - expected)).toBeLessThan(2 * HOUR);
    expect(r.zeroAt!.p10).toEqual(r.zeroAt!.p90); // no spread -> one answer
    expect(r.shareBeyondHorizon).toBe(0);
  });

  it('prices a shop meter with the commercial bands', () => {
    // 2026-07 commercial: 0-100 kWh flat 162 pt -> 50 EGP lasts 30.9 kWh (3.09 days at 10/day).
    const r = simulateRunOut(base({ customerClass: 'commercial' }));
    const expected = base({}).now.getTime() + 3.09 * 24 * HOUR;
    expect(Math.abs(r.zeroAt!.p50.getTime() - expected)).toBeLessThan(2 * HOUR);
  });

  describe('cuts at the next non-grace instant (from Monday 10:00 at 10 kWh/day, 68 pt/kWh)', () => {
    const monday = cairoTime(2026, 10, 12, 10);

    it('zero at Thursday ~05:12 (morning grace) -> cut Thursday 10:00', () => {
      // 1880 pt covers 27 kWh; the 28th kWh empties it at 2.8 days.
      const r = simulateRunOut(base({ now: monday, balance: 1880 }));
      expect(r.zeroAt!.p50.getTime()).toBeGreaterThan(cairoTime(2026, 10, 15, 5).getTime());
      expect(r.cutAt!.p50).toEqual(cairoTime(2026, 10, 15, 10));
    });

    it('zero at Thursday ~14:48 (no grace) -> cut immediately', () => {
      // 2150 pt covers 31 kWh; the 32nd kWh empties it at 3.2 days.
      const r = simulateRunOut(base({ now: monday, balance: 2150 }));
      expect(r.cutAt!.p50.getTime()).toBe(r.zeroAt!.p50.getTime());
    });

    it('zero at Thursday ~17:12 (evening grace, then Friday) -> cut Saturday 10:00', () => {
      // 2240 pt covers 32 kWh; the 33rd kWh empties it at 3.3 days.
      const r = simulateRunOut(base({ now: monday, balance: 2240 }));
      expect(r.cutAt!.p50).toEqual(cairoTime(2026, 10, 17, 10));
    });
  });

  it('resets tiers at the meter month start, so consumption gets cheaper again', () => {
    // 95 kWh used, 1 day before the reset: crossing 100 would cost the 101-kWh cliff.
    const now = cairoTime(2026, 10, 31, 10);
    const reset = simulateRunOut(
      base({ now, kWhThisMeterMonth: 95, balance: 4000, meterMonthStartDay: 1 }),
    );
    const noReset = simulateRunOut(
      base({ now, kWhThisMeterMonth: 95, balance: 4000, meterMonthStartDay: 15 }),
    );
    expect(reset.zeroAt!.p50.getTime()).toBeGreaterThan(noReset.zeroAt!.p50.getTime());
  });

  it('switches tariff version when the meter month crosses a version boundary', () => {
    const seen: string[] = [];
    simulateRunOut(
      base({
        now: cairoTime(2026, 6, 28, 10),
        balance: 100_000,
        tariffFor: (m) => {
          seen.push(m);
          return versionFor(bundledTariffs, m);
        },
      }),
    );
    expect(seen).toContain('2026-06');
    expect(seen).toContain('2026-07');
  });

  it('reports a zero or negative balance as already empty', () => {
    const now = cairoTime(2026, 10, 15, 20); // Thursday evening
    const r = simulateRunOut(base({ now, balance: 0 }));
    expect(r.zeroAt!.p50).toEqual(now);
    expect(r.cutAt!.p50).toEqual(cairoTime(2026, 10, 17, 10));
  });

  it('returns null when the balance outlasts the horizon in most runs', () => {
    const r = simulateRunOut(base({ balance: 1_000_000, horizonDays: 5 }));
    expect(r.zeroAt).toBeNull();
    expect(r.cutAt).toBeNull();
    expect(r.shareBeyondHorizon).toBe(1);
  });

  it('leaves P90 open (null) when more than 10% of runs outlast the horizon', () => {
    const r = simulateRunOut(
      base({ balance: 2600, model: steady(10, 0.6), horizonDays: 4, runs: 200, seed: 5 }),
    );
    expect(r.shareBeyondHorizon).toBeGreaterThan(0.1);
    expect(r.shareBeyondHorizon).toBeLessThan(0.5);
    expect(r.zeroAt!.p90).toBeNull();
    expect(r.cutAt!.p90).toBeNull();
    expect(r.zeroAt!.p10.getTime()).toBeLessThanOrEqual(r.zeroAt!.p50.getTime());
  });
});
