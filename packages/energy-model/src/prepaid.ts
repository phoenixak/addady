// Prepaid run-out simulator: when will the balance reach zero, and when will the meter actually cut?
//
// Model (docs/research/tariff.md §1, §6):
// - Each kWh costs energy(n + 1) - energy(n) under the meter month's band rules, so crossing a
//   cliff (100 -> 101, 650 -> 651, 1000 -> 1001) charges the whole repricing at once.
// - Tiers reset on the meter's own month-start day; the balance does not.
// - At zero balance the meter keeps supplying during grace (Fridays, confirmed holidays,
//   17:00-10:00 Cairo time) and cuts at the next non-grace instant.
// Notifications must use the EARLIEST plausible time (P10), never the median.
import { bill, type CustomerClass, type Piasters, type TariffVersion } from 'eg-electricity-tariff';

import { range, seededRandom, type Range } from './random';
import {
  cairo,
  consumptionMonth,
  DEFAULT_GRACE,
  meterMonthStart,
  nextCutAllowed,
  type GraceRules,
} from './time';
import { sampleDay, type RateModel } from './usage';

const HOUR_MS = 3_600_000;

/** Share of a day's kWh used in each Cairo hour (0-23). Must sum to 1. */
export type HourlyProfile = readonly number[];

/** Evenly spread usage. Real homes peak in the evening; the app can supply a learned profile. */
export const FLAT_PROFILE: HourlyProfile = Array.from({ length: 24 }, () => 1 / 24);

export interface PrepaidInput {
  now: Date;
  /** Remaining balance in piasters. */
  balance: Piasters;
  /** kWh already consumed in the current meter month (the meter's own counter). */
  kWhThisMeterMonth: number;
  /** Day of month (1-28) when the meter resets its tiers. */
  meterMonthStartDay: number;
  /** Tariff version for a consumption month 'YYYY-MM' (handles changes across months). */
  tariffFor: (month: string) => TariffVersion;
  /** Default 'residential' (shops and offices have prepaid meters too). */
  customerClass?: CustomerClass;
  model: RateModel;
  grace?: GraceRules;
  profile?: HourlyProfile;
  runs?: number;
  seed?: number;
  /** Stop simulating after this many days. */
  horizonDays?: number;
}

export interface PrepaidResult {
  /**
   * When the balance reaches zero (P10 = earliest plausible). Null if most runs never reach zero
   * within the horizon; p90 is null when more than 10% of runs outlast the horizon.
   */
  zeroAt: DateRange | null;
  /** When the meter is expected to disconnect (zeroAt moved past grace windows). */
  cutAt: DateRange | null;
  /** Share of runs that still had balance at the horizon. */
  shareBeyondHorizon: number;
}

export interface DateRange {
  p10: Date;
  p50: Date;
  p90: Date | null;
}

interface HourSlot {
  ms: number;
  hour: number;
  dayKey: number;
  monthKey: string;
}

/** The Cairo-local hourly timeline from `now`, shared by every run. */
function timeline(now: Date, hours: number, startDay: number): HourSlot[] {
  const slots: HourSlot[] = [];
  for (let i = 0; i < hours; i++) {
    const ms = now.getTime() + i * HOUR_MS;
    const local = cairo(ms);
    slots.push({
      ms,
      hour: local.getHours(),
      dayKey: local.getFullYear() * 10_000 + (local.getMonth() + 1) * 100 + local.getDate(),
      monthKey: consumptionMonth(meterMonthStart(new Date(ms), startDay)),
    });
  }
  return slots;
}

/** Marginal cost of kWh n -> n + 1, memoised per tariff version. */
function marginalCosts(customerClass: CustomerClass) {
  const cache = new Map<TariffVersion, number[]>();
  return (version: TariffVersion, n: number): number => {
    let costs = cache.get(version);
    if (!costs) {
      costs = [];
      cache.set(version, costs);
    }
    while (costs.length <= n) {
      const k = costs.length;
      const energy = (n: number) => bill(version, n, { customerClass }).energy;
      costs.push(energy(k + 1) - energy(k));
    }
    return costs[n]!;
  };
}

function toDates(r: Range): DateRange {
  return {
    p10: new Date(Math.round(r.p10)),
    p50: new Date(Math.round(r.p50)),
    p90: Number.isFinite(r.p90) ? new Date(Math.round(r.p90)) : null,
  };
}

export function simulateRunOut(input: PrepaidInput): PrepaidResult {
  const {
    now,
    balance,
    kWhThisMeterMonth,
    meterMonthStartDay,
    tariffFor,
    model,
    grace = DEFAULT_GRACE,
    profile = FLAT_PROFILE,
    runs = 500,
    seed = 1,
    horizonDays = 62,
    customerClass = 'residential',
  } = input;
  if (balance <= 0) {
    const cut = nextCutAllowed(now, grace);
    const at = { p10: now, p50: now, p90: now };
    return { zeroAt: at, cutAt: { p10: cut, p50: cut, p90: cut }, shareBeyondHorizon: 0 };
  }

  const slots = timeline(now, Math.ceil(horizonDays * 24), meterMonthStartDay);
  const cost = marginalCosts(customerClass);
  const random = seededRandom(seed);
  const zeros: number[] = [];

  for (let r = 0; r < runs; r++) {
    let left = balance;
    let kWh = kWhThisMeterMonth;
    let charged = Math.floor(kWh); // whole kWh already paid for this meter month
    let month = slots[0]!.monthKey;
    let version = tariffFor(month);
    let day = -1;
    let dayKWh = 0;

    for (const slot of slots) {
      if (slot.monthKey !== month) {
        month = slot.monthKey;
        version = tariffFor(month);
        kWh = 0;
        charged = 0;
      }
      if (slot.dayKey !== day) {
        day = slot.dayKey;
        dayKWh = sampleDay(model, random);
      }
      kWh += dayKWh * profile[slot.hour]!;
      let hourCost = 0;
      while (charged < Math.floor(kWh)) hourCost += cost(version, charged++);
      if (hourCost >= left) {
        // Interpolate within the hour: the balance runs out part-way through it.
        zeros.push(slot.ms + (left / hourCost) * HOUR_MS);
        break;
      }
      left -= hourCost;
    }
  }

  const shareBeyondHorizon = (runs - zeros.length) / runs;
  if (zeros.length < runs / 2) return { zeroAt: null, cutAt: null, shareBeyondHorizon };
  // Runs that never hit zero are later than every observed time; count them at +infinity so
  // they push the upper quantiles out instead of being silently dropped.
  const all = [
    ...zeros,
    ...Array.from({ length: runs - zeros.length }, () => Number.POSITIVE_INFINITY),
  ];
  const z = range(all);
  const cuts = all.map((ms) =>
    Number.isFinite(ms) ? nextCutAllowed(new Date(ms), grace).getTime() : ms,
  );
  const c = range(cuts);
  return {
    zeroAt: toDates(z),
    cutAt: toDates(c),
    shareBeyondHorizon,
  };
}
