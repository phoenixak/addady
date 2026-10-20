import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseTariffFile, TariffValidationError } from './validate';
import { tariffsData } from './tariffs.data';

const canonical = JSON.parse(
  readFileSync(new URL('../data/tariffs.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

/** A deep copy of the canonical file with one change applied. */
function mutate(change: (f: any) => void): unknown {
  const copy = structuredClone(canonical);
  change(copy);
  return copy;
}

function errorPath(json: unknown): string {
  try {
    parseTariffFile(json);
  } catch (e) {
    expect(e).toBeInstanceOf(TariffValidationError);
    return (e as TariffValidationError).path;
  }
  throw new Error('expected a validation error');
}

describe('generated data', () => {
  it('src/tariffs.data.ts matches data/tariffs.json (run scripts/gen-data.mjs)', () => {
    expect(tariffsData).toEqual(canonical);
  });
});

describe('parseTariffFile', () => {
  it('accepts the canonical file', () => {
    const f = parseTariffFile(canonical);
    expect(f.versions.map((v) => v.id)).toEqual(['2024-08', '2026-04', '2026-07']);
    expect(f.notes?.length).toBeGreaterThan(0);
  });

  it('accepts a file without notes', () => {
    expect(parseTariffFile(mutate((f) => delete f.notes)).notes).toBeUndefined();
  });

  const v0 = '$.versions[0]';
  const bands = `${v0}.residential.bands`;
  const cases: [string, (f: any) => void, string][] = [
    ['non-object root', () => undefined, '$'],
    ['schema version', (f) => (f.schemaVersion = 2), '$.schemaVersion'],
    ['currency', (f) => (f.currency = 'USD'), '$.currency'],
    ['updated', (f) => (f.updated = 1), '$.updated'],
    ['empty versions', (f) => (f.versions = []), '$.versions'],
    ['version not object', (f) => (f.versions[0] = 1), v0],
    ['empty id', (f) => (f.versions[0].id = ''), `${v0}.id`],
    ['bad validFrom', (f) => (f.versions[0].validFrom = '2026-13'), `${v0}.validFrom`],
    ['bad confidence', (f) => (f.versions[0].confidence = 'sure'), `${v0}.confidence`],
    ['residential missing', (f) => (f.versions[0].residential = null), `${v0}.residential`],
    ['bands not array', (f) => (f.versions[0].residential.bands = {}), bands],
    ['empty bands', (f) => (f.versions[0].residential.bands = []), bands],
    ['band not object', (f) => (f.versions[0].residential.bands[0] = 3), `${bands}[0]`],
    ['band mode', (f) => (f.versions[0].residential.bands[0].mode = 'tiered'), `${bands}[0].mode`],
    [
      'tiers not array',
      (f) => (f.versions[0].residential.bands[0].tiers = null),
      `${bands}[0].tiers`,
    ],
    [
      'tier not object',
      (f) => (f.versions[0].residential.bands[0].tiers[0] = 'x'),
      `${bands}[0].tiers[0]`,
    ],
    [
      'tier number',
      (f) => (f.versions[0].residential.bands[0].tiers[0].tier = 0),
      `${bands}[0].tiers[0].tier`,
    ],
    [
      'negative rate',
      (f) => (f.versions[0].residential.bands[0].tiers[0].rate = -1),
      `${bands}[0].tiers[0].rate`,
    ],
    [
      'rate decimals',
      (f) => (f.versions[0].residential.bands[0].tiers[0].rate = 68.123),
      `${bands}[0].tiers[0].rate`,
    ],
    [
      'tier upTo zero',
      (f) => (f.versions[0].residential.bands[0].tiers[0].upTo = 0),
      `${bands}[0].tiers[0].upTo`,
    ],
    [
      'tiers not increasing',
      (f) => (f.versions[0].residential.bands[0].tiers[1].upTo = 50),
      `${bands}[0].tiers[1].upTo`,
    ],
    [
      'open tier not last',
      (f) => (f.versions[0].residential.bands[0].tiers[0].upTo = null),
      `${bands}[0].tiers[0].upTo`,
    ],
    [
      'last tier != band',
      (f) => (f.versions[0].residential.bands[0].tiers[1].upTo = 99),
      `${bands}[0].tiers`,
    ],
    [
      'flat band tier',
      (f) => (f.versions[0].residential.bands[2].tier = 'six'),
      `${bands}[2].tier`,
    ],
    [
      'bands not open-ended',
      (f) => (f.versions[0].residential.bands[3].upTo = 5000),
      `${bands}[3].upTo`,
    ],
    [
      'fees not array',
      (f) => (f.versions[0].residential.serviceFees = 1),
      `${v0}.residential.serviceFees`,
    ],
    [
      'fee not object',
      (f) => (f.versions[0].residential.serviceFees[0] = 1),
      `${v0}.residential.serviceFees[0]`,
    ],
    [
      'fee fractional',
      (f) => (f.versions[0].residential.serviceFees[0].fee = 1.5),
      `${v0}.residential.serviceFees[0].fee`,
    ],
    [
      'zero-read fee',
      (f) => (f.versions[0].residential.zeroReadFee = -9),
      `${v0}.residential.zeroReadFee`,
    ],
    ['coded not object', (f) => (f.versions[1].coded = 274), '$.versions[1].coded'],
    [
      'coded confidence',
      (f) => (f.versions[1].coded.confidence = 'x'),
      '$.versions[1].coded.confidence',
    ],
    ['coded rate', (f) => (f.versions[1].coded.rate = 'x'), '$.versions[1].coded.rate'],
    ['http source', (f) => (f.versions[0].sources = ['http://example.com']), `${v0}.sources`],
    ['sources missing', (f) => delete f.versions[0].sources, `${v0}.sources`],
    [
      'versions out of order',
      (f) => (f.versions[1].validFrom = '2024-01'),
      '$.versions[1].validFrom',
    ],
    ['duplicate ids', (f) => (f.versions[2].id = '2024-08'), '$.versions'],
  ];

  for (const [name, change, path] of cases) {
    it(`rejects ${name} at ${path}`, () => {
      const json = name === 'non-object root' ? null : mutate(change);
      expect(errorPath(json)).toBe(path);
    });
  }
});
