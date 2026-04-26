import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FIREBASE_CONFIG, hasFirebaseConfig } from '../config/publicEnv';

export const getFirestoreInstance = (): Firestore | null => {
  if (!hasFirebaseConfig) {
    return null;
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  return getFirestore(app);
};
