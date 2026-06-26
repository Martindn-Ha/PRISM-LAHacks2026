import type { GlucoseSource } from './dexcom/types';

export const GLUCOSE_STALE_MS = 15 * 60 * 1000;

export type GlucoseSampleLike = {
  valueMgDl: number;
  timestampMs: number;
};

export function formatGlucoseSourceLabel(source: GlucoseSource, latestTimestampMs: number, nowMs: number): string {
  if (source === 'dexcom') {
    if (!latestTimestampMs) {
      return 'Dexcom';
    }
    const ageMin = Math.max(0, Math.round((nowMs - latestTimestampMs) / 60000));
    return ageMin <= 1 ? 'Dexcom · just now' : `Dexcom · ${ageMin}m ago`;
  }
  if (source === 'healthkit') {
    return 'Apple Health';
  }
  return 'No glucose data';
}

export function buildDailyAvgSeries(
  samples: GlucoseSampleLike[],
  bucketDates: Date[],
  toDayKey: (date: Date) => string,
): number[] {
  const byDay = new Map<string, { sum: number; count: number }>();
  const bucketStartMs = bucketDates[0]?.getTime() ?? 0;

  samples.forEach((sample) => {
    if (sample.timestampMs < bucketStartMs) {
      return;
    }
    const key = toDayKey(new Date(sample.timestampMs));
    const prev = byDay.get(key) ?? { sum: 0, count: 0 };
    prev.sum += sample.valueMgDl;
    prev.count += 1;
    byDay.set(key, prev);
  });

  return bucketDates.map((date) => {
    const day = byDay.get(toDayKey(date));
    if (!day || day.count === 0) {
      return 0;
    }
    return Number((day.sum / day.count).toFixed(1));
  });
}

export function isDexcomReadingFresh(latestTimestampMs: number, nowMs: number, staleMs = GLUCOSE_STALE_MS): boolean {
  return latestTimestampMs > 0 && nowMs - latestTimestampMs <= staleMs;
}
