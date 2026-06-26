import type {
  InsightChartPeriod,
  InsightHeartRateChartData,
  InsightHeartRateDayBucket,
  InsightHeartRateMonthBucket,
  InsightSleepChartData,
  InsightSleepSegment,
} from '../constants/insights';
import type { ChartYRange } from './insightChartAxis';
import {
  canStepHeartRateFuture,
  canStepHeartRatePast,
  getHeartRateDayBucket,
  getHeartRateMonthBuckets,
  getHeartRateWeekBuckets,
  getHeartRateYearBuckets,
  heartRatePeriodRangeLabel,
  startOfLocalDay,
  startOfLocalMonth,
  toLocalDayKey,
  type HeartRateHeroDisplay,
} from './heartRateChartData';

const MS_DAY = 24 * 60 * 60 * 1000;
const SLEEP_DAY_LOOKBACK = 366;

export type SleepStageFilter = 'total' | 'deep' | 'rem' | 'core';

export type SleepSegmentInput = {
  startMs: number;
  endMs: number;
  stage: string;
};

export type { InsightSleepChartData, InsightSleepSegment };

function isAsleepStage(stage: string): boolean {
  const v = stage.toUpperCase();
  if (!v || v === 'INBED' || v === 'AWAKE') {
    return false;
  }
  return v === 'ASLEEP' || v === 'CORE' || v === 'DEEP' || v === 'REM';
}

function matchesSleepFilter(stage: string, filter: SleepStageFilter): boolean {
  const v = stage.toUpperCase();
  if (!isAsleepStage(stage)) {
    return false;
  }
  if (filter === 'total') {
    return true;
  }
  if (filter === 'deep') {
    return v === 'DEEP';
  }
  if (filter === 'rem') {
    return v === 'REM';
  }
  return v === 'CORE' || v === 'ASLEEP';
}

function normalizeSleepStage(stage: string): InsightSleepSegment['stage'] {
  const v = stage.toUpperCase();
  if (v === 'DEEP') {
    return 'DEEP';
  }
  if (v === 'REM') {
    return 'REM';
  }
  return 'CORE';
}

function dayShortLabel(dayStart: Date): string {
  return dayStart.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
}

function monthShortLabel(monthStart: Date): string {
  return monthStart.toLocaleDateString('en-US', { month: 'short' });
}

function monthLetterLabel(monthStart: Date): string {
  return monthShortLabel(monthStart).charAt(0);
}

