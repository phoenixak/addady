// User settings, stored in the local settings table and read live.
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import { formatMoney, formatNumber, type DigitStyle } from '@addady/ui-ar';

import { queries } from './db/repo';

export interface Settings {
  digits: DigitStyle;
  reminderHour: number;
  staleDays: number;
  notifications: boolean;
  currentHomeId: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  digits: 'arab',
  reminderHour: 20,
  staleDays: 4,
  notifications: false,
  currentHomeId: null,
};

export function parseSettings(rows: readonly { key: string; value: string }[]): Settings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const int = (key: string, fallback: number) => {
    const n = Number.parseInt(map.get(key) ?? '', 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    digits: map.get('digits') === 'latn' ? 'latn' : 'arab',
    reminderHour: int('reminderHour', DEFAULT_SETTINGS.reminderHour),
    staleDays: int('staleDays', DEFAULT_SETTINGS.staleDays),
    notifications: map.get('notifications') === 'on',
    currentHomeId: map.has('currentHomeId') ? int('currentHomeId', 0) : null,
  };
}

export function useSettings(): Settings {
  const { data } = useLiveQuery(queries.settings());
  return useMemo(() => parseSettings(data ?? []), [data]);
}

const CAIRO = 'Africa/Cairo';

/** Number, money and date formatters that follow the user's digit preference. */
export function useFormat() {
  const { digits } = useSettings();
  return useMemo(() => {
    const locale = digits === 'arab' ? 'ar-EG-u-nu-arab' : 'ar-EG-u-nu-latn';
    const dateTime = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: CAIRO,
    });
    const date = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: CAIRO,
    });
    const month = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: CAIRO });
    return {
      digits,
      num: (n: number, fractionDigits = 0) =>
        formatNumber(n, { digits, maximumFractionDigits: fractionDigits }),
      money: (piasters: number) => formatMoney(Math.round(piasters), 'EGP', { digits }),
      kwh: (n: number) => `${formatNumber(n, { digits })} ك.و.س`,
      dateTime: (d: Date | number) => dateTime.format(d),
      date: (d: Date | number) => date.format(d),
      month: (d: Date | number) => month.format(d),
    };
  }, [digits]);
}
