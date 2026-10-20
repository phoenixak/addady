import type { Band, FeeStep, TariffFile, TariffVersion, Tier } from './types';

export class TariffValidationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = 'TariffValidationError';
  }
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const CONFIDENCE = new Set(['high', 'medium', 'low']);

function fail(path: string, message: string): never {
  throw new TariffValidationError(path, message);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function rate(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) fail(path, 'must be a rate >= 0');
  if (Math.round(v * 100) / 100 !== v) fail(path, 'must have at most 2 decimals');
  return v;
}

function piasters(v: unknown, path: string): number {
  if (!Number.isSafeInteger(v) || (v as number) < 0) fail(path, 'must be integer piasters >= 0');
  return v as number;
}

function upTo(v: unknown, path: string): number | null {
  if (v === null) return null;
  if (!Number.isSafeInteger(v) || (v as number) <= 0)
    fail(path, 'must be a positive integer or null');
  return v as number;
}

/** Checks bounds are strictly increasing and only the last one is null (unbounded). */
function checkSteps(steps: { upTo: number | null }[], path: string, mustEndOpen: boolean) {
  if (steps.length === 0) fail(path, 'must not be empty');
  steps.forEach((s, i) => {
    const last = i === steps.length - 1;
    if (s.upTo === null && !last) fail(`${path}[${i}].upTo`, 'only the last step may be null');
    const prev = i > 0 ? steps[i - 1]!.upTo : 0;
    if (s.upTo !== null && prev !== null && s.upTo <= prev) {
      fail(`${path}[${i}].upTo`, 'must be strictly increasing');
    }
  });
  if (mustEndOpen && steps[steps.length - 1]!.upTo !== null) {
    fail(`${path}[${steps.length - 1}].upTo`, 'the last step must be null (unbounded)');
  }
}

function tierNumber(v: unknown, path: string): number {
  if (!Number.isSafeInteger(v) || (v as number) < 1) fail(path, 'must be a tier number >= 1');
  return v as number;
}

function parseBand(v: unknown, path: string): Band {
  if (!isObject(v)) fail(path, 'must be an object');
  const bandUpTo = upTo(v.upTo, `${path}.upTo`);
  if (v.mode === 'flat') {
    return {
      upTo: bandUpTo,
      mode: 'flat',
      tier: tierNumber(v.tier, `${path}.tier`),
      rate: rate(v.rate, `${path}.rate`),
    };
  }
  if (v.mode !== 'progressive') fail(`${path}.mode`, "must be 'progressive' or 'flat'");
  if (!Array.isArray(v.tiers)) fail(`${path}.tiers`, 'must be an array');
  const tiers: Tier[] = v.tiers.map((t, i) => {
    const p = `${path}.tiers[${i}]`;
    if (!isObject(t)) fail(p, 'must be an object');
    return {
      tier: tierNumber(t.tier, `${p}.tier`),
      upTo: upTo(t.upTo, `${p}.upTo`),
      rate: rate(t.rate, `${p}.rate`),
    };
  });
  checkSteps(tiers, `${path}.tiers`, false);
  const lastTierUpTo = tiers[tiers.length - 1]!.upTo;
  if (lastTierUpTo !== bandUpTo)
    fail(`${path}.tiers`, "the last tier's upTo must equal the band's upTo");
  return { upTo: bandUpTo, mode: 'progressive', tiers };
}

function parseVersion(v: unknown, path: string): TariffVersion {
  if (!isObject(v)) fail(path, 'must be an object');
  if (typeof v.id !== 'string' || v.id === '') fail(`${path}.id`, 'must be a non-empty string');
  if (typeof v.validFrom !== 'string' || !MONTH.test(v.validFrom)) {
    fail(`${path}.validFrom`, "must be 'YYYY-MM'");
  }
  if (!CONFIDENCE.has(v.confidence as string))
    fail(`${path}.confidence`, 'must be high|medium|low');
  const r = v.residential;
  if (!isObject(r)) fail(`${path}.residential`, 'must be an object');
  if (!Array.isArray(r.bands)) fail(`${path}.residential.bands`, 'must be an array');
  const bands = r.bands.map((b, i) => parseBand(b, `${path}.residential.bands[${i}]`));
  checkSteps(bands, `${path}.residential.bands`, true);
  if (!Array.isArray(r.serviceFees)) fail(`${path}.residential.serviceFees`, 'must be an array');
  const serviceFees: FeeStep[] = r.serviceFees.map((f, i) => {
    const p = `${path}.residential.serviceFees[${i}]`;
    if (!isObject(f)) fail(p, 'must be an object');
    return { upTo: upTo(f.upTo, `${p}.upTo`), fee: piasters(f.fee, `${p}.fee`) };
  });
  checkSteps(serviceFees, `${path}.residential.serviceFees`, true);
  let coded: TariffVersion['coded'] = null;
  if (v.coded !== null) {
    if (!isObject(v.coded)) fail(`${path}.coded`, 'must be an object or null');
    if (!CONFIDENCE.has(v.coded.confidence as string)) {
      fail(`${path}.coded.confidence`, 'must be high|medium|low');
    }
    coded = {
      rate: rate(v.coded.rate, `${path}.coded.rate`),
      confidence: v.coded.confidence as TariffVersion['confidence'],
    };
  }
  if (
    !Array.isArray(v.sources) ||
    v.sources.some((s) => typeof s !== 'string' || !s.startsWith('https://'))
  ) {
    fail(`${path}.sources`, 'must be a list of https URLs');
  }
  return {
    id: v.id,
    validFrom: v.validFrom,
    confidence: v.confidence as TariffVersion['confidence'],
    residential: {
      bands,
      serviceFees,
      zeroReadFee: piasters(r.zeroReadFee, `${path}.residential.zeroReadFee`),
    },
    coded,
    sources: v.sources as string[],
  };
}

/** Validates untrusted JSON (e.g. a downloaded tariffs.json) and returns a typed copy. */
export function parseTariffFile(json: unknown): TariffFile {
  if (!isObject(json)) fail('$', 'must be an object');
  if (json.schemaVersion !== 1) fail('$.schemaVersion', 'unsupported schema version');
  if (json.currency !== 'EGP') fail('$.currency', "must be 'EGP'");
  if (typeof json.updated !== 'string') fail('$.updated', 'must be a date string');
  if (!Array.isArray(json.versions) || json.versions.length === 0) {
    fail('$.versions', 'must be a non-empty array');
  }
  const versions = json.versions.map((v, i) => parseVersion(v, `$.versions[${i}]`));
  versions.forEach((v, i) => {
    if (i > 0 && v.validFrom <= versions[i - 1]!.validFrom) {
      fail(`$.versions[${i}].validFrom`, 'versions must be in strictly increasing validFrom order');
    }
  });
  if (new Set(versions.map((v) => v.id)).size !== versions.length)
    fail('$.versions', 'ids must be unique');
  return {
    schemaVersion: 1,
    updated: json.updated,
    currency: 'EGP',
    ...(Array.isArray(json.notes) ? { notes: json.notes.map(String) } : {}),
    versions,
  };
}
