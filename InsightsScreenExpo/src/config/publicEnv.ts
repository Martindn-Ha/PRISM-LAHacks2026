export const COMMUNITY_SPOTLIGHT_IMAGE_URL = process.env.EXPO_PUBLIC_COMMUNITY_SPOTLIGHT_IMAGE_URL?.trim() ?? '';
export const ARISTA_CONTEXT_URL = process.env.EXPO_PUBLIC_ARISTA_CONTEXT_URL ?? '';
export const ARISTA_COMMUNITY_EVENTS_URL =
  process.env.EXPO_PUBLIC_ARISTA_COMMUNITY_EVENTS_URL
  ?? (ARISTA_CONTEXT_URL.includes('/nearbyEventContext')
    ? ARISTA_CONTEXT_URL.replace('/nearbyEventContext', '/communityEvents')
    : '');

export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const hasFirebaseConfig = Object.values(FIREBASE_CONFIG).every((value) => value.trim().length > 0);
