import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { calibrate, type ApplianceSeries, type MonthTotal } from './calibration';
import { normal, seededRandom } from './random';

// A synthetic home over 12 months: AC peaks in summer, the heater in winter, the fridge is steady.
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const AC = [0, 0, 20, 80, 200, 330, 400, 410, 300, 120, 10, 0];
const HEATER = [140, 130, 100, 60, 40, 30, 25, 25, 35, 60, 100, 140];
const FRIDGE = DAYS.map((d) => d * 1.1);

function home(
  trueScales: [number, number, number],
  baselinePerDay: number,
  noise: number,
  seed: number,
) {
  const random = seededRandom(seed);
  const months: MonthTotal[] = DAYS.map((days, k) => ({
    days,
    kWh:
      (trueScales[0] * AC[k]! +
        trueScales[1] * HEATER[k]! +
        trueScales[2] * FRIDGE[k]! +
        baselinePerDay * days) *
      (1 + noise * normal(random)),
  }));
  const appliances: ApplianceSeries[] = [
    { id: 'ac', estimates: AC, confidence: 'default' },
    { id: 'heater', estimates: HEATER, confidence: 'default' },
    { id: 'fridge', estimates: FRIDGE, confidence: 'label-exact' },
  ];
  return { months, appliances };
}

describe('calibrate', () => {
  it('recovers known scales within ±15% from noisy synthetic data', () => {
    const { months, appliances } = home([1.3, 0.8, 1], 3, 0.02, 1);
    const c = calibrate(months, appliances, { lambda: 0.05 });
    const [ac, heater, fridge] = c.appliances;
    expect(Math.abs(ac!.scale - 1.3) / 1.3).toBeLessThan(0.15);
    expect(Math.abs(heater!.scale - 0.8) / 0.8).toBeLessThan(0.15);
    expect(Math.abs(fridge!.scale - 1) / 1).toBeLessThan(0.15);
    expect(Math.abs(c.baselinePerDay - 3) / 3).toBeLessThan(0.35);
    expect(ac!.low).toBeLessThanOrEqual(ac!.scale);
    expect(ac!.high).toBeGreaterThanOrEqual(ac!.scale);
    expect(ac!.kWh[6]).toBeCloseTo(AC[6]! * ac!.scale);
  });

  it('recovers a strongly seasonal load (AC) within ±15% for random true scales (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.6, max: 1.6, noNaN: true }),
        fc.double({ min: 0.6, max: 1.6, noNaN: true }),
        fc.integer({ min: 1, max: 1e6 }),
        (sAc, sHeater, seed) => {
          const { months, appliances } = home([sAc, sHeater, 1], 2, 0.02, seed);
          const c = calibrate(months, appliances, { lambda: 0.05 });
          expect(Math.abs(c.appliances[0]!.scale - sAc) / sAc).toBeLessThan(0.15);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('reports honest 80% intervals: they cover the true scale ~80% of the time', () => {
    // Regression: intervals from each appliance's own column ignored collinearity with the
    // baseline and covered the truth only ~25-30% of the time (fast-check seed -23258641,
    // counterexample scales [0.6, 0.6]). The joint covariance fixes it.
    const pick = seededRandom(99);
    const N = 200;
    let coveredAc = 0;
    let coveredHeater = 0;
    for (let n = 0; n < N; n++) {
      const sAc = 0.6 + pick();
      const sHeater = 0.6 + pick();
      const { months, appliances } = home([sAc, sHeater, 1], 2, 0.02, 1 + n);
      const [ac, heater] = calibrate(months, appliances, { lambda: 0.05 }).appliances;
      if (ac!.low <= sAc && sAc <= ac!.high) coveredAc++;
      if (heater!.low <= sHeater && sHeater <= heater!.high) coveredHeater++;
    }
    for (const covered of [coveredAc, coveredHeater]) {
      expect(covered / N).toBeGreaterThan(0.7);
      expect(covered / N).toBeLessThan(0.95);
    }
  });

  it('gives a load that looks partly constant (heater) a wider range than a seasonal one (AC)', () => {
    const { months, appliances } = home([1, 1, 1], 2, 0.02, 4);
    const [ac, heater] = calibrate(months, appliances).appliances;
    expect(heater!.high - heater!.low).toBeGreaterThan(ac!.high - ac!.low);
  });

  it('keeps label-exact appliances near 1 and never returns negative scales', () => {
    const months = DAYS.map((days) => ({ days, kWh: 10 }));
    const c = calibrate(months, [
      { id: 'fridge', estimates: FRIDGE, confidence: 'label-exact' },
      { id: 'ac', estimates: AC, confidence: 'label-derived' },
    ]);
    for (const a of c.appliances) expect(a.scale).toBeGreaterThanOrEqual(0);
    expect(c.baselinePerDay).toBeGreaterThanOrEqual(0);
  });

  it('handles an appliance with all-zero estimates', () => {
    const months = DAYS.slice(0, 3).map((days) => ({ days, kWh: days * 5 }));
    const c = calibrate(months, [{ id: 'unused', estimates: [0, 0, 0], confidence: 'default' }]);
    expect(c.appliances[0]!.scale).toBe(1);
    expect(c.baselinePerDay).toBeCloseTo(5);
    expect(c.rmse).toBeCloseTo(0);
  });

  it('stops at maxIterations when asked', () => {
    const { months, appliances } = home([1.2, 1, 1], 2, 0, 3);
    expect(calibrate(months, appliances, { maxIterations: 1 }).iterations).toBe(1);
  });

  it('validates input sizes', () => {
    expect(() => calibrate([{ days: 30, kWh: 100 }], [])).toThrow(/at least 3 months/);
    const months = DAYS.slice(0, 3).map((days) => ({ days, kWh: 100 }));
    expect(() => calibrate(months, [{ id: 'x', estimates: [1], confidence: 'default' }])).toThrow(
      /expected 3/,
    );
  });
});
