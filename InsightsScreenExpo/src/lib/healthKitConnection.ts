import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_KIT_LINKED_KEY = 'prism:healthKitLinked';
const HEALTH_KIT_LAST_SYNCED_AT_KEY = 'prism:healthKitLastSyncedAtMs';

/** User completed Apple Health authorization at least once. */
export async function getHealthKitLinked(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(HEALTH_KIT_LINKED_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function setHealthKitLinked(linked: boolean): Promise<void> {
  try {
    if (linked) {
      await AsyncStorage.setItem(HEALTH_KIT_LINKED_KEY, '1');
    } else {
      await AsyncStorage.removeItem(HEALTH_KIT_LINKED_KEY);
      await AsyncStorage.removeItem(HEALTH_KIT_LAST_SYNCED_AT_KEY);
    }
  } catch {
    // Ignore persistence failures; in-session state still applies.
  }
}

export async function getHealthKitLastSyncedAtMs(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(HEALTH_KIT_LAST_SYNCED_AT_KEY);
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function setHealthKitLastSyncedAtMs(syncedAtMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(HEALTH_KIT_LAST_SYNCED_AT_KEY, String(syncedAtMs));
  } catch {
    // Ignore persistence failures; in-session state still applies.
  }
}