export function formatSleepHeroHours(hours: number): string {
  if (!Number.isFinite(hours)) {
    return '—';
  }
  if (hours === 0) {
    return '0h';
  }
  if (!(hours > 0)) {
    return '—';
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  if (wholeHours === 0) {
    return `${minutes}m`;
  }
  return `${wholeHours}h ${minutes}m`;
}

export type LastRecordedSleepNight = {
  index: number;
  totalHours: number;
  deepHours: number;
  remHours: number;
  coreHours: number;
  wakeDayLabel: string;
};

/** Most recent wake day with sleep data — all stage values come from this same night. */
export function resolveLastRecordedSleepNight(
  totalTrend: number[],
  deepTrend: number[],
  remTrend: number[],
  coreTrend: number[],
  wakeDayLabels: string[],
  recordedByDay?: boolean[],
): LastRecordedSleepNight | null {
  for (let index = totalTrend.length - 1; index >= 0; index -= 1) {
    const totalHours = totalTrend[index] ?? 0;
    const hasRecord = recordedByDay?.[index] ?? totalHours > 0;
    if (!hasRecord) {
      continue;
    }
    return {
      index,
      totalHours,
      deepHours: deepTrend[index] ?? 0,
      remHours: remTrend[index] ?? 0,
      coreHours: coreTrend[index] ?? 0,
      wakeDayLabel: wakeDayLabels[index] ?? '',
    };
  }
  return null;
}

export function formatSleepTrendHours(hours: number): string {
  if (!Number.isFinite(hours)) {
    return '—';
  }
  if (hours === 0) {
    return '0';
  }
  if (!(hours > 0)) {
    return '—';
  }
  return hours % 1 === 0 ? String(Math.round(hours)) : hours.toFixed(1);
}

function emptySleepDayBucket(dayStartMs: number): InsightHeartRateDayBucket {
  const dayStart = new Date(dayStartMs);
  return {
    dayStartMs,
    shortLabel: dayShortLabel(dayStart),
    min: 0,
    max: 0,
    latest: 0,
    avg: 0,
    samples: [],
  };
}

function emptySleepMonthBucket(monthStartMs: number): InsightHeartRateMonthBucket {
  const monthStart = new Date(monthStartMs);
  return {
    monthStartMs,
    shortLabel: monthShortLabel(monthStart),
    min: 0,
    max: 0,
    avg: 0,
  };
}

export function buildSleepChartData(
  segments: SleepSegmentInput[],
  anchor: Date,
  filter: SleepStageFilter,
): InsightSleepChartData {
  const anchorDay = startOfLocalDay(anchor);
  const dayStarts = Array.from({ length: SLEEP_DAY_LOOKBACK }, (_, i) => {
    const d = new Date(anchorDay);
    d.setDate(anchorDay.getDate() - (SLEEP_DAY_LOOKBACK - 1 - i));
    return d;
  });

  const segmentsByWakeDay = new Map<string, InsightSleepSegment[]>();
  const hoursByWakeDay = new Map<string, number>();

  for (const segment of segments) {
    if (!matchesSleepFilter(segment.stage, filter)) {
      continue;
    }
    const durationMs = segment.endMs - segment.startMs;
    if (!(durationMs > 0)) {
      continue;
    }
    const wakeDayKey = toLocalDayKey(new Date(segment.endMs));
    const hours = durationMs / (1000 * 60 * 60);
    hoursByWakeDay.set(wakeDayKey, (hoursByWakeDay.get(wakeDayKey) ?? 0) + hours);

    if (matchesSleepFilter(segment.stage, filter)) {
      const bucket = segmentsByWakeDay.get(wakeDayKey) ?? [];
      bucket.push({
        startMs: segment.startMs,
        endMs: segment.endMs,
        stage: normalizeSleepStage(segment.stage),
      });
      segmentsByWakeDay.set(wakeDayKey, bucket);
    }
  }

  const days = dayStarts.map((dayStart) => {
    const key = toLocalDayKey(dayStart);
    const hours = hoursByWakeDay.get(key) ?? 0;
    if (!(hours > 0)) {
      return emptySleepDayBucket(dayStart.getTime());
    }
    const rounded = Number(hours.toFixed(2));
    return {
      dayStartMs: dayStart.getTime(),
      shortLabel: dayShortLabel(dayStart),
      min: 0,
      max: rounded,
      latest: rounded,
      avg: rounded,
      samples: [],
    };
  });

  const monthStarts = Array.from({ length: 12 }, (_, i) => {
    const d = startOfLocalMonth(anchorDay);
    d.setMonth(anchorDay.getMonth() - (11 - i));
    return d;
  });

  const months = monthStarts.map((monthStart) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const daysInMonth = days.filter(
      (day) => day.dayStartMs >= monthStart.getTime() && day.dayStartMs < monthEnd.getTime() && day.max > 0,
    );
    if (daysInMonth.length === 0) {
      return emptySleepMonthBucket(monthStart.getTime());
    }
    const values = daysInMonth.map((day) => day.avg);
    const total = values.reduce((sum, value) => sum + value, 0);
    const avg = Number((total / values.length).toFixed(2));
    const max = Math.max(...values);
    return {
      monthStartMs: monthStart.getTime(),
      shortLabel: monthShortLabel(monthStart),
      min: 0,
      max,
      avg,
    };
  });

  const segmentsByDayMs: Record<number, InsightSleepSegment[]> = {};
  for (const day of days) {
    const key = toLocalDayKey(new Date(day.dayStartMs));
    const nightSegments = segmentsByWakeDay.get(key);
    if (nightSegments?.length) {
      segmentsByDayMs[day.dayStartMs] = [...nightSegments].sort((a, b) => a.startMs - b.startMs);
    }
  }

  return { days, months, segmentsByDayMs };
}

export function getSleepNightSegments(chart: InsightSleepChartData, dayStartMs: number): InsightSleepSegment[] {
  return chart.segmentsByDayMs[dayStartMs] ?? [];
}

export function sleepHeroForPeriod(
  period: InsightChartPeriod,
  chart: InsightSleepChartData,
  timeOffset: number,
  nowMs: number = Date.now(),
  todayStartMs: number = startOfLocalDay(new Date(nowMs)).getTime(),
): HeartRateHeroDisplay {
  const unit = '';
  if (period === 'D') {
    const day = getHeartRateDayBucket(chart, timeOffset, todayStartMs);
    return { primary: formatSleepHeroHours(day?.avg ?? 0), context: 'ASLEEP', unit };
  }
  if (period === 'W') {
    const week = getHeartRateWeekBuckets(chart, timeOffset, todayStartMs);
    const values = week.map((day) => day.avg).filter((value) => value > 0);
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { primary: formatSleepHeroHours(avg), context: 'AVERAGE', unit };
  }
  if (period === 'M') {
    const month = getHeartRateMonthBuckets(chart, timeOffset, nowMs);
    const values = month.map((day) => day.avg).filter((value) => value > 0);
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { primary: formatSleepHeroHours(avg), context: 'AVERAGE', unit };
  }
  const year = getHeartRateYearBuckets(chart, nowMs);
  const values = year.map((month) => month.avg).filter((value) => value > 0);
  const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return { primary: formatSleepHeroHours(avg), context: 'AVERAGE', unit };
}

export const SLEEP_Y_RANGE: ChartYRange = { min: 0, max: 12, ticks: [0, 4, 8, 12] };

export function sleepFixedYRange(): ChartYRange {
  return SLEEP_Y_RANGE;
}

export {
  canStepHeartRateFuture as canStepSleepFuture,
  canStepHeartRatePast as canStepSleepPast,
  getHeartRateDayBucket as getSleepDayBucket,
  getHeartRateMonthBuckets as getSleepMonthBuckets,
  getHeartRateWeekBuckets as getSleepWeekBuckets,
  getHeartRateYearBuckets as getSleepYearBuckets,
  heartRatePeriodRangeLabel as sleepPeriodRangeLabel,
  startOfLocalDay,
};
