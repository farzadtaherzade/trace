import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/lib/i18n';

export const PAUSE_TIMEOUT_NOTIFICATION_ID = 'trace-pause-timeout';
export const PAUSE_TIMEOUT_SECONDS = 20 * 60;

export async function ensureNotificationPermission() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) {
      return;
    }
    await Notifications.requestPermissionsAsync();
  } catch {
    // Notifications are optional; the 20-minute rule still applies on app launch.
  }
}

export async function schedulePauseTimeoutNotification() {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const trigger: Notifications.TimeIntervalTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: PAUSE_TIMEOUT_SECONDS,
    };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.timeoutTitle'),
        body: i18n.t('notifications.timeoutBody'),
      },
      identifier: PAUSE_TIMEOUT_NOTIFICATION_ID,
      trigger,
    });
  } catch {
    // Scheduling is best-effort.
  }
}

export async function cancelPauseTimeoutNotification() {
  try {
    await Notifications.dismissNotificationAsync(PAUSE_TIMEOUT_NOTIFICATION_ID);
  } catch {
    // Already dismissed or never scheduled.
  }
}

export async function setNotificationHandler() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Ignore handler errors on unsupported platforms.
  }
}
