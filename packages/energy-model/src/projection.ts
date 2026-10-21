// Month-end projection: how many kWh, which bill, and how much daily headroom before the next cliff.
import {
  bill,
  nextCliff,
  type BillOptions,
  type Piasters,
  type TariffVersion,
} from 'eg-electricity-tariff';

import { range, seededRandom, type Range } from './random';
import { sampleDay, type RateModel } from './usage';

const DAY_MS = 86_400_000;

export interface MonthProjectionInput {
  /** kWh already consumed this (meter or billing) month. */
  kWhSoFar: number;
  now: Date;
  /** When the month ends (exclusive). */
  monthEnd: Date;
  model: RateModel;
  runs?: number;
  seed?: number;
}

/** P10/P50/P90 of the month's total kWh. */
export function projectMonthKWh(input: MonthProjectionInput): Range {
  const { kWhSoFar, now, monthEnd, model, runs = 1000, seed = 1 } = input;
  const daysLeft = Math.max(0, (monthEnd.getTime() - now.getTime()) / DAY_MS);
  const whole = Math.floor(daysLeft);
  const fraction = daysLeft - whole;
  const random = seededRandom(seed);
  const totals: number[] = [];
  for (let r = 0; r < runs; r++) {
    let total = kWhSoFar;
    for (let d = 0; d < whole; d++) total += sampleDay(model, random);
    if (fraction > 0) total += fraction * sampleDay(model, random);
    totals.push(total);
  }
  return range(totals);
}

export interface BillRange {
  kWh: Range;
  /** Bill totals in piasters at the P10/P50/P90 kWh. Bills are monotone in kWh, so order is kept. */
  total: { p10: Piasters; p50: Piasters; p90: Piasters };
}

export function projectBill(
  version: TariffVersion,
  kWh: Range,
  options: BillOptions = {},
): BillRange {
  const at = (k: number) => bill(version, Math.round(k), options).total;
  return { kWh, total: { p10: at(kWh.p10), p50: at(kWh.p50), p90: at(kWh.p90) } };
}

export interface CliffBudget {
  /** The cliff: last kWh of the cheaper band. */
  atKWh: number;
  /** How much the bill jumps if the month goes one kWh past it. */
  jump: Piasters;
  /** Average kWh per remaining day that keeps the month at or below the cliff. */
  kWhPerDay: number;
}

/**
 * Daily budget to stay below the next cliff, or null when there's no cliff ahead or it's already
 * unavoidable (consumption already above it).
 */
export function cliffBudget(
  version: TariffVersion,
  kWhSoFar: number,
  daysLeft: number,
  options: BillOptions = {},
): CliffBudget | null {
  const used = Math.floor(kWhSoFar);
  const cliff = nextCliff(version, used, options);
  if (!cliff || daysLeft <= 0) return null;
  return { atKWh: cliff.atKWh, jump: cliff.jump, kWhPerDay: (cliff.atKWh - kWhSoFar) / daysLeft };
}
