// Everything the home screen shows, computed from stored data. Pure: no React Native imports.
import {
  bill,
  cliffs,
  nextCliff,
  versionFor,
  type Bill,
  type Cliff,
  type MeterType,
  type TariffFile,
} from 'eg-electricity-tariff';
import {
  cliffBudget,
  consumptionMonth,
  meterMonthStart,
  nextMeterMonthStart,
  projectBill,
  projectMonthKWh,
  rateModel,
  simulateRunOut,
  usageIntervals,
  type BillRange,
  type CliffBudget,
  type GraceRules,
  type PrepaidResult,
  type RateModel,
} from '@addady/energy-model';

import type { Home, ReadingRow } from '../db/schema';
import { billOptions, hasBands, pricedClass } from './place';
import { cumulativeReadings, interpolate } from './series';

const DAY_MS = 86_400_000;

export interface HomeStatus {
  monthStart: Date;
  monthEnd: Date;
  daysLeft: number;
  /** kWh used so far this (meter) month, or null without enough readings. */
  kWhSoFar: number | null;
  /** True when kWhSoFar relies on extrapolating before the first reading. */
  kWhSoFarEstimated: boolean;
  /** Bill at the current consumption (what the month costs if it ended now). */
  current: Bill | null;
  projection: BillRange | null;
  /** The next band boundary above this month's consumption. */
  cliff: Cliff | null;
  budget: CliffBudget | null;
  /** Prepaid only, when a balance is known. */
  runOut: PrepaidResult | null;
  latestBalance: number | null;
  model: RateModel;
  daysSinceLastReading: number | null;
  /** Tariff version used and its confidence (medium/low results show "تقديري"). */
  tariffId: string;
  tariffConfidence: Bill['confidence'];
}

export interface StatusInput {
  home: Home;
  readings: readonly ReadingRow[];
  tariffs: TariffFile;
  now: Date;
  grace: GraceRules;
  /** Monte Carlo runs (lower in tests / on slow phones). */
  runs?: number;
}

export function homeStatus({
  home,
  readings,
  tariffs,
  now,
  grace,
  runs = 400,
}: StatusInput): HomeStatus {
  const meterType: MeterType = home.meterType;
  const options = billOptions(home);
  const banded = hasBands(pricedClass(home));
  const monthStart = meterMonthStart(now, home.meterMonthStartDay);
  const monthEnd = nextMeterMonthStart(now, home.meterMonthStartDay);
  const daysLeft = (monthEnd.getTime() - now.getTime()) / DAY_MS;
  const version = versionFor(tariffs, consumptionMonth(monthStart));

  const series = cumulativeReadings(home, readings);
  const { intervals } = usageIntervals(series);
  const model = rateModel(intervals, now);

  const last = series[series.length - 1];
  const daysSinceLastReading = last ? (now.getTime() - last.at.getTime()) / DAY_MS : null;

  let kWhSoFar: number | null = null;
  let kWhSoFarEstimated = false;
  // Prepaid meters show "consumed this meter month" directly: when the latest such reading falls in
  // the current meter month it IS the month so far. (Differencing the stitched cumulative series
  // instead loses everything used before the first reading of the month.)
  const latestMonthCounter = [...readings]
    .filter((r) => r.monthKWh !== null)
    .sort((a, b) => b.at - a.at)[0];
  const counterThisMonth =
    meterType === 'prepaid' && latestMonthCounter && latestMonthCounter.at >= monthStart.getTime()
      ? latestMonthCounter
      : null;
  if (counterThisMonth) {
    const sinceRead = Math.max(0, (now.getTime() - counterThisMonth.at) / DAY_MS);
    kWhSoFar = counterThisMonth.monthKWh! + sinceRead * model.meanPerDay;
    kWhSoFarEstimated = false;
  } else if (last) {
    const atStart = interpolate(series, monthStart)!;
    // Usage since the last reading is estimated from the model.
    const sinceLast = Math.max(
      0,
      (now.getTime() - Math.max(last.at.getTime(), monthStart.getTime())) / DAY_MS,
    );
    kWhSoFar = Math.max(0, last.kWh - atStart.kWh) + sinceLast * model.meanPerDay;
    kWhSoFarEstimated = atStart.extrapolated || series.length < 2;
  }

  const current = kWhSoFar === null ? null : bill(version, Math.round(kWhSoFar), options);
  const projection =
    kWhSoFar === null
      ? null
      : projectBill(version, projectMonthKWh({ kWhSoFar, now, monthEnd, model, runs }), options);
  const cliff =
    kWhSoFar === null || !banded ? null : nextCliff(version, Math.floor(kWhSoFar), options);
  const budget =
    kWhSoFar === null || !banded ? null : cliffBudget(version, kWhSoFar, daysLeft, options);

  const withBalance = [...readings]
    .filter((r) => r.balancePiasters !== null)
    .sort((a, b) => b.at - a.at)[0];
  const latestBalance = withBalance?.balancePiasters ?? null;
  let runOut: PrepaidResult | null = null;
  if (meterType === 'prepaid' && withBalance && latestBalance !== null) {
    // Balance drains from the moment it was read; usage since then is part of the simulation.
    const readAt = new Date(withBalance.at);
    const monthKWhAtRead =
      withBalance.monthKWh ??
      Math.max(0, (kWhSoFar ?? 0) - model.meanPerDay * ((now.getTime() - withBalance.at) / DAY_MS));
    runOut = simulateRunOut({
      now: readAt,
      balance: latestBalance,
      kWhThisMeterMonth: monthKWhAtRead,
      meterMonthStartDay: home.meterMonthStartDay,
      tariffFor: (m) => versionFor(tariffs, m),
      customerClass: home.customerClass,
      model,
      grace,
      runs,
    });
  }

  return {
    monthStart,
    monthEnd,
    daysLeft,
    kWhSoFar,
    kWhSoFarEstimated,
    current,
    projection,
    cliff,
    budget,
    runOut,
    latestBalance,
    model,
    daysSinceLastReading,
    tariffId: version.id,
    tariffConfidence: current?.confidence ?? bill(version, 1, options).confidence,
  };
}

/** All cliffs of the place's tariff in force for the month (for the tier "staircase" bar). */
export function monthCliffs(
  tariffs: TariffFile,
  monthStart: Date,
  place: Pick<Home, 'customerClass' | 'meterType'>,
): Cliff[] {
  return cliffs(versionFor(tariffs, consumptionMonth(monthStart)), billOptions(place));
}
