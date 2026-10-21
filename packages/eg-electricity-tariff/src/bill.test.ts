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

  it('refuses a class the version does not publish', () => {
    const classes = { ...v2024_08.classes };
    delete classes.coded;
    const version: TariffVersion = { ...v2024_08, classes };
    expect(() => bill(version, 10, { meterType: 'coded' })).toThrow(/has no coded prices/);
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
      classes: {
        residential: {
          ...v2026_07.classes.residential!,
          bands: [{ upTo: null, mode: 'flat', tier: 1, rate: 87.36 }],
        },
      },
    };
    expect(bill(version, 1).energy).toBe(87); // 87.36
    expect(bill(version, 2).energy).toBe(175); // 174.72
    expect(bill(version, 25).energy).toBe(2184); // 2184.00
  });

  it('stops a progressive band at an unbounded last tier', () => {
    const version: TariffVersion = {
      ...v2026_07,
      classes: {
        residential: {
          ...v2026_07.classes.residential!,
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

describe('bill: other customer classes', () => {
  const v2026_04 = versionById(bundledTariffs, '2026-04');

  it('prices commercial bands from zero with the 3 pt/kWh stamp', () => {
    // EgyptERA April 2026: 0-100 flat 162; fee 5 EGP; stamp 3 pt/kWh.
    expect(bill(v2026_04, 100, { customerClass: 'commercial' })).toMatchObject({
      customerClass: 'commercial',
      bandIndex: 0,
      energy: 16200,
      serviceFee: 500,
      stamps: 300,
      total: 17000,
    });
    // 101-250: all kWh flat at 216.
    expect(bill(v2026_04, 101, { customerClass: 'commercial' }).energy).toBe(101 * 216);
    // 251-1000: 0-600 at 264, then 601-1000 at 274.
    const b = bill(v2026_04, 700, { customerClass: 'commercial' });
    expect(b.lines.map((l) => [l.tier, l.kWh, l.rate])).toEqual([
      [3, 600, 264],
      [4, 100, 274],
    ]);
    expect(b.total).toBe(600 * 264 + 100 * 274 + 2500 + 2100);
    // > 1000: all kWh flat at 279, fee 40 EGP.
    expect(bill(v2026_04, 1001, { customerClass: 'commercial' }).total).toBe(
      1001 * 279 + 4000 + 3003,
    );
  });

  it('charges the commercial zero-read fee', () => {
    expect(bill(v2026_04, 0, { customerClass: 'commercial' }).total).toBe(900);
  });

  it('prices voltage classes flat with the industrial stamp of 0.6 pt per 10 kWh', () => {
    const b = bill(v2026_04, 10000, { customerClass: 'mediumVoltage' });
    expect(b.lines).toEqual([
      { tier: 0, fromKWh: 1, toKWh: 10000, kWh: 10000, rate: 255, amount: 2550000 },
    ]);
    expect(b).toMatchObject({ serviceFee: 3500, stamps: 600, total: 2554100 });
    // Rounds the stamp half up once: 0.06 pt x 25 kWh = 1.5 -> 2.
    expect(bill(v2026_04, 25, { customerClass: 'lowVoltage' }).stamps).toBe(2);
    expect(bill(v2026_04, 0, { customerClass: 'extraHighVoltage' }).total).toBe(3500);
    expect(cliffs(v2026_04, { customerClass: 'highVoltage' })).toEqual([]);
  });

  it('uses the lower of the version and class confidence', () => {
    expect(bill(v2026_04, 10, { customerClass: 'irrigationLowVoltage' }).confidence).toBe('medium');
    expect(bill(v2026_07, 10, { customerClass: 'commercial' }).confidence).toBe('medium');
  });

  it('a coded meter type always uses the coded class', () => {
    const b = bill(v2026_04, 10, { customerClass: 'commercial', meterType: 'coded' });
    expect(b.customerClass).toBe('coded');
    expect(bill(v2026_04, 10, { customerClass: 'coded' }).meterType).toBe('coded');
  });

  it('every class of every version is monotonic from 1 kWh', () => {
    for (const v of versions) {
      for (const customerClass of Object.keys(v.classes) as (keyof typeof v.classes)[]) {
        fc.assert(
          fc.property(
            kWh.filter((k) => k >= 1),
            (k) => bill(v, k + 1, { customerClass }).total >= bill(v, k, { customerClass }).total,
          ),
          { numRuns: 50 },
        );
      }
    }
  });
});

describe('cliffs', () => {
  it('finds the commercial cliffs at 100, 250 and 1000 kWh', () => {
    const v = versionById(bundledTariffs, '2026-04');
    expect(cliffs(v, { customerClass: 'commercial' }).map((c) => c.atKWh)).toEqual([
      100, 250, 1000,
    ]);
  });

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
