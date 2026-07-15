import type { HealthKitApi } from './appleHealthKit';
import { getDexcomCredentials } from './dexcom/dexcomConnection';
import { fetchDexcomGlucoseSamples } from './dexcom/dexcomShareClient';
import type { GlucoseSample, GlucoseSource } from './dexcom/types';
import {
  buildDailyAvgSeries,
  formatGlucoseSourceLabel,
  isDexcomReadingFresh,
} from './glucoseProviderLogic';
import {
  mapHealthKitSamplesToReadings,
  type HealthKitValueSample,
  type TimestampedReading,
} from './healthScoreFromMetrics';

export { GLUCOSE_STALE_MS, buildDailyAvgSeries, formatGlucoseSourceLabel, isDexcomReadingFresh } from './glucoseProviderLogic';

const DEXCOM_POINT_MS = 5 * 60 * 1000;

export type GlucoseLoadResult = {
  source: GlucoseSource;
  sourceLabel: string;
  currentValue: number;
  trendPoints: number[];
  rawReadings: TimestampedReading[];
  trendArrow?: string;
  latestTimestampMs: number;
};

export function mapGlucoseSamplesToReadings(samples: GlucoseSample[]): TimestampedReading[] {
  return samples.map((sample) => ({
    value: sample.valueMgDl,
    startMs: sample.timestampMs,
    endMs: sample.timestampMs + DEXCOM_POINT_MS,
  }));
}

function loadHealthKitGlucoseSamples(
  healthKit: HealthKitApi,
  startDate: string,
  endDate: string,
): Promise<HealthKitValueSample[]> {
  return new Promise((resolve) => {
    if (!healthKit.getBloodGlucoseSamples) {
      resolve([]);
      return;
    }
    healthKit.getBloodGlucoseSamples(
      {
        startDate,
        endDate,
        unit: healthKit.Constants?.Units?.mgPerdL ?? 'mgPerdL',
      },
      (_error, result) => {
        resolve(result ?? []);
      },
    );
  });
}

function buildHealthKitDailySeries(
  samples: HealthKitValueSample[],
  bucketDates: Date[],
  toDayKey: (date: Date) => string,
): number[] {
  const byDay = new Map<string, { sum: number; count: number }>();
  const bucketStartMs = bucketDates[0]?.getTime() ?? 0;

  samples.forEach((sample) => {
    const raw = sample.value ?? 0;
    if (!Number.isFinite(raw) || raw <= 0) {
      return;
    }
    const ts = sample.startDate
      ? new Date(sample.startDate).getTime()
      : sample.endDate
        ? new Date(sample.endDate).getTime()
        : 0;
    if (!ts || ts < bucketStartMs) {
      return;
    }
    const key = toDayKey(new Date(ts));
    const prev = byDay.get(key) ?? { sum: 0, count: 0 };
    prev.sum += raw;
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

function resultFromDexcom(samples: GlucoseSample[], bucketDates: Date[], toDayKey: (date: Date) => string, nowMs: number): GlucoseLoadResult {
  const latest = samples[samples.length - 1];
  const latestTimestampMs = latest?.timestampMs ?? 0;
  const trendPoints = buildDailyAvgSeries(samples, bucketDates, toDayKey);
  const todayBucketIndex = bucketDates.length - 1;
  const todayAvg = trendPoints[todayBucketIndex] ?? 0;

  return {
    source: 'dexcom',
    sourceLabel: formatGlucoseSourceLabel('dexcom', latestTimestampMs, nowMs),
    currentValue: latest?.valueMgDl ?? Math.round(todayAvg),
    trendPoints,
    rawReadings: mapGlucoseSamplesToReadings(samples),
    trendArrow: latest?.trendArrow,
    latestTimestampMs,
  };
}

function resultFromHealthKit(
  samples: HealthKitValueSample[],
  bucketDates: Date[],
  toDayKey: (date: Date) => string,
  nowMs: number,
): GlucoseLoadResult {
  const trendPoints = buildHealthKitDailySeries(samples, bucketDates, toDayKey);
  const todayBucketIndex = bucketDates.length - 1;
  const todayAvg = trendPoints[todayBucketIndex] ?? 0;
  const rawReadings = mapHealthKitSamplesToReadings(samples);
  const latestReading = rawReadings.length > 0 ? rawReadings[rawReadings.length - 1]! : null;
  const latestTimestampMs = latestReading?.startMs ?? 0;
  const latestValue = latestReading != null && latestReading.value > 0 ? latestReading.value : 0;

  return {
    source: samples.length > 0 ? 'healthkit' : 'none',
    sourceLabel: formatGlucoseSourceLabel(samples.length > 0 ? 'healthkit' : 'none', latestTimestampMs, nowMs),
    currentValue: latestValue > 0 ? Math.round(latestValue) : Math.round(todayAvg),
    trendPoints,
    rawReadings,
    latestTimestampMs,
  };
}

export async function loadGlucoseData(options: {
  bucketDates: Date[];
  now: Date;
  toDayKey: (date: Date) => string;
  healthKit: HealthKitApi;
}): Promise<GlucoseLoadResult> {
  const { bucketDates, now, toDayKey, healthKit } = options;
  const nowMs = now.getTime();
  const sampleStart = new Date(bucketDates[0] ?? now);
  sampleStart.setDate(sampleStart.getDate() - 14);
  const startDate = sampleStart.toISOString();
  const endDate = now.toISOString();
  const minutes = Math.ceil((nowMs - sampleStart.getTime()) / 60000);

  let dexcomSamples: GlucoseSample[] = [];
  const credentials = await getDexcomCredentials();
  if (credentials) {
    try {
      dexcomSamples = await fetchDexcomGlucoseSamples(credentials, minutes, 288);
      const latestTimestampMs = dexcomSamples[dexcomSamples.length - 1]?.timestampMs ?? 0;
      if (dexcomSamples.length > 0 && isDexcomReadingFresh(latestTimestampMs, nowMs)) {
        return resultFromDexcom(dexcomSamples, bucketDates, toDayKey, nowMs);
      }
    } catch {
      // Fall through to HealthKit / stale Dexcom.
    }
  }

  const healthKitSamples = await loadHealthKitGlucoseSamples(healthKit, startDate, endDate);
  const fromHealthKit = resultFromHealthKit(healthKitSamples, bucketDates, toDayKey, nowMs);
  if (fromHealthKit.currentValue > 0 || fromHealthKit.rawReadings.length > 0) {
    return fromHealthKit;
  }

  // Prefer last known Dexcom reading over a blank card when Share data is stale.
  if (dexcomSamples.length > 0) {
    return resultFromDexcom(dexcomSamples, bucketDates, toDayKey, nowMs);
  }

  return fromHealthKit;
}
