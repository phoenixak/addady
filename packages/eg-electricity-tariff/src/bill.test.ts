import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import {
  bandFor,
  bill,
  bundledTariffs,
  cliffs,
  nextCliff,
  versionById,
  versionFor,
  type TariffVersion,
} from './index';

const v2026_07 = versionById(bundledTariffs, '2026-07');
const v2024_08 = versionById(bundledTariffs, '2024-08');
const versions = bundledTariffs.versions;
const kWh = fc.integer({ min: 0, max: 5000 });

describe('bill: worked lines', () => {
  it('prices 0-100 kWh progressively from tier 1', () => {
    const b = bill(v2026_07, 80);
    expect(b.lines).toEqual([
      { tier: 1, fromKWh: 1, toKWh: 50, kWh: 50, rate: 68, amount: 3400 },
      { tier: 2, fromKWh: 51, toKWh: 80, kWh: 30, rate: 98, amount: 2940 },
    ]);
    expect(b.energy).toBe(6340);
    expect(b.serviceFee).toBe(200);
    expect(b.total).toBe(6540);
    expect(b.bandIndex).toBe(0);
  });

  it('restarts from zero at tier 3 above 100 kWh', () => {
    const b = bill(v2026_07, 101);
    expect(b.lines).toEqual([
      { tier: 3, fromKWh: 1, toKWh: 101, kWh: 101, rate: 115, amount: 11615 },
    ]);
    expect(b.bandIndex).toBe(1);
  });

  it('bills 651-1000 kWh flat at tier 6 and above 1000 flat at tier 7', () => {
    expect(bill(v2026_07, 651).lines).toEqual([
      { tier: 6, fromKWh: 1, toKWh: 651, kWh: 651, rate: 241, amount: 156891 },
    ]);
    expect(bill(v2026_07, 1001).lines[0]!.tier).toBe(7);
  });

  it('charges the zero-read fee and no energy for 0 kWh', () => {
    const b = bill(v2026_07, 0);
    expect(b).toMatchObject({ lines: [], energy: 0, serviceFee: 900, total: 900, bandIndex: -1 });
  });

  it('bills coded meters flat on every kWh with low confidence', () => {
    const b = bill(v2026_07, 200, { meterType: 'coded' });
    expect(b.lines).toEqual([
      { tier: 0, fromKWh: 1, toKWh: 200, kWh: 200, rate: 274, amount: 54800 },
    ]);
    expect(b.confidence).toBe('low');
    expect(bill(v2026_07, 0, { meterType: 'coded' }).energy).toBe(0);
  });

  it('refuses coded meters on a version without a coded rate', () => {
    expect(() => bill(v2024_08, 10, { meterType: 'coded' })).toThrow(/no coded-meter rate/);
  });

  it('treats prepaid like postpaid tiers within the meter month', () => {
    expect(bill(v2026_07, 300, { meterType: 'prepaid' }).total).toBe(bill(v2026_07, 300).total);
  });

  it('rejects negative or fractional kWh', () => {
    expect(() => bill(v2026_07, -1)).toThrow(RangeError);
    expect(() => bill(v2026_07, 1.5)).toThrow(RangeError);
  });

  it('rounds fractional piasters half up once per line', () => {
    const version: TariffVersion = {
      ...v2026_07,
      residential: {
        ...v2026_07.residential,
        bands: [{ upTo: null, mode: 'flat', tier: 1, rate: 87.36 }],
      },
    };
    expect(bill(version, 1).energy).toBe(87); // 87.36
    expect(bill(version, 2).energy).toBe(175); // 174.72
    expect(bill(version, 25).energy).toBe(2184); // 2184.00
  });

  it('stops a progressive band at an unbounded last tier', () => {
    const version: TariffVersion = {
      ...v2026_07,
      residential: {
        ...v2026_07.residential,
        bands: [
          {
            upTo: null,
            mode: 'progressive',
            tiers: [
              { tier: 1, upTo: 10, rate: 100 },
              { tier: 2, upTo: null, rate: 200 },
            ],
          },
        ],
      },
    };
    expect(bill(version, 15).energy).toBe(10 * 100 + 5 * 200);
  });
});

