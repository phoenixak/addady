import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { bill, bundledTariffs, versionById, type MeterType } from './index';

interface GoldenCase {
  id: string;
  version: string;
  kWh: number;
  meterType: MeterType;
  compare: 'total' | 'energy';
  expectedEGP: number;
  tolerance: number;
  status: 'verified' | 'disputed';
  source: string;
}

const golden: { cases: GoldenCase[] } = JSON.parse(
  readFileSync(new URL('../test/golden.json', import.meta.url), 'utf8'),
);

const actualEGP = (c: GoldenCase) => {
  const b = bill(versionById(bundledTariffs, c.version), c.kWh, { meterType: c.meterType });
  return (c.compare === 'total' ? b.total : b.energy) / 100;
};

describe('golden cases from public sources', () => {
  it('every case cites an https source', () => {
    for (const c of golden.cases) expect(c.source, c.id).toMatch(/^https:\/\//);
  });

  it('covers every tier in at least one verified case', () => {
    const tiers = new Set<number>();
    for (const c of golden.cases.filter((g) => g.status === 'verified')) {
      const b = bill(versionById(bundledTariffs, c.version), c.kWh, { meterType: c.meterType });
      b.lines.forEach((l) => tiers.add(l.tier));
    }
    expect([...tiers].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  for (const c of golden.cases.filter((g) => g.status === 'verified')) {
    it(`${c.id}: ${c.kWh} kWh -> ${c.expectedEGP} EGP (${c.compare})`, () => {
      expect(Math.abs(actualEGP(c) - c.expectedEGP)).toBeLessThanOrEqual(c.tolerance);
    });
  }

  for (const c of golden.cases.filter((g) => g.status === 'disputed')) {
    it(`${c.id} stays disputed: the regulator's rule gives a different total`, () => {
      // If this ever starts matching, the dispute is resolved: move the case to 'verified'.
      expect(Math.abs(actualEGP(c) - c.expectedEGP)).toBeGreaterThan(c.tolerance);
    });
  }
});
