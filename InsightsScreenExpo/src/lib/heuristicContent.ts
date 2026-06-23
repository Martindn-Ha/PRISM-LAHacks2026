import type { AristaContextPayload } from '../types/experience';

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

export type ProgressPostHeuristicResult = {
  autoDescription: string;
  autoTags: string[];
  useEventContext: boolean;
};

/** Derive display description + tags from caption, optional Arista context, and filename hints. */
export const buildProgressPostHeuristics = (input: {
  caption: string;
  aristaContext: AristaContextPayload | null;
  imageHints: string[];
}): ProgressPostHeuristicResult => {
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
    useEventContext,
  };
};

export type InsightAnalysisInput = {
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
  source: 'fallback';
  error: null;
};

/** Short analysis blurb from existing insight copy (no external model). */
export const generateInsightAnalysisBody = async (input: InsightAnalysisInput): Promise<InsightAnalysisResult> => {
  const fallback =
    [input.trend, input.recommendation].filter(Boolean).join(' ').trim().slice(0, 420) ||
    'Review this trend alongside your usual routines; talk to a clinician about persistent or worrying changes.';
  return {
    analysis: fallback,
    source: 'fallback',
    error: null,
  };
};
