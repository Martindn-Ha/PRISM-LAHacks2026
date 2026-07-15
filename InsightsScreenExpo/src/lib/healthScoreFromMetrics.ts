export type GlucoseScoreMode = 'general' | 't2d';

export type TimestampedReading = {
  value: number;
  startMs: number;
  endMs: number;
};

export type HealthKitValueSample = {
  value?: number;
  startDate?: string;
  endDate?: string;
};

export type ComponentScores = {
  glucose: number | null;
  sleep: number | null;
  heartRate: number | null;
};

export type OverallHealthScoreResult = {
  /** Daily wellness score on a 0–100 scale; null when no metrics are available. */
  score: number | null;
  components: ComponentScores;
};

const GLUCOSE_RANGE: Record<GlucoseScoreMode, { min: number; max: number }> = {
  general: { min: 70, max: 140 },
  t2d: { min: 70, max: 180 },
};

const SLEEP_TARGET_HOURS = 7;
const DEFAULT_POINT_DURATION_MS = 5 * 60 * 1000;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function percentile(values: number[], p: number): number {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return NaN;
  }
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower]!;
  }
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
}

function readingsWithDuration(readings: TimestampedReading[]): Array<{ value: number; durationMs: number }> {
  if (readings.length === 0) {
    return [];
  }

  const sorted = [...readings].sort((a, b) => a.startMs - b.startMs);
  const weighted: Array<{ value: number; durationMs: number }> = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const reading = sorted[i]!;
    let durationMs = reading.endMs - reading.startMs;

    if (durationMs <= 0) {
      if (i < sorted.length - 1) {
        durationMs = sorted[i + 1]!.startMs - reading.startMs;
      } else if (i > 0) {
        durationMs = reading.startMs - sorted[i - 1]!.startMs;
      } else {
        durationMs = DEFAULT_POINT_DURATION_MS;
      }
    }

    if (durationMs > 0 && Number.isFinite(reading.value) && reading.value > 0) {
      weighted.push({ value: reading.value, durationMs });
    }
  }

  return weighted;
}

function timeWeightedFractionInRange(
  readings: TimestampedReading[],
  isInRange: (value: number) => boolean,
): number | null {
  const weighted = readingsWithDuration(readings);
  if (weighted.length === 0) {
    return null;
  }

  let totalMs = 0;
  let inRangeMs = 0;
  for (const { value, durationMs } of weighted) {
    totalMs += durationMs;
    if (isInRange(value)) {
      inRangeMs += durationMs;
    }
  }

  if (totalMs <= 0) {
    return null;
  }

  return clamp01(inRangeMs / totalMs);
}

/** Map Apple Health samples into timestamped readings for time-weighted scoring. */
export function mapHealthKitSamplesToReadings(samples: HealthKitValueSample[]): TimestampedReading[] {
  return samples
    .map((sample) => {
      const raw = sample.value;
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
      const startMs = sample.startDate
        ? new Date(sample.startDate).getTime()
        : sample.endDate
          ? new Date(sample.endDate).getTime()
          : 0;
      const endMs = sample.endDate ? new Date(sample.endDate).getTime() : startMs;
      if (!startMs || !Number.isFinite(value) || value <= 0) {
        return null;
      }
      return { value, startMs, endMs: Math.max(endMs, startMs) };
    })
    .filter((reading): reading is TimestampedReading => reading != null)
    .sort((a, b) => a.startMs - b.startMs);
}

/** Keep readings whose start timestamp falls on the given local calendar day. */
export function filterReadingsToDay(readings: TimestampedReading[], dayStart: Date): TimestampedReading[] {
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const startMs = dayStart.getTime();
  const endMs = dayEnd.getTime();
  return readings.filter((reading) => reading.startMs >= startMs && reading.startMs < endMs);
}

