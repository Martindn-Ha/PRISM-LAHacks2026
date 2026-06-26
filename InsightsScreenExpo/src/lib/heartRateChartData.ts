import type {
  InsightChartPeriod,
  InsightHeartRateChartData,
  InsightHeartRateDayBucket,
  InsightHeartRateMonthBucket,
  InsightIntradayPoint,
} from '../constants/insights';
import type { ChartYRange } from './insightChartAxis';
import { formatSampleAge } from './insightMetricFreshness';

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;
const MS_15 = 15 * 60 * 1000;
/** Matches AppScreen HealthKit fetch window (1 year of daily buckets). */
const HEART_RATE_DAY_LOOKBACK = 366;

export function toLocalDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfLocalMonth(value: Date): Date {
  const d = startOfLocalDay(value);
  d.setDate(1);
  return d;
}

/** Apple Health week view — Sunday 00:00 local time. */
export function startOfWeekSunday(value: Date): Date {
  const d = startOfLocalDay(value);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export type HeartRateSampleInput = {
  value: number;
  atMs: number;
};

export type HeartRateHeroDisplay = {
  primary: string;
  context: string;
  unit: string;
};

export type HeartRateHourWindow = {
  windowStartMs: number;
  windowEndMs: number;
  samples: InsightIntradayPoint[];
};

function dayShortLabel(dayStart: Date): string {
  return dayStart.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
}

function monthShortLabel(monthStart: Date): string {
  return monthStart.toLocaleDateString('en-US', { month: 'short' });
}

function monthLetterLabel(monthStart: Date): string {
  return monthShortLabel(monthStart).charAt(0);
}

function summarizeValues(values: number[]): { min: number; max: number; latest: number; avg: number } {
  const finite = values.filter((v) => Number.isFinite(v) && v > 0);
  if (finite.length === 0) {
    return { min: 0, max: 0, latest: 0, avg: 0 };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const latest = finite[finite.length - 1]!;
  const avg = Math.round(finite.reduce((a, b) => a + b, 0) / finite.length);
  return { min: Math.round(min), max: Math.round(max), latest: Math.round(latest), avg };
}

function rangeHeroFromValues(values: number[]): HeartRateHeroDisplay {
  const unit = 'BPM';
  const finite = values.filter((v) => v > 0);
  if (finite.length === 0) {
    return { primary: '—', context: 'RANGE', unit };
  }
  if (finite.length === 1) {
    return { primary: String(finite[0]), context: 'RANGE', unit };
  }
  return {
    primary: `${Math.min(...finite)}–${Math.max(...finite)}`,
    context: 'RANGE',
    unit,
  };
}

export function buildHeartRateChartData(samples: HeartRateSampleInput[], anchor: Date): InsightHeartRateChartData {
  const anchorDay = startOfLocalDay(anchor);
  const dayCount = HEART_RATE_DAY_LOOKBACK;
  const monthCount = 12;

  const dayStarts = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(anchorDay);
    d.setDate(anchorDay.getDate() - (dayCount - 1 - i));
    return d;
  });

  const monthStarts = Array.from({ length: monthCount }, (_, i) => {
    const d = startOfLocalMonth(anchorDay);
    d.setMonth(anchorDay.getMonth() - (monthCount - 1 - i));
    return d;
  });

  const byDay = new Map<string, InsightIntradayPoint[]>();
  for (const sample of samples) {
    if (!(sample.value > 0) || !Number.isFinite(sample.atMs)) {
      continue;
    }
    const key = toLocalDayKey(new Date(sample.atMs));
    const bucket = byDay.get(key) ?? [];
    bucket.push({ value: Math.round(sample.value), atMs: sample.atMs });
    byDay.set(key, bucket);
  }

  for (const [key, pts] of byDay.entries()) {
    pts.sort((a, b) => a.atMs - b.atMs);
    byDay.set(key, pts);
  }

  const days = dayStarts.map((dayStart) => {
    const pts = byDay.get(toLocalDayKey(dayStart)) ?? [];
    const values = pts.map((p) => p.value);
    const stats = summarizeValues(values);
    return {
      dayStartMs: dayStart.getTime(),
      shortLabel: dayShortLabel(dayStart),
      min: stats.min,
      max: stats.max,
      latest: stats.latest,
      avg: stats.avg,
      samples: pts,
    };
  });

  const months = monthStarts.map((monthStart) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const values: number[] = [];
    for (const sample of samples) {
      if (!(sample.value > 0)) {
        continue;
      }
      if (sample.atMs >= monthStart.getTime() && sample.atMs < monthEnd.getTime()) {
        values.push(Math.round(sample.value));
      }
    }
    const stats = summarizeValues(values);
    return {
      monthStartMs: monthStart.getTime(),
      shortLabel: monthShortLabel(monthStart),
      min: stats.min,
      max: stats.max,
      avg: stats.avg,
    };
  });

  return { days, months };
}

