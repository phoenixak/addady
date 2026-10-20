import { describe, expect, it } from 'vitest';
import { bundledTariffs, versionById } from 'eg-electricity-tariff';

import { cliffBudget, projectBill, projectMonthKWh } from './projection';
import type { RateModel } from './usage';

const v = versionById(bundledTariffs, '2026-07');
const steady = (perDay: number, spread = 0): RateModel => ({
  meanPerDay: perDay,
  relativeSpread: spread,
  rates: [perDay],
  weights: [1],
  fallback: false,
});
const now = new Date('2026-10-20T10:00:00Z');
const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe('projectMonthKWh', () => {
  it('adds steady usage over the remaining days, including a partial day', () => {
    const r = projectMonthKWh({
      kWhSoFar: 100,
      now,
      monthEnd: inDays(10.5),
      model: steady(8),
      runs: 50,
    });
    expect(r).toEqual({ p10: 184, p50: 184, p90: 184 });
  });

  it('returns what is already used when the month is over', () => {
    const r = projectMonthKWh({ kWhSoFar: 120, now, monthEnd: inDays(-1), model: steady(8) });
    expect(r).toEqual({ p10: 120, p50: 120, p90: 120 });
  });

  it('widens with uncertainty and keeps P10 <= P50 <= P90', () => {
    const r = projectMonthKWh({
      kWhSoFar: 0,
      now,
      monthEnd: inDays(20),
      model: steady(10, 0.3),
      seed: 3,
    });
    expect(r.p10).toBeLessThan(r.p50);
    expect(r.p50).toBeLessThan(r.p90);
    expect(Math.abs(r.p50 - 200)).toBeLessThan(10);
  });
});

describe('projectBill', () => {
  it('prices each quantile with the tariff', () => {
    const b = projectBill(v, { p10: 90, p50: 99.6, p90: 101 });
    expect(b.total).toEqual({ p10: 3400 + 40 * 98 + 200, p50: 8500, p90: 12215 });
  });

  it('supports coded meters', () => {
    expect(projectBill(v, { p10: 10, p50: 10, p90: 10 }, 'coded').total.p50).toBe(2740 + 100);
  });
});

describe('cliffBudget', () => {
  it('gives the daily kWh that keeps the month at or below the next cliff', () => {
    const b = cliffBudget(v, 88, 9)!;
    expect(b.atKWh).toBe(100);
    expect(b.jump).toBe(3715);
    expect(b.kWhPerDay).toBeCloseTo(12 / 9);
  });

  it('is null past the last cliff or when the month has ended', () => {
    expect(cliffBudget(v, 1200, 5)).toBeNull();
    expect(cliffBudget(v, 88, 0)).toBeNull();
  });
});
