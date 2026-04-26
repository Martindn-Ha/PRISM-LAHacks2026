import { NativeModules, Platform } from 'react-native';
import type { InsightTrendWindow } from '../constants/insights';
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
  /** Present when `generateProgressMetadata` handled an on-device advisor request (see `__zeticAdvisorRequest`). */
  body?: unknown;
  /** Present when `generateProgressMetadata` handled an Insights analysis request (see `__zeticInsightAnalysis`). */
  analysis?: unknown;
  /** Optional native `reply` field when a legacy transport returns a string body alongside other keys. */
  reply?: unknown;
};

export type AdvisorSuggestionMetric = 'glucose' | 'stress' | 'heartRate';

const ADVISOR_SUGGESTION_FALLBACK_BODY: Record<AdvisorSuggestionMetric, string> = {
  stress:
    'Quick resets help when stress is up—micro breaks, box breathing, and short walks between tasks can flatten the curve.',
  glucose:
    'When glucose is elevated, favor protein + fiber and steady carbs—lighter swaps keep you full without sharp spikes.',
  heartRate:
    'Slow nasal breathing helps after heart rate spikes—try a paced inhale and exhale for 60–90 seconds to settle your rhythm.',
};

type ZeticAdvisorNativeResponse = {
  body?: unknown;
};

