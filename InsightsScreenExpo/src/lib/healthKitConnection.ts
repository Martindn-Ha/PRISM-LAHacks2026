import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_KIT_LINKED_KEY = 'prism:healthKitLinked';

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
    }
  } catch {
    // Ignore persistence failures; in-session state still applies.
  }
}
