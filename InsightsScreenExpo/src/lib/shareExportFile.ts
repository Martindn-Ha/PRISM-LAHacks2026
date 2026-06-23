import {
  cacheDirectory,
  deleteAsync,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ExportFormat } from './healthDataExport';

export class ExportShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportShareError';
  }
}

export async function shareExportBytes(filename: string, bytes: Uint8Array, format: ExportFormat): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new ExportShareError('Sharing is not available on this device.');
  }

  if (!cacheDirectory) {
    throw new ExportShareError('Unable to access cache directory.');
  }

  const fileUri = `${cacheDirectory}${filename}`;
  const base64 = uint8ArrayToBase64(bytes);

  await writeAsStringAsync(fileUri, base64, {
    encoding: EncodingType.Base64,
  });

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: format === 'json' ? 'application/json' : 'application/zip',
      UTI: format === 'json' ? 'public.json' : 'public.zip-archive',
    });
  } finally {
    await deleteAsync(fileUri, { idempotent: true });
  }
}

export async function shareExportText(filename: string, text: string, format: ExportFormat): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new ExportShareError('Sharing is not available on this device.');
  }

  if (!cacheDirectory) {
    throw new ExportShareError('Unable to access cache directory.');
  }

  const fileUri = `${cacheDirectory}${filename}`;

  await writeAsStringAsync(fileUri, text, {
    encoding: EncodingType.UTF8,
  });

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: format === 'json' ? 'application/json' : 'application/zip',
      UTI: format === 'json' ? 'public.json' : 'public.zip-archive',
    });
  } finally {
    await deleteAsync(fileUri, { idempotent: true });
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i] ?? 0;
    const byte2 = bytes[i + 1];
    const byte3 = bytes[i + 2];

    const triplet = (byte1 << 16) | ((byte2 ?? 0) << 8) | (byte3 ?? 0);
    output += alphabet[(triplet >> 18) & 63];
    output += alphabet[(triplet >> 12) & 63];
    output += byte2 == null ? '=' : alphabet[(triplet >> 6) & 63];
    output += byte3 == null ? '=' : alphabet[triplet & 63];
  }
  return output;
}
