import { NativeModules, Platform } from 'react-native';
import type { AristaContextPayload } from '../types/experience';

type ZeticPostInput = {
  caption: string;
  aristaContext: AristaContextPayload | null;
  imageHints: string[];
};

type ZeticPostOutput = {
  autoDescription: string;
  autoTags: string[];
  confidence: number | null;
  useEventContext: boolean;
  source: 'native' | 'fallback';
  error: string | null;
};

const MAX_TAGS = 8;
const MIN_TAGS = 3;
const EVENT_CONFIDENCE_THRESHOLD = 0.7;

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'i',
  'in',
  'is',
  'it',
  'my',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'this',
  'to',
  'today',
  'was',
  'we',
  'with',
]);

const sanitizeTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawTag of tags) {
    const normalized = rawTag
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    const isHexNoise = /^[a-f0-9]{4,}$/.test(normalized);
    if (!normalized || isHexNoise || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= MAX_TAGS) {
      break;
    }
  }
  return out;
};

const clampConfidence = (value: unknown): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(1, value));
};

const toCaptionSentence = (caption: string): string => {
  const trimmed = caption.trim();
  if (!trimmed) {
    return 'Shared a wellness progress update.';
  }
  const withPunctuation = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return withPunctuation.slice(0, 160);
};

const extractCaptionTags = (caption: string): string[] => {
  const words = caption
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
  return words.slice(0, 5);
};

const buildFallback = (input: ZeticPostInput): ZeticPostOutput => {
  const eventConfidence = input.aristaContext?.event?.confidence ?? null;
  const useEventContext = typeof eventConfidence === 'number' && eventConfidence >= EVENT_CONFIDENCE_THRESHOLD;
  const eventName = input.aristaContext?.event?.name?.trim();
  const eventVenue = input.aristaContext?.event?.venue?.trim();
  const autoDescription = useEventContext && eventName
    ? `Shared progress near ${eventName}${eventVenue ? ` at ${eventVenue}` : ''}.`
    : toCaptionSentence(input.caption);

  const fallbackTags = sanitizeTags([
    ...extractCaptionTags(input.caption),
    ...input.imageHints,
    'wellness',
    'progress',
    'community',
  ]);
  while (fallbackTags.length < MIN_TAGS) {
    fallbackTags.push(`wellness-${fallbackTags.length + 1}`);
  }
  return {
    autoDescription,
    autoTags: fallbackTags,
    confidence: null,
    useEventContext,
    source: 'fallback',
    error: null,
  };
};

type ZeticNativeResponse = {
  autoDescription?: unknown;
  autoTags?: unknown;
  confidence?: unknown;
};

type ZeticNativeModuleShape = {
  preloadModel(): Promise<void>;
  generateProgressMetadata(payload: {
    caption: string;
    context: AristaContextPayload | null;
    imageHints: string[];
  }): Promise<ZeticNativeResponse>;
};

const ZeticNativeModule = NativeModules.ZeticNativeModule as ZeticNativeModuleShape | undefined;

export const preloadZeticModel = async (): Promise<void> => {
  if (Platform.OS !== 'ios' || !ZeticNativeModule?.preloadModel) {
    return;
  }
  try {
    await ZeticNativeModule.preloadModel();
  } catch {
    // Preload is best-effort; post flow still handles fallback safely.
  }
};

export const generateProgressPostMetadata = async (input: ZeticPostInput): Promise<ZeticPostOutput> => {
  const fallback = buildFallback(input);
  if (Platform.OS !== 'ios' || !ZeticNativeModule?.generateProgressMetadata) {
    return {
      ...fallback,
      error: Platform.OS !== 'ios' ? 'not-ios' : 'native-module-unavailable',
    };
  }
  try {
    const json = await ZeticNativeModule.generateProgressMetadata({
      caption: input.caption,
      context: input.aristaContext,
      imageHints: input.imageHints,
    });
    const generatedDescription = typeof json.autoDescription === 'string'
      ? toCaptionSentence(json.autoDescription)
      : fallback.autoDescription;
    const generatedTags = Array.isArray(json.autoTags)
      ? sanitizeTags(json.autoTags.filter((item): item is string => typeof item === 'string'))
      : fallback.autoTags;
    const confidence = clampConfidence(json.confidence);
    const useEventContext = confidence != null
      ? confidence >= EVENT_CONFIDENCE_THRESHOLD && fallback.useEventContext
      : fallback.useEventContext;
    return {
      autoDescription: generatedDescription,
      autoTags: generatedTags.length >= MIN_TAGS ? generatedTags : fallback.autoTags,
      confidence,
      useEventContext,
      source: 'native',
      error: null,
    };
  } catch (error) {
    return {
      ...fallback,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
