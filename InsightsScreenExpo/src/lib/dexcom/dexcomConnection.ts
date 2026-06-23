import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureStorage } from '../secureStorage';
import type { DexcomCredentials, DexcomRegion } from './types';

const LINKED_KEY = 'prism:dexcomLinked';
const USERNAME_KEY = 'prism:dexcomUsername';
const REGION_KEY = 'prism:dexcomRegion';
const PASSWORD_KEY = 'prism:dexcomPassword';

const VALID_REGIONS = new Set<DexcomRegion>(['us', 'ous', 'jp']);

function sanitizeRegion(value: string | null): DexcomRegion {
  const region = (value ?? 'us').toLowerCase() as DexcomRegion;
  return VALID_REGIONS.has(region) ? region : 'us';
}

export async function getDexcomLinked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LINKED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function getDexcomCredentials(): Promise<DexcomCredentials | null> {
  try {
    const linked = await getDexcomLinked();
    if (!linked) {
      return null;
    }
    const secureStorage = getSecureStorage();
    const [username, password, regionRaw] = await Promise.all([
      AsyncStorage.getItem(USERNAME_KEY),
      secureStorage.getItem(PASSWORD_KEY),
      AsyncStorage.getItem(REGION_KEY),
    ]);
    if (!username?.trim() || !password) {
      return null;
    }
    return {
      username: username.trim(),
      password,
      region: sanitizeRegion(regionRaw),
    };
  } catch {
    return null;
  }
}

export async function saveDexcomCredentials(credentials: DexcomCredentials): Promise<void> {
  const secureStorage = getSecureStorage();
  await Promise.all([
    AsyncStorage.setItem(LINKED_KEY, '1'),
    AsyncStorage.setItem(USERNAME_KEY, credentials.username.trim()),
    AsyncStorage.setItem(REGION_KEY, credentials.region),
    secureStorage.setItem(PASSWORD_KEY, credentials.password),
  ]);
}

export async function clearDexcomCredentials(): Promise<void> {
  const secureStorage = getSecureStorage();
  await Promise.all([
    AsyncStorage.multiRemove([LINKED_KEY, USERNAME_KEY, REGION_KEY]),
    secureStorage.deleteItem(PASSWORD_KEY),
  ]);
}
