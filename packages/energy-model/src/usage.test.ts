import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { normal, quantile, range, seededRandom } from './random';
import { rateModel, sampleDay, usageIntervals, type Reading } from './usage';

const day = (n: number) => new Date(Date.UTC(2026, 9, 1) + n * 86_400_000);

describe('usageIntervals', () => {
  it('turns cumulative readings into per-day rates, in time order', () => {
    const readings: Reading[] = [
      { at: day(10), kWh: 1150 },
      { at: day(0), kWh: 1000 },
      { at: day(5), kWh: 1050 },
    ];
    const { intervals, skippedDecreases } = usageIntervals(readings);
    expect(skippedDecreases).toBe(0);
    expect(intervals.map((i) => [i.days, i.kWh, i.perDay])).toEqual([
      [5, 50, 10],
      [5, 100, 20],
    ]);
  });

  it('skips readings at the same instant and counts decreases', () => {
    const { intervals, skippedDecreases } = usageIntervals([
      { at: day(0), kWh: 1000 },
      { at: day(0), kWh: 1000 },
      { at: day(2), kWh: 990 },
      { at: day(4), kWh: 1010 },
    ]);
    expect(skippedDecreases).toBe(1);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]!.perDay).toBe(10);
  });
});

describe('rateModel', () => {
  it('falls back to a wide guess with no history', () => {
    const m = rateModel([], day(0), { fallbackPerDay: 8 });
    expect(m).toMatchObject({ meanPerDay: 8, relativeSpread: 0.5, fallback: true });
  });

  it('weights recent intervals more', () => {
    const { intervals } = usageIntervals([
      { at: day(0), kWh: 0 },
      { at: day(30), kWh: 300 }, // 10/day, long ago
      { at: day(60), kWh: 900 }, // 20/day, recent
    ]);
    const m = rateModel(intervals, day(60), { halfLifeDays: 14 });
    expect(m.meanPerDay).toBeGreaterThan(15);
    expect(m.weights[1]!).toBeGreaterThan(m.weights[0]!);
    expect(m.fallback).toBe(false);
  });

  it('never reports less spread than the floor, even for identical intervals', () => {
    const { intervals } = usageIntervals([
      { at: day(0), kWh: 0 },
      { at: day(1), kWh: 10 },
      { at: day(2), kWh: 20 },
    ]);
    expect(rateModel(intervals, day(2), { minRelativeSpread: 0.15 }).relativeSpread).toBe(0.15);
    const zero = usageIntervals([
      { at: day(0), kWh: 5 },
      { at: day(1), kWh: 5 },
    ]).intervals;
    expect(rateModel(zero, day(1)).relativeSpread).toBe(0.15);
  });
});

describe('sampleDay', () => {
  it('is reproducible for a seed and never negative', () => {
    const m = rateModel([], day(0), { fallbackPerDay: 10 });
    const a = seededRandom(7);
    const b = seededRandom(7);
    for (let i = 0; i < 100; i++) {
      const x = sampleDay(m, a);
      expect(x).toBe(sampleDay(m, b));
      expect(x).toBeGreaterThanOrEqual(0);
    }
  });

  it('averages close to the model mean over many days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2 ** 31 }),
        fc.double({ min: 1, max: 60, noNaN: true }),
        (seed, perDay) => {
          const m = {
            meanPerDay: perDay,
            relativeSpread: 0.15,
            rates: [perDay],
            weights: [1],
            fallback: false,
          };
          const random = seededRandom(seed);
          let sum = 0;
          for (let i = 0; i < 4000; i++) sum += sampleDay(m, random);
          expect(Math.abs(sum / 4000 - perDay) / perDay).toBeLessThan(0.02);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('falls through to the last rate if the weights sum just under 1', () => {
    const m = {
      meanPerDay: 5,
      relativeSpread: 0,
      rates: [1, 5],
      weights: [0.5, 0.4999],
      fallback: false,
    };
    expect(sampleDay(m, () => 0.99999)).toBe(5);
  });
});

describe('random helpers', () => {
  it('quantile interpolates and handles infinity ("never")', () => {
    expect(quantile([0, 10], 0.5)).toBe(5);
    expect(quantile([1, 2, 3], 0.5)).toBe(2);
    expect(quantile([1, Number.POSITIVE_INFINITY], 0.5)).toBe(Number.POSITIVE_INFINITY);
    expect(() => quantile([], 0.5)).toThrow(RangeError);
    expect(range([3, 1, 2])).toEqual({ p10: 1.2, p50: 2, p90: 2.8 });
  });

  it('normal samples have mean ~0 and sd ~1', () => {
    const random = seededRandom(1);
    const xs = Array.from({ length: 20000 }, () => normal(random));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
  });
});
