// Daily usage from irregular meter readings.
import { normal, type Random } from './random';

const DAY_MS = 86_400_000;

/** A meter register reading: cumulative kWh at an instant. */
export interface Reading {
  at: Date;
  kWh: number;
}

/** Average consumption between two consecutive readings. */
export interface UsageInterval {
  from: Date;
  to: Date;
  days: number;
  kWh: number;
  perDay: number;
}

export interface IntervalResult {
  intervals: UsageInterval[];
  /** Pairs skipped because the register went down (typo or meter replacement). */
  skippedDecreases: number;
}

/** Splits sorted readings into usage intervals. Readings at the same instant are merged. */
export function usageIntervals(readings: readonly Reading[]): IntervalResult {
  const sorted = [...readings].sort((a, b) => a.at.getTime() - b.at.getTime());
  const intervals: UsageInterval[] = [];
  let skippedDecreases = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    const days = (b.at.getTime() - a.at.getTime()) / DAY_MS;
    if (days <= 0) continue;
    const kWh = b.kWh - a.kWh;
    if (kWh < 0) {
      skippedDecreases += 1;
      continue;
    }
    intervals.push({ from: a.at, to: b.at, days, kWh, perDay: kWh / days });
  }
  return { intervals, skippedDecreases };
}

export interface RateModelOptions {
  /** Recent intervals count more: weight halves every `halfLifeDays` of age. */
  halfLifeDays?: number;
  /** Minimum relative spread of daily usage, so a short history doesn't look certain. */
  minRelativeSpread?: number;
  /** Fallback daily kWh when there's no usable history yet. */
  fallbackPerDay?: number;
}

export interface RateModel {
  /** Recency-weighted mean daily kWh. */
  meanPerDay: number;
  /** Relative standard deviation used for sampling (>= minRelativeSpread). */
  relativeSpread: number;
  /** Interval rates and their sampling weights (normalised). */
  rates: number[];
  weights: number[];
  /** True when there was no history and the fallback was used. */
  fallback: boolean;
}

/** Recency-weighted model of daily consumption, evaluated at `now`. */
export function rateModel(
  intervals: readonly UsageInterval[],
  now: Date,
  options: RateModelOptions = {},
): RateModel {
  const { halfLifeDays = 14, minRelativeSpread = 0.15, fallbackPerDay = 10 } = options;
  if (intervals.length === 0) {
    // A deliberately wide spread: with no readings, any estimate is a guess.
    return {
      meanPerDay: fallbackPerDay,
      relativeSpread: 0.5,
      rates: [fallbackPerDay],
      weights: [1],
      fallback: true,
    };
  }
  const raw = intervals.map((iv) => {
    const ageDays = Math.max(0, (now.getTime() - iv.to.getTime()) / DAY_MS);
    return iv.days * 0.5 ** (ageDays / halfLifeDays);
  });
  const total = raw.reduce((s, w) => s + w, 0);
  const weights = raw.map((w) => w / total);
  const rates = intervals.map((iv) => iv.perDay);
  const meanPerDay = rates.reduce((s, r, i) => s + r * weights[i]!, 0);
  const variance = rates.reduce((s, r, i) => s + weights[i]! * (r - meanPerDay) ** 2, 0);
  const observed = meanPerDay > 0 ? Math.sqrt(variance) / meanPerDay : 0;
  return {
    meanPerDay,
    relativeSpread: Math.max(observed, minRelativeSpread),
    rates,
    weights,
    fallback: false,
  };
}

/** One simulated day's kWh: a weighted bootstrap of interval rates with multiplicative noise. */
export function sampleDay(model: RateModel, random: Random): number {
  let pick = random();
  let rate = model.rates[model.rates.length - 1]!;
  for (let i = 0; i < model.rates.length; i++) {
    pick -= model.weights[i]!;
    if (pick < 0) {
      rate = model.rates[i]!;
      break;
    }
  }
  return Math.max(0, rate * (1 + model.relativeSpread * normal(random)));
}