describe('bill: properties for every bundled version', () => {
  it('never decreases when consumption grows by one kWh (from 1 kWh up)', () => {
    for (const v of versions) {
      fc.assert(
        fc.property(
          kWh.filter((k) => k >= 1),
          (k) => bill(v, k + 1).total >= bill(v, k).total,
        ),
      );
    }
  });

  it('regression (fast-check seed -1582139285, counterexample 0): a zero read costs more than 1 kWh', () => {
    // EgyptERA's 9 EGP "zero read / closed" fee is higher than 1 kWh at tier 1 plus its 1 EGP fee.
    // This is the official schedule, not an engine bug, so monotonicity is only claimed from 1 kWh.
    for (const v of versions) {
      expect(bill(v, 0).total).toBe(900);
      expect(bill(v, 1).total).toBe(68 + 100);
    }
  });

  it('within a progressive band, one more kWh costs exactly that tier rate', () => {
    fc.assert(
      fc.property(fc.constantFrom(...versions), fc.integer({ min: 1, max: 649 }), (v, k) => {
        const a = bandFor(v, k);
        const b = bandFor(v, k + 1);
        fc.pre(a.index === b.index && a.band.mode === 'progressive');
        const diff = bill(v, k + 1).energy - bill(v, k).energy;
        const lastLine = bill(v, k + 1).lines.at(-1)!;
        expect(diff).toBe(lastLine.rate);
      }),
    );
  });

  it('flat bands charge rate x kWh', () => {
    fc.assert(
      fc.property(fc.constantFrom(...versions), fc.integer({ min: 651, max: 5000 }), (v, k) => {
        const { band } = bandFor(v, k);
        expect(band.mode).toBe('flat');
        expect(bill(v, k).energy).toBe(k * (band as { rate: number }).rate);
      }),
    );
  });

  it('line kWh always add up to the total consumption', () => {
    fc.assert(
      fc.property(fc.constantFrom(...versions), fc.integer({ min: 1, max: 5000 }), (v, k) => {
        expect(bill(v, k).lines.reduce((s, l) => s + l.kWh, 0)).toBe(k);
      }),
    );
  });
});

describe('cliffs', () => {
  it('finds the three cliffs at 100, 650 and 1000 kWh', () => {
    const c = cliffs(v2026_07);
    expect(c.map((x) => x.atKWh)).toEqual([100, 650, 1000]);
    // 100 kWh: 34 + 49 + 2 fee = 85 EGP; 101 kWh: 116.15 + 6 fee = 122.15 EGP.
    expect(c[0]).toEqual({ atKWh: 100, totalBefore: 8500, totalAfter: 12215, jump: 3715 });
    for (const x of c) expect(x.jump).toBeGreaterThan(0);
  });

  it('nextCliff returns the first cliff at or above the current kWh', () => {
    expect(nextCliff(v2026_07, 88)!.atKWh).toBe(100);
    expect(nextCliff(v2026_07, 100)!.atKWh).toBe(100);
    expect(nextCliff(v2026_07, 101)!.atKWh).toBe(650);
    expect(nextCliff(v2026_07, 1001)).toBeNull();
  });
});

describe('versionFor / versionById', () => {
  it('picks the latest version that started on or before the month', () => {
    expect(versionFor(bundledTariffs, '2024-08').id).toBe('2024-08');
    expect(versionFor(bundledTariffs, '2026-03').id).toBe('2024-08');
    expect(versionFor(bundledTariffs, '2026-06').id).toBe('2026-04');
    expect(versionFor(bundledTariffs, '2026-07').id).toBe('2026-07');
    expect(versionFor(bundledTariffs, '2030-01').id).toBe('2026-07');
  });

  it('rejects months before the first version or badly formatted', () => {
    expect(() => versionFor(bundledTariffs, '2024-07')).toThrow(/no tariff version/);
    expect(() => versionFor(bundledTariffs, '2026-13')).toThrow(RangeError);
    expect(() => versionById(bundledTariffs, 'nope')).toThrow(/unknown tariff version/);
  });
});