/** Glucose stability score G in [0, 1], or null when there is no usable glucose data. */
export function calculateGlucoseScore(
  readings: TimestampedReading[],
  mode: GlucoseScoreMode = 'general',
): number | null {
  const { min, max } = GLUCOSE_RANGE[mode];
  return timeWeightedFractionInRange(readings, (value) => value >= min && value <= max);
}

/** Sleep score S in [0, 1], or null when sleep hours are missing. Zero hours scores 0. */
export function calculateSleepScore(sleepHours: number | null): number | null {
  if (sleepHours == null || !Number.isFinite(sleepHours) || sleepHours < 0) {
    return null;
  }
  return clamp01(Math.min(sleepHours / SLEEP_TARGET_HOURS, 1));
}

/** Resting heart rate stability score H in [0, 1], or null when data is insufficient. */
export function calculateHeartRateScore(
  todayRestingHRReadings: TimestampedReading[],
  pastRestingHRReadings: TimestampedReading[],
): number | null {
  const pastValues = pastRestingHRReadings
    .map((reading) => reading.value)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (pastValues.length < 2) {
    return null;
  }

  const q1 = percentile(pastValues, 25);
  const q3 = percentile(pastValues, 75);
  if (!Number.isFinite(q1) || !Number.isFinite(q3)) {
    return null;
  }

  return timeWeightedFractionInRange(todayRestingHRReadings, (value) => value >= q1 && value <= q3);
}

/**
 * Equal average of available component scores (each 0–1), scaled to 0–100.
 * Null components are omitted from the average.
 */
export function calculateOverallHealthScore(
  glucoseScore: number | null,
  sleepScore: number | null,
  heartRateScore: number | null,
): OverallHealthScoreResult {
  const components: ComponentScores = {
    glucose: glucoseScore,
    sleep: sleepScore,
    heartRate: heartRateScore,
  };

  const available = [glucoseScore, sleepScore, heartRateScore].filter(
    (score): score is number => score != null && Number.isFinite(score),
  );

  if (available.length === 0) {
    return { score: null, components };
  }

  const average = available.reduce((sum, score) => sum + score, 0) / available.length;
  const score = Math.round(average * 100 * 10) / 10;
  return { score, components };
}

export type HealthScoreMetricImpact = {
  /** Points this metric adds toward today’s overall score. */
  contribution: number;
  /** Points this metric costs vs a perfect 100 (equal weight). */
  shortfall: number;
};

export type HealthScoreImpacts = {
  glucose: HealthScoreMetricImpact | null;
  sleep: HealthScoreMetricImpact | null;
  heartRate: HealthScoreMetricImpact | null;
};

/** @deprecated Prefer getHealthScoreImpacts; kept for older call sites/tests. */
export type HealthScoreShortfalls = {
  glucose: number | null;
  sleep: number | null;
  heartRate: number | null;
};

/**
 * Points each available metric adds (contribution) and costs vs a perfect 100 (shortfall).
 * Sum of contributions ≈ overall score; sum of shortfalls ≈ 100 − overall.
 */
export function getHealthScoreImpacts(components: ComponentScores): HealthScoreImpacts {
  const keys = ['glucose', 'sleep', 'heartRate'] as const;
  const available = keys.filter((key) => {
    const score = components[key];
    return score != null && Number.isFinite(score);
  });
  const n = available.length;
  const impacts: HealthScoreImpacts = { glucose: null, sleep: null, heartRate: null };
  if (n === 0) {
    return impacts;
  }

  const weight = 100 / n;
  for (const key of available) {
    const score = components[key]!;
    impacts[key] = {
      contribution: Math.round(score * weight),
      shortfall: Math.round((1 - score) * weight),
    };
  }
  return impacts;
}

export function getHealthScoreShortfalls(components: ComponentScores): HealthScoreShortfalls {
  const impacts = getHealthScoreImpacts(components);
  return {
    glucose: impacts.glucose?.shortfall ?? null,
    sleep: impacts.sleep?.shortfall ?? null,
    heartRate: impacts.heartRate?.shortfall ?? null,
  };
}
