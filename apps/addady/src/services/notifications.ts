// Local notifications only: no server, no push (docs/PLAN.md §6). Permission is requested only
// when the user turns notifications on, after the app explains why.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification } from '../domain/notifications';
import { t } from '../i18n';

const CHANNELS = {
  runout: {
    name: () => t('notifications.channelRunout'),
    importance: Notifications.AndroidImportance.HIGH,
  },
  tier: {
    name: () => t('notifications.channelTier'),
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  reminders: {
    name: () => t('notifications.channelReminders'),
    importance: Notifications.AndroidImportance.LOW,
  },
} as const;

/** Call once at startup (not at import time, so modules stay side-effect free). */
export function initNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const [id, ch] of Object.entries(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(id, {
      name: ch.name(),
      importance: ch.importance,
    });
  }
}

export async function requestPermission(): Promise<boolean> {
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Replaces every scheduled notification for a home with a fresh plan. Plans are computed from
 * the latest data, so re-planning on each reading/recharge/app open keeps them accurate.
 */
export async function applyPlan(
  homeId: number,
  plan: readonly PlannedNotification[],
  format: (n: PlannedNotification) => string,
): Promise<void> {
  const prefix = `home${homeId}:`;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((s) => s.identifier.startsWith(prefix))
      .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
  );
  const granted = (await Notifications.getPermissionsAsync()).granted;
  if (!granted) return;
  await ensureChannels();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: t('app.name'), body: format(n), data: { homeId } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: n.at,
        channelId: n.channel,
      },
    });
  }
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
