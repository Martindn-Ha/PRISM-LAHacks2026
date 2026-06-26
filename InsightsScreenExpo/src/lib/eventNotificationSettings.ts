import AsyncStorage from '@react-native-async-storage/async-storage';

export const EVENT_NOTIFICATIONS_MUTED_KEY = 'prism.eventNotifications.muted';

export async function areEventNotificationsMuted(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(EVENT_NOTIFICATIONS_MUTED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setEventNotificationsMuted(muted: boolean): Promise<void> {
  await AsyncStorage.setItem(EVENT_NOTIFICATIONS_MUTED_KEY, muted ? 'true' : 'false');
}
