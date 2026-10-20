// Which local notifications to schedule, as plain data. The app layer hands these to
// expo-notifications. Re-planned on every reading, recharge, app open and boot (docs/PLAN.md §6),
// so each plan fully replaces the previous one.
import { cairo, cairoTime, isGrace, type GraceRules } from '@addady/energy-model';

import type { HomeStatus } from './status';

export type Channel = 'runout' | 'tier' | 'reminders';

export interface PlannedNotification {
  /** Stable id: re-planning replaces a notification instead of duplicating it. */
  id: string;
  channel: Channel;
  at: Date;
  /** i18n key under notifications.* plus interpolation values. */
  key: string;
  values: Record<string, string | number>;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MORNING_HOUR = 8;

export interface PlanOptions {
  now: Date;
  grace: GraceRules;
  /** Nudge to add a reading after this many days without one. */
  staleAfterDays: number;
  /** Local hour (0-23) the user prefers reminders at. */
  reminderHour: number;
  lowBalancePiasters: number | null;
}

/** Cairo-local `hour`:00 on the day of `at`. */
function atLocalHour(at: Date, hour: number): Date {
  const d = cairo(at);
  return cairoTime(d.getFullYear(), d.getMonth() + 1, d.getDate(), hour);
}

/** The first Cairo-local `hour`:00 at or after `after`. */
function nextLocalHour(after: Date, hour: number): Date {
  const sameDay = atLocalHour(after, hour);
  return sameDay.getTime() >= after.getTime()
    ? sameDay
    : atLocalHour(new Date(after.getTime() + DAY), hour);
}

export function planNotifications(
  homeId: number,
  status: HomeStatus,
  o: PlanOptions,
): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  const add = (n: Omit<PlannedNotification, 'id'> & { id: string }) => {
    if (n.at.getTime() > o.now.getTime()) plan.push({ ...n, id: `home${homeId}:${n.id}` });
  };

  // Prepaid run-out: always from the EARLIEST plausible cut (P10), with hours of margin.
  const cut = status.runOut?.cutAt?.p10;
  if (cut) {
    add({
      id: 'runout-3d',
      channel: 'runout',
      at: atLocalHour(new Date(cut.getTime() - 3 * DAY), o.reminderHour),
      key: 'runout3d',
      values: { at: cut.getTime() },
    });
    add({
      id: 'runout-1d',
      channel: 'runout',
      at: atLocalHour(new Date(cut.getTime() - DAY), o.reminderHour),
      key: 'runout1d',
      values: { at: cut.getTime() },
    });
    add({
      id: 'runout-morning',
      channel: 'runout',
      at: atLocalHour(cut, MORNING_HOUR),
      key: 'runoutToday',
      values: { at: cut.getTime() },
    });
    // Balance hits zero inside a long grace stretch (e.g. Thursday evening -> Saturday): say so the evening before.
    const zero = status.runOut!.zeroAt!.p10;
    if (cut.getTime() - zero.getTime() > 12 * HOUR && isGrace(zero, o.grace)) {
      add({
        id: 'runout-weekend',
        channel: 'runout',
        at: new Date(zero.getTime() - 6 * HOUR),
        key: 'runoutWeekend',
        values: { at: cut.getTime() },
      });
    }
  }

  // Low balance: warn now-ish if already below the user's threshold.
  if (
    o.lowBalancePiasters !== null &&
    status.latestBalance !== null &&
    status.latestBalance <= o.lowBalancePiasters
  ) {
    add({
      id: 'low-balance',
      channel: 'runout',
      at: new Date(o.now.getTime() + 60_000),
      key: 'lowBalance',
      values: { balance: status.latestBalance },
    });
  }

  // Cliff ahead: if the median projection crosses the next cliff, warn with the daily budget.
  if (
    status.cliff &&
    status.budget &&
    status.projection &&
    status.projection.kWh.p50 > status.cliff.atKWh
  ) {
    add({
      id: 'cliff',
      channel: 'tier',
      at: nextLocalHour(new Date(o.now.getTime() + HOUR), o.reminderHour),
      key: 'cliffAhead',
      values: {
        atKWh: status.cliff.atKWh,
        jump: status.cliff.jump,
        perDay: Math.max(0, Math.round(status.budget.kWhPerDay * 10) / 10),
      },
    });
  }

  // Stale projection: ask for a fresh reading.
  const since = status.daysSinceLastReading;
  const staleAt =
    since === null
      ? new Date(o.now.getTime() + DAY)
      : new Date(o.now.getTime() + Math.max(0, o.staleAfterDays - since) * DAY);
  add({
    id: 'stale',
    channel: 'reminders',
    at: nextLocalHour(
      new Date(Math.max(staleAt.getTime(), o.now.getTime() + HOUR)),
      o.reminderHour,
    ),
    key: 'addReading',
    values: {},
  });

  return plan.sort((a, b) => a.at.getTime() - b.at.getTime());
}
