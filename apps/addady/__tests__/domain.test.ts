import { bundledTariffs } from 'eg-electricity-tariff';
import { cairoTime, DEFAULT_GRACE } from '@addady/energy-model';

import type { Home, ReadingRow } from '../src/db/schema';
import { planNotifications } from '../src/domain/notifications';
import { cumulativeReadings, interpolate } from '../src/domain/series';
import { homeStatus } from '../src/domain/status';

const home = (over: Partial<Home> = {}): Home => ({
  id: 1,
  name: 'البيت',
  kind: 'home',
  customerClass: 'residential',
  meterType: 'postpaid',
  powerFactor: null,
  governorate: 'cairo',
  meterMonthStartDay: 1,
  contractedLoadKW: null,
  lowBalancePiasters: null,
  otherChargesPiasters: 0,
  createdAt: 0,
  ...over,
});

let nextId = 1;
const reading = (at: Date, over: Partial<ReadingRow>): ReadingRow => ({
  id: nextId++,
  homeId: 1,
  at: at.getTime(),
  registerKWh: null,
  monthKWh: null,
  balancePiasters: null,
  note: null,
  ...over,
});

describe('cumulativeReadings', () => {
  it('uses the register for postpaid meters, oldest first', () => {
    const rows = [
      reading(cairoTime(2026, 10, 10), { registerKWh: 1100 }),
      reading(cairoTime(2026, 10, 1), { registerKWh: 1000 }),
      reading(cairoTime(2026, 10, 5), { monthKWh: 7 }), // ignored for postpaid
    ];
    expect(cumulativeReadings(home(), rows).map((r) => r.kWh)).toEqual([1000, 1100]);
  });

  it('stitches prepaid "this month" counters across meter-month resets', () => {
    const rows = [
      reading(cairoTime(2026, 9, 10), { monthKWh: 40 }),
      reading(cairoTime(2026, 9, 28), { monthKWh: 150 }),
      reading(cairoTime(2026, 10, 3), { monthKWh: 20 }), // new meter month (start day 1)
      reading(cairoTime(2026, 10, 9), { monthKWh: 80 }),
      reading(cairoTime(2026, 10, 9, 12), { balancePiasters: 5000 }), // no counter: skipped
    ];
    expect(cumulativeReadings(home({ meterType: 'prepaid' }), rows).map((r) => r.kWh)).toEqual([
      40, 150, 170, 230,
    ]);
  });
});

describe('interpolate', () => {
  const series = [
    { at: cairoTime(2026, 10, 1), kWh: 1000 },
    { at: cairoTime(2026, 10, 11), kWh: 1100 },
  ];
  it('interpolates between readings and flags extrapolation', () => {
    expect(interpolate(series, cairoTime(2026, 10, 6))).toEqual({ kWh: 1050, extrapolated: false });
    expect(interpolate(series, cairoTime(2026, 9, 1))).toEqual({ kWh: 1000, extrapolated: true });
    expect(interpolate(series, cairoTime(2026, 10, 20))).toEqual({ kWh: 1100, extrapolated: true });
    expect(interpolate(series, cairoTime(2026, 10, 1))).toEqual({ kWh: 1000, extrapolated: false });
    expect(interpolate([], new Date())).toBeNull();
  });
});

