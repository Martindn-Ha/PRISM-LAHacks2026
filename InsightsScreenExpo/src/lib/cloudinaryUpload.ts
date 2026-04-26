import type { MediaVariants } from '../types/experience';
import {
  CLOUDINARY_UPLOAD_PRESET,
  cloudinaryDeliveryBase,
  cloudinaryUploadEndpoint,
  hasCloudinaryConfig,
} from '../config/publicEnv';

export const deriveImageName = (uri: string) => {
  const lastSegment = uri.split('/').pop();
  if (lastSegment && lastSegment.includes('.')) {
    return lastSegment;
  }
  return `post-${Date.now()}.jpg`;
};

export const uploadImageToCloudinary = async (imageUri: string): Promise<{ secureUrl: string; publicId: string }> => {
  if (!hasCloudinaryConfig) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }
  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('file', {
    uri: imageUri,
    name: deriveImageName(imageUri),
    type: 'image/jpeg',
  } as unknown as Blob);
  const response = await fetch(cloudinaryUploadEndpoint, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }
  const json = await response.json() as { secure_url?: string; public_id?: string };
  if (!json.secure_url || !json.public_id) {
    throw new Error('Cloudinary upload response is missing secure_url/public_id.');
  }
  return {
    secureUrl: json.secure_url,
    publicId: json.public_id,
  };
};

export const buildCloudinaryImageVariants = (publicId: string, originalUrl: string): MediaVariants => {
  const encodedPublicId = publicId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return {
    originalUrl,
    feedUrl: `${cloudinaryDeliveryBase}/f_auto,q_auto,c_fill,w_1080,h_1080/${encodedPublicId}`,
    thumbUrl: `${cloudinaryDeliveryBase}/f_auto,q_auto,c_fill,g_auto,w_360,h_360/${encodedPublicId}`,
  };
};
