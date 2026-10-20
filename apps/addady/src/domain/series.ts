// Turns stored readings into the cumulative series energy-model expects.
import { meterMonthStart, type Reading } from '@addady/energy-model';

import type { Home, ReadingRow } from '../db/schema';

/**
 * Cumulative kWh readings for a home, oldest first.
 * - postpaid / coded: the meter register is already cumulative.
 * - prepaid: the meter shows "consumed this meter month", which resets on the meter's start day,
 *   so each earlier month's last value is added as an offset.
 */
export function cumulativeReadings(
  home: Pick<Home, 'meterType' | 'meterMonthStartDay'>,
  rows: readonly ReadingRow[],
): Reading[] {
  const sorted = [...rows].sort((a, b) => a.at - b.at);
  if (home.meterType !== 'prepaid') {
    return sorted
      .filter((r) => r.registerKWh !== null)
      .map((r) => ({ at: new Date(r.at), kWh: r.registerKWh! }));
  }
  const out: Reading[] = [];
  let offset = 0;
  let month = -1;
  let lastInMonth = 0;
  for (const r of sorted) {
    if (r.monthKWh === null) continue;
    const start = meterMonthStart(new Date(r.at), home.meterMonthStartDay).getTime();
    if (start !== month) {
      if (month !== -1) offset += lastInMonth;
      month = start;
      lastInMonth = 0;
    }
    lastInMonth = Math.max(lastInMonth, r.monthKWh);
    out.push({ at: new Date(r.at), kWh: offset + r.monthKWh });
  }
  return out;
}

/** Linear interpolation of a cumulative series at `at` (clamped to the first/last reading). */
export function interpolate(
  series: readonly Reading[],
  at: Date,
): { kWh: number; extrapolated: boolean } | null {
  if (series.length === 0) return null;
  const t = at.getTime();
  const first = series[0]!;
  const last = series[series.length - 1]!;
  if (t <= first.at.getTime()) return { kWh: first.kWh, extrapolated: t < first.at.getTime() };
  if (t >= last.at.getTime()) return { kWh: last.kWh, extrapolated: t > last.at.getTime() };
  for (let i = 1; i < series.length; i++) {
    const b = series[i]!;
    if (t <= b.at.getTime()) {
      const a = series[i - 1]!;
      const f = (t - a.at.getTime()) / (b.at.getTime() - a.at.getTime());
      return { kWh: a.kWh + f * (b.kWh - a.kWh), extrapolated: false };
    }
  }
  /* istanbul ignore next -- unreachable: t is between first and last */
  return { kWh: last.kWh, extrapolated: true };
}