export function todayDayIndex(chart: InsightHeartRateChartData, todayStartMs: number): number {
  const idx = chart.days.findIndex((d) => d.dayStartMs === todayStartMs);
  return idx >= 0 ? idx : chart.days.length - 1;
}

export function defaultHeartRateDayIndex(chart: InsightHeartRateChartData, todayStartMs: number): number {
  const todayIdx = todayDayIndex(chart, todayStartMs);
  if (chart.days[todayIdx]?.samples.length) {
    return todayIdx;
  }
  for (let i = chart.days.length - 1; i >= 0; i -= 1) {
    if (chart.days[i]!.samples.length > 0) {
      return i;
    }
  }
  return todayIdx;
}

/** End of the clock hour containing `windowEndMs` (e.g. 11:37 PM → midnight). */
export function alignHeartRateHourWindowEnd(windowEndMs: number): number {
  const d = new Date(windowEndMs);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.getTime();
}

/** Hour window ending at the next clock hour after `windowEndMs` (Apple “H”). */
export function getHeartRateHourWindow(chart: InsightHeartRateChartData, windowEndMs: number): HeartRateHourWindow {
  const alignedEnd = alignHeartRateHourWindowEnd(windowEndMs);
  const windowStartMs = alignedEnd - MS_HOUR;
  const samples = chart.days
    .flatMap((day) => day.samples)
    .filter((sample) => sample.atMs >= windowStartMs && sample.atMs <= alignedEnd)
    .sort((a, b) => a.atMs - b.atMs);
  return { windowStartMs, windowEndMs: alignedEnd, samples };
}

/** Vertical grid lines for each 15-minute mark in the hour window. */
export function heartRateHourAxisTicks(windowStartMs: number): number[] {
  return [0, 1, 2, 3, 4].map((i) => windowStartMs + i * MS_15);
}

/** X-axis labels omit the trailing hour edge — it matches the next swipe page's leading edge. */
export function heartRateHourAxisLabelTicks(windowStartMs: number): number[] {
  return heartRateHourAxisTicks(windowStartMs).slice(0, -1);
}

export function getHeartRateDayBucket(
  chart: InsightHeartRateChartData,
  timeOffset: number,
  todayStartMs: number,
): InsightHeartRateDayBucket | undefined {
  const todayIdx = todayDayIndex(chart, todayStartMs);
  const dayIndex = todayIdx - timeOffset;
  if (dayIndex < 0 || dayIndex >= chart.days.length) {
    return undefined;
  }
  return chart.days[dayIndex];
}