describe('homeStatus', () => {
  const now = cairoTime(2026, 10, 20, 12);

  it('postpaid: month so far, current tier bill, projection range and next cliff', () => {
    const rows = [
      reading(cairoTime(2026, 9, 20), { registerKWh: 5000 }),
      reading(cairoTime(2026, 10, 1), { registerKWh: 5088 }), // 8 kWh/day
      reading(cairoTime(2026, 10, 20, 12), { registerKWh: 5244 }), // 8 kWh/day
    ];
    const s = homeStatus({
      home: home(),
      readings: rows,
      tariffs: bundledTariffs,
      now,
      grace: DEFAULT_GRACE,
      runs: 200,
    });
    expect(s.tariffId).toBe('2026-07');
    expect(s.kWhSoFar).toBeCloseTo(156, 0);
    expect(s.kWhSoFarEstimated).toBe(false);
    expect(s.current!.bandIndex).toBe(1); // 101-650: restarted from zero at tier 3
    expect(s.cliff!.atKWh).toBe(650);
    expect(s.projection!.kWh.p50).toBeGreaterThan(230);
    expect(s.projection!.kWh.p50).toBeLessThan(260);
    expect(s.runOut).toBeNull();
    expect(s.daysSinceLastReading).toBeCloseTo(0);
  });

  it('works with no readings yet (nothing to show, nothing to crash)', () => {
    const s = homeStatus({
      home: home(),
      readings: [],
      tariffs: bundledTariffs,
      now,
      grace: DEFAULT_GRACE,
      runs: 50,
    });
    expect(s).toMatchObject({
      kWhSoFar: null,
      current: null,
      projection: null,
      cliff: null,
      budget: null,
      daysSinceLastReading: null,
    });
    expect(s.model.fallback).toBe(true);
  });

  it('prepaid: simulates run-out from the latest balance', () => {
    const rows = [
      reading(cairoTime(2026, 10, 10), { monthKWh: 90 }),
      reading(cairoTime(2026, 10, 19, 12), { monthKWh: 166, balancePiasters: 3000 }),
    ];
    const s = homeStatus({
      home: home({ meterType: 'prepaid' }),
      readings: rows,
      tariffs: bundledTariffs,
      now,
      grace: DEFAULT_GRACE,
      runs: 100,
    });
    expect(s.latestBalance).toBe(3000);
    // The meter's own "this month" counter (166) plus 1 day since the read at the measured 8 kWh/day.
    expect(s.kWhSoFar!).toBeGreaterThan(166);
    expect(s.kWhSoFar!).toBeCloseTo(166 + 8, 5);
    expect(s.runOut!.zeroAt!.p10.getTime()).toBeGreaterThan(cairoTime(2026, 10, 19, 12).getTime());
    expect(s.runOut!.cutAt!.p10.getTime()).toBeGreaterThanOrEqual(s.runOut!.zeroAt!.p10.getTime());
  });

  it('regression (seen on device): a single prepaid reading of 88 kWh means 88 kWh this month, not 0', () => {
    const rows = [reading(cairoTime(2026, 10, 20, 12), { monthKWh: 88, balancePiasters: 5000 })];
    const s = homeStatus({
      home: home({ meterType: 'prepaid' }),
      readings: rows,
      tariffs: bundledTariffs,
      now,
      grace: DEFAULT_GRACE,
      runs: 50,
    });
    expect(s.kWhSoFar).toBeCloseTo(88, 5);
    expect(s.kWhSoFarEstimated).toBe(false);
    expect(s.cliff!.atKWh).toBe(100);
    expect(s.budget!.kWhPerDay).toBeCloseTo(12 / s.daysLeft, 5);
  });

  it('a prepaid counter from last meter month is not used for this month', () => {
    const rows = [reading(cairoTime(2026, 9, 28), { monthKWh: 300 })];
    const s = homeStatus({
      home: home({ meterType: 'prepaid' }),
      readings: rows,
      tariffs: bundledTariffs,
      now,
      grace: DEFAULT_GRACE,
      runs: 50,
    });
    expect(s.kWhSoFar).not.toBe(300);
  });

  it('coded meters have no cliffs', () => {
    const rows = [
      reading(cairoTime(2026, 10, 1), { registerKWh: 0 }),
      reading(cairoTime(2026, 10, 19), { registerKWh: 90 }),
    ];
    const s = homeStatus({
      home: home({ meterType: 'coded' }),
      readings: rows,
      tariffs: bundledTariffs,
      now,
      grace: DEFAULT_GRACE,
      runs: 50,
    });
    expect(s.cliff).toBeNull();
    expect(s.budget).toBeNull();
    expect(s.current!.lines[0]!.rate).toBe(274);
  });
});

describe('planNotifications', () => {
  const now = cairoTime(2026, 10, 13, 12); // Tuesday
  const opts = {
    now,
    grace: DEFAULT_GRACE,
    staleAfterDays: 4,
    reminderHour: 20,
    lowBalancePiasters: 2000,
  };

  it('warns 3 days, 1 day and on the morning before the EARLIEST cut, plus a weekend notice', () => {
    const zero = cairoTime(2026, 10, 15, 19); // Thursday evening (grace)
    const cut = cairoTime(2026, 10, 17, 10); // -> Saturday 10:00
    const status = {
      runOut: {
        zeroAt: { p10: zero, p50: zero, p90: null },
        cutAt: { p10: cut, p50: cut, p90: null },
        shareBeyondHorizon: 0,
      },
      latestBalance: 1500,
      cliff: null,
      budget: null,
      projection: null,
      daysSinceLastReading: 1,
    } as never;
    const plan = planNotifications(1, status, opts);
    const ids = plan.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'home1:runout-3d',
        'home1:runout-1d',
        'home1:runout-morning',
        'home1:runout-weekend',
        'home1:low-balance',
        'home1:stale',
      ]),
    );
    // 3 days before Saturday 10:00 is Wednesday; at the user's reminder hour (20:00).
    expect(plan.find((p) => p.id === 'home1:runout-3d')!.at).toEqual(cairoTime(2026, 10, 14, 20));
    // The weekend notice fires the afternoon before the balance runs out inside the long grace stretch.
    expect(plan.find((p) => p.id === 'home1:runout-weekend')!.at).toEqual(
      cairoTime(2026, 10, 15, 13),
    );
    expect(plan.find((p) => p.id === 'home1:runout-morning')!.at).toEqual(
      cairoTime(2026, 10, 17, 8),
    );
    for (const p of plan) expect(p.at.getTime()).toBeGreaterThan(now.getTime());
    // Sorted by time.
    expect([...plan].sort((a, b) => a.at.getTime() - b.at.getTime())).toEqual(plan);
  });

  it('warns about a cliff the projection will cross, with the daily budget', () => {
    const status = {
      runOut: null,
      latestBalance: null,
      cliff: { atKWh: 100, totalBefore: 8500, totalAfter: 12215, jump: 3715 },
      budget: { atKWh: 100, jump: 3715, kWhPerDay: 1.333 },
      projection: { kWh: { p10: 95, p50: 110, p90: 125 }, total: { p10: 0, p50: 0, p90: 0 } },
      daysSinceLastReading: null,
    } as never;
    const cliff = planNotifications(2, status, opts).find((p) => p.key === 'cliffAhead')!;
    expect(cliff.values).toEqual({ atKWh: 100, jump: 3715, perDay: 1.3 });
    expect(cliff.at).toEqual(cairoTime(2026, 10, 13, 20));
  });
});
