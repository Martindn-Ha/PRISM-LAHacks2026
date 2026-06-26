import AsyncStorage from '@react-native-async-storage/async-storage';

type SecureStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  deleteItem: (key: string) => Promise<void>;
};

type SecureStoreModule = typeof import('expo-secure-store');

let cachedStorage: SecureStorage | null = null;

function loadSecureStoreModule(): SecureStoreModule | null {
  try {
    // Lazy require so a missing native module does not crash app startup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
}

function createStorage(): SecureStorage {
  let secureStore = loadSecureStoreModule();
  let secureStoreAvailable = secureStore != null;

  const fallback = {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    deleteItem: (key: string) => AsyncStorage.removeItem(key),
  };

  if (!secureStoreAvailable || !secureStore) {
    return fallback;
  }

  const store = secureStore;

  return {
    getItem: async (key) => {
      if (!secureStoreAvailable) {
        return fallback.getItem(key);
      }
      try {
        return await store.getItemAsync(key);
      } catch {
        secureStoreAvailable = false;
        return fallback.getItem(key);
      }
    },
    setItem: async (key, value) => {
      if (!secureStoreAvailable) {
        await fallback.setItem(key, value);
        return;
      }
      try {
        await store.setItemAsync(key, value);
      } catch {
        secureStoreAvailable = false;
        await fallback.setItem(key, value);
      }
    },
    deleteItem: async (key) => {
      if (!secureStoreAvailable) {
        await fallback.deleteItem(key);
        return;
      }
      try {
        await store.deleteItemAsync(key);
      } catch {
        secureStoreAvailable = false;
        await fallback.deleteItem(key);
      }
    },
  };
}

export function getSecureStorage(): SecureStorage {
  if (!cachedStorage) {
    cachedStorage = createStorage();
  }
  return cachedStorage;
}

export function usesNativeSecureStorage(): boolean {
  return loadSecureStoreModule() != null;
}