function emptyHeartRateDayBucket(dayStartMs: number): InsightHeartRateDayBucket {
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

export function getHeartRateWeekBuckets(
  chart: InsightHeartRateChartData,
  timeOffset: number,
  todayStartMs: number,
): InsightHeartRateDayBucket[] {
  const weekSunday = startOfWeekSunday(new Date(todayStartMs));
  weekSunday.setDate(weekSunday.getDate() - timeOffset * 7);

  return Array.from({ length: 7 }, (_, dayIndex) => {
    const dayStart = new Date(weekSunday);
    dayStart.setDate(weekSunday.getDate() + dayIndex);
    const dayStartMs = dayStart.getTime();
    return chart.days.find((bucket) => bucket.dayStartMs === dayStartMs) ?? emptyHeartRateDayBucket(dayStartMs);
  });
}

export function getHeartRateMonthBuckets(
  chart: InsightHeartRateChartData,
  timeOffset: number,
  nowMs: number,
): InsightHeartRateDayBucket[] {
  const monthStart = startOfLocalMonth(new Date(nowMs));
  monthStart.setMonth(monthStart.getMonth() - timeOffset);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, dayIndex) => {
    const dayStart = new Date(monthStart);
    dayStart.setDate(monthStart.getDate() + dayIndex);
    const dayStartMs = dayStart.getTime();
    return chart.days.find((bucket) => bucket.dayStartMs === dayStartMs) ?? emptyHeartRateDayBucket(dayStartMs);
  });
}

function emptyHeartRateMonthBucket(monthStartMs: number): InsightHeartRateMonthBucket {
  const monthStart = new Date(monthStartMs);
  return {
    monthStartMs,
    shortLabel: monthLetterLabel(monthStart),
    min: 0,
    max: 0,
    avg: 0,
  };
}

function aggregateHeartRateMonthFromDays(
  chart: InsightHeartRateChartData,
  monthStartMs: number,
  monthEndMs: number,
): InsightHeartRateMonthBucket {
  const withData = chart.days.filter(
    (day) => day.dayStartMs >= monthStartMs && day.dayStartMs < monthEndMs && day.max > 0,
  );
  if (withData.length === 0) {
    return emptyHeartRateMonthBucket(monthStartMs);
  }
  return {
    monthStartMs,
    shortLabel: monthLetterLabel(new Date(monthStartMs)),
    min: Math.min(...withData.map((day) => day.min)),
    max: Math.max(...withData.map((day) => day.max)),
    avg: Math.round(withData.reduce((sum, day) => sum + day.avg, 0) / withData.length),
  };
}

export function getHeartRateYearBuckets(
  chart: InsightHeartRateChartData,
  nowMs: number = Date.now(),
): InsightHeartRateMonthBucket[] {
  const year = new Date(nowMs).getFullYear();
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 1);
    const monthStartMs = monthStart.getTime();
    const fromChartMonth = chart.months.find((bucket) => bucket.monthStartMs === monthStartMs);
    if (fromChartMonth?.max > 0) {
      return { ...fromChartMonth, shortLabel: monthLetterLabel(monthStart) };
    }
    return aggregateHeartRateMonthFromDays(chart, monthStartMs, monthEnd.getTime());
  });
}

function latestHeroFromSamples(samples: InsightIntradayPoint[]): HeartRateHeroDisplay {
  const unit = 'BPM';
  const finite = samples.filter((sample) => sample.value > 0);
  if (finite.length === 0) {
    return { primary: '—', context: 'LATEST', unit };
  }
  const last = finite[finite.length - 1]!;
  const age = formatSampleAge(last.atMs);
  return {
    primary: String(last.value),
    context: age ? `As of ${age}` : 'MOST RECENT',
    unit,
  };
}

function rangeHeroFromSamples(samples: InsightIntradayPoint[]): HeartRateHeroDisplay {
  const unit = 'BPM';
  const finite = samples.filter((sample) => sample.value > 0);
  if (finite.length === 0) {
    return { primary: '—', context: 'RANGE', unit };
  }
  if (finite.length === 1) {
    return latestHeroFromSamples(finite);
  }
  const values = finite.map((sample) => sample.value);
  return {
    primary: `${Math.min(...values)}–${Math.max(...values)}`,
    context: 'RANGE',
    unit,
  };
}

function latestHeroFromValues(values: number[]): HeartRateHeroDisplay {
  const unit = 'BPM';
  const finite = values.filter((v) => v > 0);
  if (finite.length === 0) {
    return { primary: '—', context: 'LATEST', unit };
  }
  return { primary: String(finite[finite.length - 1]), context: 'LATEST', unit };
}

