// Seeded randomness so every simulation is reproducible (same inputs + seed = same answer).

export type Random = () => number;

/** mulberry32: a small, fast 32-bit PRNG. Returns floats in [0, 1). */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal sample (Box-Muller). */
export function normal(random: Random): number {
  const u = 1 - random(); // (0, 1]
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Linear-interpolated quantile of an already sorted array (q in [0, 1]). */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new RangeError('quantile of an empty sample');
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const frac = pos - lo;
  const a = sorted[lo]!;
  if (frac === 0) return a;
  const b = sorted[lo + 1]!;
  // Avoid Infinity - Infinity / Infinity * 0 when samples include +Infinity ("never").
  return Number.isFinite(b) ? a + (b - a) * frac : b;
}

export interface Range {
  p10: number;
  p50: number;
  p90: number;
}

export function range(samples: readonly number[]): Range {
  const sorted = [...samples].sort((a, b) => a - b);
  return { p10: quantile(sorted, 0.1), p50: quantile(sorted, 0.5), p90: quantile(sorted, 0.9) };
}
