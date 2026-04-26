export const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
export const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';
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
export const hasCloudinaryConfig =
  CLOUDINARY_CLOUD_NAME.trim().length > 0 && CLOUDINARY_UPLOAD_PRESET.trim().length > 0;

export const cloudinaryUploadEndpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
export const cloudinaryDeliveryBase = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
