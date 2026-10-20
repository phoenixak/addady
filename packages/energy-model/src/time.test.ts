import { describe, expect, it } from 'vitest';

import {
  cairoDateKey,
  cairoTime,
  consumptionMonth,
  DEFAULT_GRACE,
  isGrace,
  meterMonthStart,
  nextCutAllowed,
  nextMeterMonthStart,
  type GraceRules,
} from './time';

const withHolidays = (...days: string[]): GraceRules => ({
  ...DEFAULT_GRACE,
  holidays: new Set(days),
});

describe('Cairo time and DST', () => {
  it('uses UTC+2 in winter and UTC+3 in summer (Egypt DST)', () => {
    expect(cairoTime(2026, 1, 15, 10).toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(cairoTime(2026, 7, 15, 10).toISOString()).toBe('2026-07-15T07:00:00.000Z');
  });

  it('dates instants by the Cairo calendar, not UTC', () => {
    expect(cairoDateKey(new Date('2026-07-15T22:30:00Z'))).toBe('2026-07-16');
    expect(cairoDateKey(Date.parse('2026-01-15T21:59:00Z'))).toBe('2026-01-15');
  });
});

describe('isGrace', () => {
  // 2026-10-15 is a Thursday, 2026-10-16 a Friday, 2026-10-17 a Saturday.
  it('is false on a weekday between 10:00 and 17:00', () => {
    expect(isGrace(cairoTime(2026, 10, 15, 10))).toBe(false);
    expect(isGrace(cairoTime(2026, 10, 15, 16, 59))).toBe(false);
  });

  it('is true from 17:00 until 10:00 the next morning', () => {
    expect(isGrace(cairoTime(2026, 10, 15, 17))).toBe(true);
    expect(isGrace(cairoTime(2026, 10, 17, 9, 59))).toBe(true);
  });

  it('is true all day Friday and on confirmed holidays', () => {
    expect(isGrace(cairoTime(2026, 10, 16, 12))).toBe(true);
    expect(isGrace(cairoTime(2026, 10, 19, 12), withHolidays('2026-10-19'))).toBe(true);
  });

  it('respects rules without the Friday exemption', () => {
    expect(isGrace(cairoTime(2026, 10, 16, 12), { ...DEFAULT_GRACE, fridays: false })).toBe(false);
  });
});

describe('nextCutAllowed', () => {
  it('returns the same instant outside grace', () => {
    const t = cairoTime(2026, 10, 14, 12);
    expect(nextCutAllowed(t)).toEqual(t);
  });

  it('moves an early-morning zero to 10:00 the same day', () => {
    expect(nextCutAllowed(cairoTime(2026, 10, 14, 3))).toEqual(cairoTime(2026, 10, 14, 10));
  });

  it('moves a Thursday-evening zero to Saturday 10:00', () => {
    expect(nextCutAllowed(cairoTime(2026, 10, 15, 18))).toEqual(cairoTime(2026, 10, 17, 10));
  });

  it('skips a multi-day holiday after the weekend', () => {
    const eid = withHolidays('2026-10-17', '2026-10-18');
    expect(nextCutAllowed(cairoTime(2026, 10, 15, 18), eid)).toEqual(cairoTime(2026, 10, 19, 10));
  });

  it('terminates even if every day were a holiday (bounded search)', () => {
    const all = new Set<string>();
    for (let d = 0; d < 800; d++)
      all.add(cairoDateKey(cairoTime(2026, 1, 1).getTime() + d * 86_400_000));
    const cut = nextCutAllowed(cairoTime(2026, 1, 1, 12), { ...DEFAULT_GRACE, holidays: all });
    expect(cut.getTime()).toBeGreaterThan(cairoTime(2026, 12, 31).getTime());
  });

  it('stays correct across the spring DST change (Fri 24 Apr 2026)', () => {
    const cut = nextCutAllowed(cairoTime(2026, 4, 23, 18));
    expect(cut).toEqual(cairoTime(2026, 4, 25, 10));
    expect(cut.toISOString()).toBe('2026-04-25T07:00:00.000Z');
  });
});

describe('meter months', () => {
  it('starts on the meter start day, in this or the previous calendar month', () => {
    expect(meterMonthStart(cairoTime(2026, 10, 20, 12), 15)).toEqual(cairoTime(2026, 10, 15));
    expect(meterMonthStart(cairoTime(2026, 10, 3, 12), 15)).toEqual(cairoTime(2026, 9, 15));
    expect(meterMonthStart(cairoTime(2026, 1, 3), 15)).toEqual(cairoTime(2025, 12, 15));
  });

  it('finds the next start, across a year end', () => {
    expect(nextMeterMonthStart(cairoTime(2026, 10, 20), 15)).toEqual(cairoTime(2026, 11, 15));
    expect(nextMeterMonthStart(cairoTime(2026, 12, 20), 15)).toEqual(cairoTime(2027, 1, 15));
  });

  it('rejects start days the meter cannot use', () => {
    expect(() => meterMonthStart(new Date(), 0)).toThrow(RangeError);
    expect(() => meterMonthStart(new Date(), 29)).toThrow(RangeError);
    expect(() => meterMonthStart(new Date(), 1.5)).toThrow(RangeError);
  });

  it('names the consumption month by the Cairo date of the meter month start', () => {
    expect(consumptionMonth(cairoTime(2026, 7, 1))).toBe('2026-07');
  });
});