type ZeticNativeModuleShape = {
  preloadModel(): Promise<void>;
  generateProgressMetadata(payload: {
    caption: string;
    context: AristaContextPayload | null;
    imageHints: string[];
  }): Promise<ZeticNativeResponse>;
  generateAdvisorSuggestion(payload: {
    metric: AdvisorSuggestionMetric;
    stressValue: number;
    glucoseValue: number;
    heartRateValue: number;
  }): Promise<ZeticAdvisorNativeResponse>;
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

export type AdvisorSuggestionResult = {
  body: string;
  source: 'native' | 'fallback';
  error: string | null;
};

const buildAdvisorContextPayload = (input: {
  metric: AdvisorSuggestionMetric;
  stressValue: number;
  glucoseValue: number;
  heartRateValue: number;
}): AristaContextPayload =>
  ({
    __zeticAdvisorRequest: true,
    metric: input.metric,
    stressValue: input.stressValue,
    glucoseValue: input.glucoseValue,
    heartRateValue: input.heartRateValue,
  }) as unknown as AristaContextPayload;

/** Metro / Xcode console — look for `[Zetic advisor]` when tapping Suggestions. */
/** Hoist long strings out of JSON.stringify so Hermes/Metro are less likely to clip debug output. */
const ZETIC_LOG_LONG_STRING_KEYS = new Set(['bodyFull', 'bodyNativeRaw', 'autoDescriptionFull']);

const logZetic = (tag: '[Zetic advisor]', step: string, detail?: unknown) => {
  if (detail === undefined) {
    console.log(`${tag} ${step}`);
    return;
  }
  if (typeof detail === 'string') {
    console.log(`${tag} ${step}`);
    console.log(detail);
    return;
  }
  if (detail !== null && typeof detail === 'object' && !Array.isArray(detail)) {
    const o = { ...(detail as Record<string, unknown>) };
    const longParts: { key: string; value: string }[] = [];
    for (const key of Object.keys(o)) {
      if (ZETIC_LOG_LONG_STRING_KEYS.has(key) || key.endsWith('Full') || key.endsWith('Raw')) {
        const v = o[key];
        if (typeof v === 'string' && v.length > 0) {
          longParts.push({ key, value: v });
          delete o[key];
        }
      }
    }
    try {
      console.log(`${tag} ${step}`, JSON.stringify(o));
    } catch {
      console.log(`${tag} ${step}`, String(detail));
    }
    for (const { key, value } of longParts) {
      console.log(`${tag} ${step}.${key} (len=${value.length})`);
      console.log(value);
    }
    return;
  }
  try {
    console.log(`${tag} ${step}`, JSON.stringify(detail));
  } catch {
    console.log(`${tag} ${step}`, String(detail));
  }
};

const logAdvisor = (step: string, detail?: unknown) => {
  logZetic('[Zetic advisor]', step, detail);
};

const summarizeAdvisorNativePayload = (json: unknown): Record<string, unknown> => {
  if (json == null || typeof json !== 'object') {
    return { shape: typeof json };
  }
  const o = json as Record<string, unknown>;
  const body = o.body;
  const autoDescription = o.autoDescription;
  const base: Record<string, unknown> = {
    keys: Object.keys(o),
    bodyType: typeof body,
    bodyLength: typeof body === 'string' ? body.length : null,
    autoDescriptionType: typeof autoDescription,
    autoDescriptionLength: typeof autoDescription === 'string' ? autoDescription.length : null,
  };
  if (typeof body === 'string') {
    base.bodyNativeRaw = body;
  }
  if (typeof autoDescription === 'string') {
    base.autoDescriptionFull = autoDescription;
  }
  return base;
};

export const generateAdvisorSuggestionBody = async (input: {
  metric: AdvisorSuggestionMetric;
  stressValue: number;
  glucoseValue: number;
  heartRateValue: number;
}): Promise<AdvisorSuggestionResult> => {
  const fallbackBody = ADVISOR_SUGGESTION_FALLBACK_BODY[input.metric];
  logAdvisor('request:start', {
    metric: input.metric,
    stressValue: input.stressValue,
    glucoseValue: input.glucoseValue,
    heartRateValue: input.heartRateValue,
  });

  if (Platform.OS !== 'ios' || !ZeticNativeModule) {
    const err = Platform.OS !== 'ios' ? 'not-ios' : 'native-module-unavailable';
    logAdvisor('request:end', { source: 'fallback', error: err, reason: 'no-native-module' });
    return {
      body: fallbackBody,
      source: 'fallback',
      error: err,
    };
  }

  const native = ZeticNativeModule;
  const advisorPayload = {
    metric: input.metric,
    stressValue: input.stressValue,
    glucoseValue: input.glucoseValue,
    heartRateValue: input.heartRateValue,
  };

  const hasDedicated = typeof native.generateAdvisorSuggestion === 'function';
  const hasLegacyTransport = typeof native.generateProgressMetadata === 'function';

  logAdvisor('native:capabilities', { hasDedicated, hasLegacyTransport });

  if (!hasDedicated && !hasLegacyTransport) {
    logAdvisor('request:end', { source: 'fallback', error: 'native-module-unavailable', reason: 'no-methods' });
    return {
      body: fallbackBody,
      source: 'fallback',
      error: 'native-module-unavailable',
    };
  }

  const loadViaLegacyTransport = async (): Promise<ZeticAdvisorNativeResponse> => {
    logAdvisor('native:call', { transport: 'generateProgressMetadata+advisorContext' });
    const res = await native.generateProgressMetadata({
      caption: '__ZETIC_ADVISOR__',
      context: buildAdvisorContextPayload(input),
      imageHints: [],
    });
    logAdvisor('native:raw-response (legacy transport)', summarizeAdvisorNativePayload(res));
    return res as ZeticAdvisorNativeResponse;
  };

  try {
    let json: ZeticAdvisorNativeResponse;
    let usedTransport: 'dedicated' | 'legacy' = 'legacy';

    if (hasDedicated) {
      try {
        logAdvisor('native:call', { transport: 'generateAdvisorSuggestion' });
        json = await native.generateAdvisorSuggestion(advisorPayload);
        usedTransport = 'dedicated';
        logAdvisor('native:raw-response (dedicated)', summarizeAdvisorNativePayload(json));
      } catch (dedicatedError) {
        const msg = dedicatedError instanceof Error ? dedicatedError.message : String(dedicatedError);
        logAdvisor('native:dedicated threw', msg);
        if (hasLegacyTransport) {
          json = await loadViaLegacyTransport();
          usedTransport = 'legacy';
        } else {
          throw dedicatedError;
        }
      }
    } else {
      json = await loadViaLegacyTransport();
      usedTransport = 'legacy';
    }

    const raw = typeof json.body === 'string' ? json.body : '';
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      logAdvisor('parse:empty-body — using static fallback', {
        usedTransport,
        summary: summarizeAdvisorNativePayload(json),
        hint:
          'If you see autoDescription but no body, the iOS build likely did not include the advisor branch in runGeneration (rebuild dev client).',
      });
      return { body: fallbackBody, source: 'fallback', error: 'empty-native-body' };
    }
    const body = trimmed.length > 400 ? `${trimmed.slice(0, 397)}…` : trimmed;
    logAdvisor('request:end', {
      source: 'native',
      usedTransport,
      bodyChars: body.length,
      bodyFull: body,
    });
    return { body, source: 'native', error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logAdvisor('request:end', { source: 'fallback', error: message, stack: error instanceof Error ? error.stack : undefined });
    return {
      body: fallbackBody,
      source: 'fallback',
      error: message,
    };
  }
};

export type InsightAnalysisInput = {
  /** Matches the Insights trend window chips (7D / 30D / YTD). */
  trendWindow: InsightTrendWindow;
  tab: string;
  title: string;
  summary: string;
  trend: string;
  recommendation: string;
  trendUnit: string;
  trendPoints: number[];
};

export type InsightAnalysisResult = {
  analysis: string;
  source: 'native' | 'fallback';
  error: string | null;
};

const buildInsightAnalysisContext = (input: InsightAnalysisInput): AristaContextPayload =>
  ({
    __zeticInsightAnalysis: true,
    trendWindow: input.trendWindow,
    tab: input.tab,
    title: input.title,
    summary: input.summary,
    trend: input.trend,
    recommendation: input.recommendation,
    trendUnit: input.trendUnit,
    trendPointsCsv: input.trendPoints
      .filter((n) => typeof n === 'number' && Number.isFinite(n))
      .map((n) => n.toFixed(2))
      .join(','),
  }) as unknown as AristaContextPayload;

export const generateInsightAnalysisBody = async (input: InsightAnalysisInput): Promise<InsightAnalysisResult> => {
  const fallback =
    [input.trend, input.recommendation].filter(Boolean).join(' ').trim().slice(0, 420) ||
    'Review this trend alongside your usual routines; talk to a clinician about persistent or worrying changes.';
  if (Platform.OS !== 'ios' || !ZeticNativeModule?.generateProgressMetadata) {
    return {
      analysis: fallback,
      source: 'fallback',
      error: Platform.OS !== 'ios' ? 'not-ios' : 'native-module-unavailable',
    };
  }
  try {
    const json = await ZeticNativeModule.generateProgressMetadata({
      caption: '__ZETIC_INSIGHT_ANALYSIS__',
      context: buildInsightAnalysisContext(input),
      imageHints: [],
    });
    const raw = typeof json.analysis === 'string' ? json.analysis : '';
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      return { analysis: fallback, source: 'fallback', error: 'empty-native-analysis' };
    }
    const analysis = trimmed.length > 450 ? `${trimmed.slice(0, 447)}…` : trimmed;
    return { analysis, source: 'native', error: null };
  } catch (error) {
    return {
      analysis: fallback,
      source: 'fallback',
      error: error instanceof Error ? error.message : String(error),
    };
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