function averageHeroFromValues(values: number[]): HeartRateHeroDisplay {
  const unit = 'BPM';
  const finite = values.filter((v) => v > 0);
  if (finite.length === 0) {
    return { primary: '—', context: 'AVERAGE', unit };
  }
  const avg = Math.round(finite.reduce((sum, value) => sum + value, 0) / finite.length);
  return { primary: String(avg), context: 'AVERAGE', unit };
}

export type HeartRateHeroMode = 'range' | 'resting';

export function heartRateHeroForPeriod(
  period: InsightChartPeriod,
  chart: InsightHeartRateChartData,
  timeOffset: number,
  nowMs: number = Date.now(),
  todayStartMs: number = startOfLocalDay(new Date(nowMs)).getTime(),
  mode: HeartRateHeroMode = 'range',
): HeartRateHeroDisplay {
  if (mode === 'resting') {
    if (period === 'H') {
      const windowEndMs = nowMs - timeOffset * MS_HOUR;
      const samples = getHeartRateHourWindow(chart, windowEndMs).samples;
      return latestHeroFromSamples(samples);
    }
    if (period === 'D') {
      const day = getHeartRateDayBucket(chart, timeOffset, todayStartMs);
      return latestHeroFromSamples(day?.samples ?? []);
    }
    if (period === 'W') {
      const week = getHeartRateWeekBuckets(chart, timeOffset, todayStartMs);
      return averageHeroFromValues(week.map((day) => day.avg));
    }
    if (period === 'M') {
      const month = getHeartRateMonthBuckets(chart, timeOffset, nowMs);
      return averageHeroFromValues(month.map((day) => day.avg));
    }
    const year = getHeartRateYearBuckets(chart, nowMs);
    return averageHeroFromValues(year.map((month) => month.avg));
  }

  if (period === 'H') {
    const windowEndMs = nowMs - timeOffset * MS_HOUR;
    return rangeHeroFromSamples(getHeartRateHourWindow(chart, windowEndMs).samples);
  }

  if (period === 'D') {
    const day = getHeartRateDayBucket(chart, timeOffset, todayStartMs);
    return rangeHeroFromSamples(day?.samples ?? []);
  }

  if (period === 'W') {
    const week = getHeartRateWeekBuckets(chart, timeOffset, todayStartMs);
    return rangeHeroFromValues(week.flatMap((d) => (d.max > 0 ? [d.min, d.max] : [])));
  }

  if (period === 'M') {
    const month = getHeartRateMonthBuckets(chart, timeOffset, nowMs);
    return rangeHeroFromValues(month.flatMap((d) => (d.max > 0 ? [d.min, d.max] : [])));
  }

  const year = getHeartRateYearBuckets(chart, nowMs);
  return rangeHeroFromValues(year.flatMap((m) => (m.max > 0 ? [m.min, m.max] : [])));
}

function formatClockShort(atMs: number): string {
  return new Date(atMs)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '');
}

