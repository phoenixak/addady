// Monthly kWh from irregular readings: each meter month's usage is the cumulative series at the
// month's end minus at its start (linear interpolation between readings).
import { meterMonthStart, nextMeterMonthStart, type Reading } from '@addady/energy-model';

import { interpolate } from './series';

export interface MonthUsage {
  start: Date;
  kWh: number;
  /** True when the month isn't fully covered by readings on both sides. */
  partial: boolean;
}

export function monthlyUsage(
  series: readonly Reading[],
  startDay: number,
  now: Date,
  maxMonths = 12,
): MonthUsage[] {
  if (series.length < 2) return [];
  const first = series[0]!.at;
  const months: MonthUsage[] = [];
  let start = meterMonthStart(now, startDay);
  for (let i = 0; i < maxMonths; i++) {
    const end = i === 0 ? now : nextMeterMonthStart(start, startDay);
    if (end.getTime() <= first.getTime()) break;
    const a = interpolate(series, start)!;
    const b = interpolate(series, end)!;
    months.unshift({
      start,
      kWh: Math.max(0, b.kWh - a.kWh),
      partial: i === 0 || a.extrapolated || b.extrapolated,
    });
    // Step back one meter month: the start of the month containing the instant just before `start`.
    start = meterMonthStart(new Date(start.getTime() - 1), startDay);
  }
  return months;
}
