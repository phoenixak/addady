// Cairo-local calendar helpers. Egypt observes summer time (DST), so every "day", "month" and
// grace window is computed in Africa/Cairo with real zone rules, never with fixed offsets.
import { TZDate } from '@date-fns/tz';

export const CAIRO = 'Africa/Cairo';

/** Cairo-local view of an instant. */
export function cairo(at: Date | number): TZDate {
  return new TZDate(typeof at === 'number' ? at : at.getTime(), CAIRO);
}

/** The instant of a Cairo-local wall-clock time (DST-aware). Month is 1-12. */
export function cairoTime(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(new TZDate(year, month - 1, day, hour, minute, 0, CAIRO).getTime());
}

/** Cairo-local calendar date 'YYYY-MM-DD'. */
export function cairoDateKey(at: Date | number): string {
  const d = cairo(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface GraceRules {
  /** Meters don't disconnect from this hour (inclusive) ... */
  eveningFromHour: number;
  /** ... until this hour next morning (exclusive). */
  morningUntilHour: number;
  /** No disconnection on Fridays. */
  fridays: boolean;
  /** Confirmed official holidays (Cairo dates 'YYYY-MM-DD') with no disconnection. */
  holidays: ReadonlySet<string>;
}

/** EgyptERA / EEHC rule: no cut on Fridays, official holidays, or daily 17:00-10:00 (docs/research/tariff.md §6). */
export const DEFAULT_GRACE: GraceRules = {
  eveningFromHour: 17,
  morningUntilHour: 10,
  fridays: true,
  holidays: new Set(),
};

const FRIDAY = 5;

function isNoCutDay(d: TZDate, rules: GraceRules): boolean {
  return (rules.fridays && d.getDay() === FRIDAY) || rules.holidays.has(cairoDateKey(d.getTime()));
}

/** True when a prepaid meter will not disconnect at this instant even with no balance. */
export function isGrace(at: Date, rules: GraceRules = DEFAULT_GRACE): boolean {
  const d = cairo(at);
  const h = d.getHours();
  return isNoCutDay(d, rules) || h >= rules.eveningFromHour || h < rules.morningUntilHour;
}

/**
 * The first instant at or after `at` when a meter with no balance can disconnect.
 * Thursday 18:00 -> Saturday 10:00; a three-day Eid is skipped as a whole.
 */
export function nextCutAllowed(at: Date, rules: GraceRules = DEFAULT_GRACE): Date {
  if (!isGrace(at, rules)) return at;
  let d = cairo(at);
  // Move to the morning the evening/night window ends.
  if (d.getHours() >= rules.eveningFromHour) {
    d = new TZDate(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() + 1,
      rules.morningUntilHour,
      0,
      0,
      CAIRO,
    );
  } else if (d.getHours() < rules.morningUntilHour) {
    d = new TZDate(d.getFullYear(), d.getMonth(), d.getDate(), rules.morningUntilHour, 0, 0, CAIRO);
  }
  // Skip whole no-cut days (Fridays, holidays). Bounded: no real calendar has a year of holidays.
  for (let i = 0; i < 366 && isNoCutDay(d, rules); i++) {
    d = new TZDate(
      d.getFullYear(),
      d.getMonth(),
      d.getDate() + 1,
      rules.morningUntilHour,
      0,
      0,
      CAIRO,
    );
  }
  return new Date(d.getTime());
}

/**
 * Start of the meter month containing `at`. Prepaid meters reset tiers on their own month-start
 * day (1-28), which may differ from the calendar month.
 */
export function meterMonthStart(at: Date, startDay: number): Date {
  if (!Number.isInteger(startDay) || startDay < 1 || startDay > 28) {
    throw new RangeError(`meter month start day must be 1-28, got ${startDay}`);
  }
  const d = cairo(at);
  const monthOffset = d.getDate() >= startDay ? 0 : -1;
  return new Date(
    new TZDate(d.getFullYear(), d.getMonth() + monthOffset, startDay, 0, 0, 0, CAIRO).getTime(),
  );
}

/** Start of the meter month after the one containing `at`. */
export function nextMeterMonthStart(at: Date, startDay: number): Date {
  const start = cairo(meterMonthStart(at, startDay));
  return new Date(
    new TZDate(start.getFullYear(), start.getMonth() + 1, startDay, 0, 0, 0, CAIRO).getTime(),
  );
}

/** The calendar month 'YYYY-MM' (Cairo) that a meter month starting at `start` is billed under. */
export function consumptionMonth(start: Date): string {
  return cairoDateKey(start).slice(0, 7);
}