export function heartRatePeriodRangeLabel(
  period: InsightChartPeriod,
  chart: InsightHeartRateChartData,
  timeOffset: number,
  nowMs: number = Date.now(),
  todayStartMs: number = startOfLocalDay(new Date(nowMs)).getTime(),
): string {
  if (period === 'H') {
    const { windowStartMs, windowEndMs: alignedEnd } = getHeartRateHourWindow(
      chart,
      nowMs - timeOffset * MS_HOUR,
    );
    return `${formatClockShort(windowStartMs)} – ${formatClockShort(alignedEnd)}`;
  }

  if (period === 'D') {
    const day = getHeartRateDayBucket(chart, timeOffset, todayStartMs);
    if (!day) {
      return '—';
    }
    if (day.dayStartMs === todayStartMs) {
      return 'Today';
    }
    if (day.dayStartMs === todayStartMs - MS_DAY) {
      return 'Yesterday';
    }
    return new Date(day.dayStartMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (period === 'W') {
    const week = getHeartRateWeekBuckets(chart, timeOffset, todayStartMs);
    const first = week[0]!;
    const last = week[week.length - 1]!;
    const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(first.dayStartMs)} – ${fmt(last.dayStartMs)}`;
  }

  if (period === 'M') {
    const monthStart = startOfLocalMonth(new Date(nowMs));
    monthStart.setMonth(monthStart.getMonth() - timeOffset);
    return monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (period === 'Y') {
    return String(new Date(nowMs).getFullYear());
  }

  return '—';
}

export function canStepHeartRatePast(
  period: InsightChartPeriod,
  chart: InsightHeartRateChartData,
  timeOffset: number,
  nowMs: number = Date.now(),
  todayStartMs: number = startOfLocalDay(new Date(nowMs)).getTime(),
): boolean {
  if (period === 'Y') {
    return false;
  }

  const nextOffset = timeOffset + 1;

  if (period === 'H') {
    const earliestDay = chart.days[0];
    if (!earliestDay) {
      return false;
    }
    const nextEnd = nowMs - nextOffset * MS_HOUR;
    const alignedEnd = alignHeartRateHourWindowEnd(nextEnd);
    return alignedEnd - MS_HOUR >= earliestDay.dayStartMs;
  }

  if (period === 'D') {
    return todayDayIndex(chart, todayStartMs) - nextOffset >= 0;
  }

  if (period === 'W') {
    const earliestDay = chart.days[0];
    if (!earliestDay) {
      return false;
    }
    const nextWeekSunday = startOfWeekSunday(new Date(todayStartMs));
    nextWeekSunday.setDate(nextWeekSunday.getDate() - nextOffset * 7);
    const nextWeekSaturdayMs = nextWeekSunday.getTime() + 6 * MS_DAY;
    return nextWeekSaturdayMs >= earliestDay.dayStartMs;
  }

  if (period === 'M') {
    const earliestDay = chart.days[0];
    if (!earliestDay) {
      return false;
    }
    const nextMonthStart = startOfLocalMonth(new Date(nowMs));
    nextMonthStart.setMonth(nextMonthStart.getMonth() - nextOffset);
    const nextMonthEnd = new Date(nextMonthStart);
    nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
    return nextMonthEnd.getTime() > earliestDay.dayStartMs;
  }

  return false;
}

export function canStepHeartRateFuture(period: InsightChartPeriod, timeOffset: number): boolean {
  if (period === 'Y') {
    return false;
  }
  return timeOffset > 0;
}

/** Apple Health heart-rate detail charts use a fixed 0–150 BPM y-axis. */
export const HEART_RATE_Y_RANGE: ChartYRange = { min: 0, max: 150, ticks: [0, 50, 100, 150] };

/** Resting heart rate detail charts use a tighter 40–80 BPM y-axis. */
export const RESTING_HEART_RATE_Y_RANGE: ChartYRange = { min: 40, max: 80, ticks: [40, 50, 60, 70, 80] };

/** Stable y-axis — always 0–150 BPM like Apple Health. */
export function heartRateFixedYRange(
  _period?: InsightChartPeriod,
  _chart?: InsightHeartRateChartData,
  mode: HeartRateHeroMode = 'range',
): ChartYRange {
  return mode === 'resting' ? RESTING_HEART_RATE_Y_RANGE : HEART_RATE_Y_RANGE;
}

/** @deprecated Use heartRateFixedYRange */
export function heartRateSharedYRange(
  period: InsightChartPeriod,
  chart: InsightHeartRateChartData,
  _timeOffset?: number,
  _nowMs?: number,
  _todayStartMs?: number,
): ChartYRange {
  return heartRateFixedYRange(period, chart);
}

export type { ChartYRange };

/** @deprecated Use heartRatePeriodRangeLabel */
export function heartRateDayNavLabel(dayStartMs: number, todayStartMs: number): string {
  if (dayStartMs === todayStartMs) {
    return 'Today';
  }
  if (dayStartMs === todayStartMs - MS_DAY) {
    return 'Yesterday';
  }
  return new Date(dayStartMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
