// "Where your kWh go": scales each uncertain appliance estimate so that, together with a constant
// baseline, they explain the metered monthly totals. Ridge-regularised non-negative least squares:
//
//   minimise  sum_m (M_m - u*days_m - sum_i s_i*E_im)^2  +  sum_i lambda_i * (s_i - 1)^2
//   subject to s_i >= 0, u >= 0
//
// lambda_i grows with how much we trust appliance i's label, so label-exact appliances barely move.
// Seasonal variation (AC in summer, heater in winter) is what makes the scales identifiable.
// The problem is convex; cyclic coordinate descent with clamping converges to its minimum.
import type { EstimateConfidence } from './appliances';

export interface MonthTotal {
  /** Metered kWh for the month. */
  kWh: number;
  days: number;
}

export interface ApplianceSeries {
  id: string;
  /** Model estimate (kWh) for each month, aligned with the months array. */
  estimates: number[];
  confidence: EstimateConfidence;
}

export interface CalibrationOptions {
  /** Overall regularisation strength (relative to each appliance's own scale). */
  lambda?: number;
  maxIterations?: number;
  tolerance?: number;
}

export interface ApplianceScale {
  id: string;
  scale: number;
  /** Approximate 80% interval for the scale (scale +- 1.28 standard errors), floored at 0. */
  low: number;
  high: number;
  /** Calibrated kWh per month, aligned with the months array. */
  kWh: number[];
}

export interface Calibration {
  appliances: ApplianceScale[];
  /** Unexplained constant load ("غير معروف", unknown), kWh per day. */
  baselinePerDay: number;
  /** Root-mean-square monthly residual, kWh. */
  rmse: number;
  iterations: number;
}

const TRUST: Record<EstimateConfidence, number> = {
  'label-exact': 10,
  'label-derived': 3,
  default: 1,
};

/**
 * Diagonal of the inverse of a symmetric positive-definite matrix (Gauss-Jordan with partial
 * pivoting). Returns Infinity for a direction the data cannot identify at all.
 */
function inverseDiagonal(matrix: number[][]): number[] {
  const n = matrix.length;
  const a = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    if (Math.abs(a[pivot]![col]!) < 1e-12)
      return Array.from({ length: n }, () => Number.POSITIVE_INFINITY);
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    const p = a[col]![col]!;
    for (let c = 0; c < 2 * n; c++) a[col]![c]! /= p;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r]![col]!;
      for (let c = 0; c < 2 * n; c++) a[r]![c]! -= f * a[col]![c]!;
    }
  }
  return a.map((row, i) => row[n + i]!);
}

export function calibrate(
  months: readonly MonthTotal[],
  appliances: readonly ApplianceSeries[],
  options: CalibrationOptions = {},
): Calibration {
  const { lambda = 0.5, maxIterations = 2000, tolerance = 1e-10 } = options;
  const m = months.length;
  if (m < 3) throw new RangeError('calibration needs at least 3 months of metered totals');
  for (const a of appliances) {
    if (a.estimates.length !== m)
      throw new RangeError(`appliance ${a.id}: expected ${m} monthly estimates`);
  }
  const E = appliances.map((a) => a.estimates);
  const M = months.map((x) => x.kWh);
  const D = months.map((x) => x.days);
  const sumSq = (xs: number[]) => xs.reduce((s, x) => s + x * x, 0);
  // Penalty scaled to each appliance's own magnitude so lambda is unit-free.
  const lam = appliances.map((a, i) => (lambda * TRUST[a.confidence] * sumSq(E[i]!)) / m);
  const s = appliances.map(() => 1);
  let u = 0;

  const predicted = (k: number) => u * D[k]! + s.reduce((acc, si, i) => acc + si * E[i]![k]!, 0);

  let iterations = 0;
  for (; iterations < maxIterations; iterations++) {
    let change = 0;
    for (let j = 0; j < s.length; j++) {
      let num = lam[j]!;
      let den = lam[j]!;
      for (let k = 0; k < m; k++) {
        const e = E[j]![k]!;
        const r = M[k]! - predicted(k) + s[j]! * e; // residual without appliance j
        num += e * r;
        den += e * e;
      }
      const next = den > 0 ? Math.max(0, num / den) : 1;
      change = Math.max(change, Math.abs(next - s[j]!));
      s[j] = next;
    }
    let num = 0;
    let den = 0;
    for (let k = 0; k < m; k++) {
      num += D[k]! * (M[k]! - predicted(k) + u * D[k]!);
      den += D[k]! * D[k]!;
    }
    const nextU = Math.max(0, num / den);
    change = Math.max(change, Math.abs(nextU - u));
    u = nextU;
    if (change < tolerance) break;
  }

  const residuals = M.map((x, k) => x - predicted(k));
  const sse = sumSq(residuals);
  const dof = Math.max(1, m - appliances.length - 1);
  const sigma2 = sse / dof;
  // Joint covariance sigma^2 (X'X + Lambda)^-1 over [appliances..., baseline]. Using only each
  // appliance's own column would ignore collinearity (e.g. a heater that looks like a constant
  // load) and report ranges far narrower than the data supports.
  const cols = [...E, D];
  const p = cols.length;
  const hessian = Array.from({ length: p }, (_, i) =>
    Array.from(
      { length: p },
      (_, j) =>
        cols[i]!.reduce((acc, x, k) => acc + x * cols[j]![k]!, 0) +
        (i === j && i < lam.length ? lam[i]! : 0),
    ),
  );
  const variances = inverseDiagonal(hessian);
  return {
    appliances: appliances.map((a, j) => {
      const se = Math.sqrt(sigma2 * variances[j]!);
      return {
        id: a.id,
        scale: s[j]!,
        low: Math.max(0, s[j]! - 1.28 * se),
        high: s[j]! + 1.28 * se,
        kWh: E[j]!.map((e) => e * s[j]!),
      };
    }),
    baselinePerDay: u,
    rmse: Math.sqrt(sse / m),
    iterations,
  };
}
