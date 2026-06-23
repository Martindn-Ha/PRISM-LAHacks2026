import type { GlucoseSource } from './dexcom/types';
import { formatGlucoseSourceLabel } from './glucoseProviderLogic';

export type InsightMetricFreshness =
  | { kind: 'point-in-time'; atMs: number }
  | { kind: 'today-total' }
  | { kind: 'today-avg' }
  | { kind: 'last-night'; wakeDayLabel: string }
  | { kind: 'last-recorded-day'; dayLabel: string }
  | { kind: 'glucose-latest'; source: GlucoseSource; atMs: number }
  | { kind: 'glucose-today-avg'; source: GlucoseSource };

/** Relative or clock time for a single HealthKit sample. */
export function formatSampleAge(atMs: number, nowMs: number = Date.now()): string {
  if (!atMs) {
    return '';
  }
  const ageMin = Math.max(0, Math.round((nowMs - atMs) / 60_000));
  if (ageMin <= 1) {
    return 'Just now';
  }
  if (ageMin < 60) {
    return `${ageMin}m ago`;
  }

  const sampleDate = new Date(atMs);
  const nowDate = new Date(nowMs);
  if (sampleDate.toDateString() === nowDate.toDateString()) {
    return sampleDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return sampleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatLastSyncedLabel(syncedAtMs: number, nowMs: number = Date.now()): string {
  const age = formatSampleAge(syncedAtMs, nowMs);
  if (!age) {
    return '';
  }
  if (age === 'Just now') {
    return 'Last synced just now';
  }
  return `Last synced ${age}`;
}

export function formatInsightMetricFreshness(
  freshness: InsightMetricFreshness | undefined,
  nowMs: number = Date.now(),
): string {
  if (!freshness) {
    return '';
  }

  switch (freshness.kind) {
    case 'point-in-time': {
      const age = formatSampleAge(freshness.atMs, nowMs);
      return age ? `As of ${age}` : 'Most recent reading';
    }
    case 'today-total':
      return 'Total so far today';
    case 'today-avg':
      return "Today's average so far";
    case 'last-night':
      return freshness.wakeDayLabel
        ? `Last night's sleep · ${freshness.wakeDayLabel}`
        : "Last night's sleep";
    case 'last-recorded-day':
      return freshness.dayLabel ? `Most recent · ${freshness.dayLabel}` : 'Most recent reading';
    case 'glucose-latest': {
      if (freshness.source === 'healthkit' && freshness.atMs) {
        const age = formatSampleAge(freshness.atMs, nowMs);
        return age ? `As of ${age}` : 'From Apple Health';
      }
      const sourceLabel = formatGlucoseSourceLabel(freshness.source, freshness.atMs, nowMs);
      if (sourceLabel === 'No glucose data') {
        return '';
      }
      if (freshness.source === 'dexcom') {
        return `Dexcom · as of ${formatSampleAge(freshness.atMs, nowMs) || 'recently'}`;
      }
      return `As of ${sourceLabel}`;
    }
    case 'glucose-today-avg': {
      if (freshness.source === 'dexcom') {
        return "Today's average so far · Dexcom";
      }
      if (freshness.source === 'healthkit') {
        return "Today's average so far · Apple Health";
      }
      return "Today's average so far";
    }
    default:
      return '';
  }
}

export function latestSampleAtMsOnDay(
  samples: Array<{ startDate?: string; endDate?: string }>,
  dayStartMs: number,
): number {
  let latest = 0;
  samples.forEach((sample) => {
    const ts = sample.startDate
      ? new Date(sample.startDate).getTime()
      : sample.endDate
        ? new Date(sample.endDate).getTime()
        : 0;
    if (ts >= dayStartMs && ts >= latest) {
      latest = ts;
    }
  });
  return latest;
}
