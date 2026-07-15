import JSZip from 'jszip';
import type { MetricGoal } from '../constants/goals';
import type { MedicationSchedule } from '../constants/medications';
import type { IpipAnswerValue } from '../ipip/answerScale';
import type { IpipScoreResults } from '../ipip/scoring';
import {
  filterSchedulesInDateRange,
  serializeMedicationSchedulesForExport,
  type MedicationScheduleExportRow,
} from './medicationChecklist';
import {
  buildGoalProgressExportRows,
  serializeGoalsForExport,
  type GoalProgressExportRow,
  type PrismGoalExportRow,
} from './goalProgress';
import type { HealthCorrelatedEvent } from './healthEventCorrelator';
import {
  filterLocationLogForExport,
  type LocationPoint,
} from './locationLog';
import {
  filterUiInteractionsForExport,
  type UiInteractionEvent,
} from './uiInteractionStorage';

export const EXPORT_SCHEMA_VERSION = 2;

export type ExportDateRangePreset = 'last30days' | 'last12months' | 'allTime' | 'custom';

export type ExportDateRange = {
  start: Date;
  end: Date;
};

export type ExportCustomDateRange = {
  start: Date;
  end: Date;
};

export type ExportFormat = 'json' | 'csv_zip';

export type ExportProgress = {
  metricKey: string;
  metricLabel: string;
  index: number;
  total: number;
};

export type ExportRow = {
  value: number | string;
  unit?: string;
  startDate: string;
  endDate: string;
};

export type ExportWorkoutRow = {
  activityName: string;
  start: string;
  end: string;
  duration: number;
  calories?: number;
  distance?: number;
};

export type HealthKitWorkoutSample = {
  activityId?: number;
  activityName?: string;
  calories?: number;
  tracked?: boolean;
  distance?: number;
  start?: string;
  end?: string;
  duration?: number;
};

export type HealthKitExportApi = {
  Constants?: {
    Units?: Record<string, string>;
  };
  getHeartRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getRestingHeartRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getHeartRateVariabilitySamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getWalkingHeartRateAverage?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getRespiratoryRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getOxygenSaturationSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getStepCount?: (options: unknown, callback: (error?: string, result?: { value?: number }) => void) => void;
  getDailyDistanceWalkingRunningSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getDailyFlightsClimbedSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getSleepSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: string; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getActiveEnergyBurned?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBasalEnergyBurned?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAppleExerciseTime?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAppleStandTime?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBodyTemperatureSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getVo2MaxSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBloodGlucoseSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAnchoredWorkouts?: (
    options: unknown,
    callback: (error?: string, result?: { anchor?: string; data?: HealthKitWorkoutSample[] }) => void,
  ) => void;
};

export type PrismIpipExport = {
  answers: Record<number, IpipAnswerValue>;
  results: IpipScoreResults | null;
  isComplete: boolean;
};

export type PrismGoalsExport = {
  definitions: PrismGoalExportRow[];
  progress: GoalProgressExportRow[];
};

export type PrismMedicationsExport = {
  schedules: MedicationScheduleExportRow[];
};

export type HealthEventExportRow = {
  id: string;
  loggedAt: string;
  glucoseAt: string;
  value: number;
  unit: string;
  direction: string;
  level: string;
  source: string;
  message: string;
};

export type PrismHealthEventsExport = {
  events: HealthEventExportRow[];
};

export type LocationExportRow = {
  at: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
};

export type PrismLocationExport = {
  points: LocationExportRow[];
};

export type UiInteractionExportRow = {
  id: string;
  at: string;
  screen: string;
  gesture: string;
  target: string;
  direction: string;
};

export type PrismUiInteractionsExport = {
  events: UiInteractionExportRow[];
};

export type PrismExport = {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  dateRange: { start: string; end: string };
  health: Record<string, ExportRow[] | ExportWorkoutRow[]>;
  unavailableMetrics: string[];
  prism: {
    ipip: PrismIpipExport;
    goals: PrismGoalsExport;
    medications: PrismMedicationsExport;
    healthEvents: PrismHealthEventsExport;
    location: PrismLocationExport;
    uiInteractions: PrismUiInteractionsExport;
  };
  notes: {
    stepsAreDailyTotals: boolean;
  };
};

type SampleGetter = (
  options: unknown,
  callback: (
    error?: string,
    result?: Array<{ value?: number | string; startDate?: string; endDate?: string }>,
  ) => void,
) => void;

type MetricDefinition = {
  key: string;
  label: string;
  fetch: (range: ExportDateRange) => Promise<ExportRow[] | ExportWorkoutRow[]>;
  isAvailable: () => boolean;
};

function toLocalDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function eachLocalDayInRange(range: ExportDateRange): Date[] {
  const days: Date[] = [];
  const cursor = startOfLocalDay(range.start);
  const end = startOfLocalDay(range.end);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function formatExportDisplayDate(value: Date): string {
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function createDefaultCustomExportRange(now = new Date()): ExportCustomDateRange {
  const end = new Date(now);
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - 29);
  return { start, end };
}

export function normalizeCustomExportDateRange(start: Date, end: Date, now = new Date()): ExportDateRange {
  const normalizedStart = startOfLocalDay(start);
  let normalizedEnd: Date;

  if (toLocalDayKey(end) === toLocalDayKey(now)) {
    normalizedEnd = new Date(now);
  } else {
    normalizedEnd = startOfLocalDay(end);
    normalizedEnd.setHours(23, 59, 59, 999);
  }

  if (normalizedEnd.getTime() > now.getTime()) {
    normalizedEnd = new Date(now);
  }

  if (normalizedStart.getTime() > normalizedEnd.getTime()) {
    throw new Error('Start date must be on or before end date.');
  }

  return { start: normalizedStart, end: normalizedEnd };
}

export function resolveExportDateRange(
  preset: ExportDateRangePreset,
  now = new Date(),
  custom?: ExportCustomDateRange,
): ExportDateRange {
  if (preset === 'custom') {
    if (!custom) {
      throw new Error('Custom export range requires start and end dates.');
    }
    return normalizeCustomExportDateRange(custom.start, custom.end, now);
  }

  const end = new Date(now);
  const start = startOfLocalDay(now);

  if (preset === 'last30days') {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }

  if (preset === 'last12months') {
    start.setFullYear(start.getFullYear() - 1);
    return { start, end };
  }

  start.setFullYear(start.getFullYear() - 10);
  return { start, end };
}

function promisifySamples(
  getter: SampleGetter | undefined,
  options: Record<string, unknown>,
): Promise<Array<{ value?: number | string; startDate?: string; endDate?: string }>> {
  if (!getter) {
    return Promise.resolve([]);
  }
  return new Promise((resolve) => {
    getter(options, (_error, result) => {
      resolve(result ?? []);
    });
  });
}

function mapNumericSamples(
  samples: Array<{ value?: number | string; startDate?: string; endDate?: string }>,
  unit: string,
  valueMapper?: (value: number) => number,
): ExportRow[] {
  return samples
    .map((sample) => {
      const raw = typeof sample.value === 'number' ? sample.value : Number(sample.value);
      if (!Number.isFinite(raw)) {
        return null;
      }
      const mapped = valueMapper ? valueMapper(raw) : raw;
      const startDate = sample.startDate ?? sample.endDate ?? '';
      const endDate = sample.endDate ?? sample.startDate ?? startDate;
      if (!startDate) {
        return null;
      }
      return {
        value: mapped,
        unit,
        startDate,
        endDate,
      };
    })
    .filter((row): row is ExportRow => row != null);
}

function mapStringValueSamples(
  samples: Array<{ value?: number | string; startDate?: string; endDate?: string }>,
): ExportRow[] {
  return samples
    .map((sample) => {
      const value = sample.value;
      if (value == null || value === '') {
        return null;
      }
      const startDate = sample.startDate ?? '';
      const endDate = sample.endDate ?? startDate;
      if (!startDate) {
        return null;
      }
      return {
        value: String(value),
        startDate,
        endDate,
      };
    })
    .filter((row): row is ExportRow => row != null);
}

async function fetchStepDailyTotals(kit: HealthKitExportApi, range: ExportDateRange): Promise<ExportRow[]> {
  const getter = kit.getStepCount;
  if (!getter) {
    return [];
  }

  const days = eachLocalDayInRange(range);
  const now = range.end;
  const rows: ExportRow[] = [];

  for (const day of days) {
    const rangeStart = startOfLocalDay(day);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    const isToday = toLocalDayKey(day) === toLocalDayKey(now);

    const count = await new Promise<number>((resolve) => {
      getter(
        {
          date: day.toISOString(),
          startDate: rangeStart.toISOString(),
          endDate: isToday ? now.toISOString() : rangeEnd.toISOString(),
        },
        (_error, result) => {
          resolve(Math.round(result?.value ?? 0));
        },
      );
    });

    rows.push({
      value: count,
      unit: 'steps',
      startDate: rangeStart.toISOString(),
      endDate: (isToday ? now : rangeEnd).toISOString(),
    });
  }

  return rows;
}

async function fetchWorkouts(kit: HealthKitExportApi, range: ExportDateRange): Promise<ExportWorkoutRow[]> {
  const getter = kit.getAnchoredWorkouts;
  if (!getter) {
    return [];
  }

  return new Promise((resolve) => {
    getter(
      {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
        type: 'Workout',
      },
      (_error, results) => {
        const workouts = (results?.data ?? []).filter((workout) => workout.tracked !== false);
        resolve(
          workouts.map((workout) => ({
            activityName: workout.activityName ?? 'Workout',
            start: workout.start ?? '',
            end: workout.end ?? '',
            duration: workout.duration ?? 0,
            calories: workout.calories,
            distance: workout.distance,
          })),
        );
      },
    );
  });
}

function buildMetricDefinitions(kit: HealthKitExportApi): MetricDefinition[] {
  const baseOptions = (range: ExportDateRange) => ({
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString(),
    ascending: true,
  });

  return [
    {
      key: 'heartRate',
      label: 'Heart Rate',
      isAvailable: () => !!kit.getHeartRateSamples,
      fetch: (range) => promisifySamples(kit.getHeartRateSamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'bpm')),
    },
    {
      key: 'restingHeartRate',
      label: 'Resting Heart Rate',
      isAvailable: () => !!kit.getRestingHeartRateSamples,
      fetch: (range) =>
        promisifySamples(kit.getRestingHeartRateSamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'bpm')),
    },
    {
      key: 'hrv',
      label: 'Heart Rate Variability',
      isAvailable: () => !!kit.getHeartRateVariabilitySamples,
      fetch: (range) =>
        promisifySamples(kit.getHeartRateVariabilitySamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'ms')),
    },
    {
      key: 'walkingHeartRate',
      label: 'Walking Heart Rate',
      isAvailable: () => !!kit.getWalkingHeartRateAverage,
      fetch: (range) =>
        promisifySamples(kit.getWalkingHeartRateAverage, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.bpm ?? 'bpm',
        }).then((s) => mapNumericSamples(s, 'bpm')),
    },
    {
      key: 'respiratoryRate',
      label: 'Respiratory Rate',
      isAvailable: () => !!kit.getRespiratoryRateSamples,
      fetch: (range) =>
        promisifySamples(kit.getRespiratoryRateSamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'br/min')),
    },
    {
      key: 'bloodOxygen',
      label: 'Blood Oxygen',
      isAvailable: () => !!kit.getOxygenSaturationSamples,
      fetch: (range) =>
        promisifySamples(kit.getOxygenSaturationSamples, baseOptions(range)).then((s) =>
          mapNumericSamples(s, '%', (v) => (v <= 1 ? v * 100 : v)),
        ),
    },
    {
      key: 'steps',
      label: 'Steps',
      isAvailable: () => !!kit.getStepCount,
      fetch: (range) => fetchStepDailyTotals(kit, range),
    },
    {
      key: 'distance',
      label: 'Walking + Running Distance',
      isAvailable: () => !!kit.getDailyDistanceWalkingRunningSamples,
      fetch: (range) =>
        promisifySamples(kit.getDailyDistanceWalkingRunningSamples, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.mile ?? 'mile',
        }).then((s) => mapNumericSamples(s, 'mi')),
    },
    {
      key: 'flights',
      label: 'Flights Climbed',
      isAvailable: () => !!kit.getDailyFlightsClimbedSamples,
      fetch: (range) =>
        promisifySamples(kit.getDailyFlightsClimbedSamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'floors')),
    },
    {
      key: 'activeEnergy',
      label: 'Active Energy',
      isAvailable: () => !!kit.getActiveEnergyBurned,
      fetch: (range) =>
        promisifySamples(kit.getActiveEnergyBurned, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.kcal ?? 'kcal',
        }).then((s) => mapNumericSamples(s, 'kcal')),
    },
    {
      key: 'basalEnergy',
      label: 'Resting Energy',
      isAvailable: () => !!kit.getBasalEnergyBurned,
      fetch: (range) =>
        promisifySamples(kit.getBasalEnergyBurned, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.kcal ?? 'kcal',
        }).then((s) => mapNumericSamples(s, 'kcal')),
    },
    {
      key: 'exerciseTime',
      label: 'Exercise Minutes',
      isAvailable: () => !!kit.getAppleExerciseTime,
      fetch: (range) =>
        promisifySamples(kit.getAppleExerciseTime, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.minute ?? 'minute',
        }).then((s) => mapNumericSamples(s, 'min')),
    },
    {
      key: 'standTime',
      label: 'Stand Minutes',
      isAvailable: () => !!kit.getAppleStandTime,
      fetch: (range) =>
        promisifySamples(kit.getAppleStandTime, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.minute ?? 'minute',
        }).then((s) => mapNumericSamples(s, 'min')),
    },
    {
      key: 'sleep',
      label: 'Sleep',
      isAvailable: () => !!kit.getSleepSamples,
      fetch: (range) => promisifySamples(kit.getSleepSamples, baseOptions(range)).then(mapStringValueSamples),
    },
    {
      key: 'bodyTemperature',
      label: 'Body Temperature',
      isAvailable: () => !!kit.getBodyTemperatureSamples,
      fetch: (range) =>
        promisifySamples(kit.getBodyTemperatureSamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'degF')),
    },
    {
      key: 'vo2Max',
      label: 'Cardio Fitness',
      isAvailable: () => !!kit.getVo2MaxSamples,
      fetch: (range) =>
        promisifySamples(kit.getVo2MaxSamples, baseOptions(range)).then((s) => mapNumericSamples(s, 'mL/kg/min')),
    },
    {
      key: 'bloodGlucose',
      label: 'Blood Glucose',
      isAvailable: () => !!kit.getBloodGlucoseSamples,
      fetch: (range) =>
        promisifySamples(kit.getBloodGlucoseSamples, {
          ...baseOptions(range),
          unit: kit.Constants?.Units?.mgPerdL ?? 'mgPerdL',
        }).then((s) => mapNumericSamples(s, 'mg/dL')),
    },
    {
      key: 'workouts',
      label: 'Workouts',
      isAvailable: () => !!kit.getAnchoredWorkouts,
      fetch: (range) => fetchWorkouts(kit, range),
    },
  ];
}

export async function collectPrismExportData(
  range: ExportDateRange,
  kit: HealthKitExportApi,
  prism: {
    ipip: PrismIpipExport;
    goals: MetricGoal[];
    medicationSchedules: MedicationSchedule[];
    healthEvents: HealthCorrelatedEvent[];
    location: LocationPoint[];
    uiInteractions: UiInteractionEvent[];
  },
  appVersion: string,
  onProgress?: (progress: ExportProgress) => void,
): Promise<PrismExport> {
  const metrics = buildMetricDefinitions(kit);
  const health: Record<string, ExportRow[] | ExportWorkoutRow[]> = {};
  const unavailableMetrics: string[] = [];

  for (let index = 0; index < metrics.length; index += 1) {
    const metric = metrics[index]!;
    onProgress?.({
      metricKey: metric.key,
      metricLabel: metric.label,
      index: index + 1,
      total: metrics.length,
    });

    if (!metric.isAvailable()) {
      unavailableMetrics.push(metric.key);
      health[metric.key] = [];
      continue;
    }

    health[metric.key] = await metric.fetch(range);
  }

  const dateRange = {
    start: range.start.toISOString(),
    end: range.end.toISOString(),
  };
  const goalDefinitions = serializeGoalsForExport(prism.goals);
  const goalProgress = buildGoalProgressExportRows(prism.goals, health, dateRange);
  const medicationSchedules = serializeMedicationSchedulesForExport(
    filterSchedulesInDateRange(prism.medicationSchedules, dateRange),
  );
  const healthEvents = serializeHealthEventsForExport(prism.healthEvents, dateRange);
  const location = serializeLocationForExport(prism.location, dateRange);
  const uiInteractions = serializeUiInteractionsForExport(prism.uiInteractions, dateRange);

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    dateRange,
    health,
    unavailableMetrics,
    prism: {
      ipip: prism.ipip,
      goals: {
        definitions: goalDefinitions,
        progress: goalProgress,
      },
      medications: {
        schedules: medicationSchedules,
      },
      healthEvents: {
        events: healthEvents,
      },
      location: {
        points: location,
      },
      uiInteractions: {
        events: uiInteractions,
      },
    },
    notes: {
      stepsAreDailyTotals: true,
    },
  };
}

export function buildJsonExport(exportData: PrismExport): string {
  return JSON.stringify(exportData, null, 2);
}

function csvEscape(value: string | number | undefined | null): string {
  if (value == null) {
    return '';
  }
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, string | number | undefined>>): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function isWorkoutRows(rows: ExportRow[] | ExportWorkoutRow[]): rows is ExportWorkoutRow[] {
  return rows.length > 0 && 'activityName' in rows[0]!;
}

export function buildCsvFiles(exportData: PrismExport): Record<string, string> {
  const files: Record<string, string> = {};

  for (const [key, rows] of Object.entries(exportData.health)) {
    if (key === 'workouts' || isWorkoutRows(rows)) {
      files[`${key}.csv`] = rowsToCsv(
        ['activityName', 'start', 'end', 'duration', 'calories', 'distance'],
        (rows as ExportWorkoutRow[]).map((row) => ({
          activityName: row.activityName,
          start: row.start,
          end: row.end,
          duration: row.duration,
          calories: row.calories,
          distance: row.distance,
        })),
      );
      continue;
    }

    if (key === 'steps') {
      files[`${key}.csv`] = rowsToCsv(
        ['date', 'value', 'unit'],
        (rows as ExportRow[]).map((row) => ({
          date: row.startDate.slice(0, 10),
          value: row.value,
          unit: row.unit ?? 'steps',
        })),
      );
      continue;
    }

    files[`${key}.csv`] = rowsToCsv(
      ['value', 'unit', 'startDate', 'endDate'],
      (rows as ExportRow[]).map((row) => ({
        value: row.value,
        unit: row.unit ?? '',
        startDate: row.startDate,
        endDate: row.endDate,
      })),
    );
  }

  const ipipAnswerRows = Object.entries(exportData.prism.ipip.answers).map(([questionId, answer]) => ({
    type: 'answer',
    questionId,
    answer: String(answer),
    domain: '',
    facet: '',
    label: '',
    rawTotal: '',
    itemCount: '',
  }));

  const ipipScoreRows: Array<Record<string, string | number | undefined>> = [];
  if (exportData.prism.ipip.results) {
    for (const domain of exportData.prism.ipip.results.domains) {
      ipipScoreRows.push({
        type: 'domain',
        questionId: '',
        answer: '',
        domain: domain.domain,
        facet: '',
        label: domain.label,
        rawTotal: domain.rawTotal,
        itemCount: domain.itemCount,
      });
      for (const facet of domain.facets) {
        ipipScoreRows.push({
          type: 'facet',
          questionId: '',
          answer: '',
          domain: facet.domain,
          facet: facet.facet,
          label: facet.label,
          rawTotal: facet.rawTotal,
          itemCount: facet.itemCount,
        });
      }
    }
  }

  files['prism_ipip.csv'] = rowsToCsv(
    ['type', 'questionId', 'answer', 'domain', 'facet', 'label', 'rawTotal', 'itemCount'],
    [...ipipAnswerRows, ...ipipScoreRows],
  );

  files['prism_goals.csv'] = rowsToCsv(
    ['id', 'metric', 'direction', 'target', 'period', 'label', 'createdAt', 'deletedAt', 'status'],
    exportData.prism.goals.definitions.map((goal) => ({
      id: goal.id,
      metric: goal.metric,
      direction: goal.direction,
      target: typeof goal.target === 'number' ? goal.target : `${goal.target.min}-${goal.target.max}`,
      period: goal.period,
      label: goal.label,
      createdAt: goal.createdAt,
      deletedAt: goal.deletedAt ?? '',
      status: goal.status,
    })),
  );

  files['prism_goal_progress.csv'] = rowsToCsv(
    ['goalId', 'metric', 'date', 'period', 'target', 'actual', 'progressPct', 'met', 'goalActiveOnDate', 'goalStatus'],
    exportData.prism.goals.progress.map((row) => ({
      goalId: row.goalId,
      metric: row.metric,
      date: row.date,
      period: row.period,
      target: row.target,
      actual: row.actual,
      progressPct: row.progressPct,
      met: row.met,
      goalActiveOnDate: row.goalActiveOnDate,
      goalStatus: row.goalStatus,
    })),
  );

  files['prism_medication_schedules.csv'] = rowsToCsv(
    ['id', 'dayKey', 'name', 'timeLabel', 'takenAt', 'createdAt', 'deletedAt', 'status'],
    exportData.prism.medications.schedules.map((row) => ({
      id: row.id,
      dayKey: row.dayKey,
      name: row.name,
      timeLabel: row.timeLabel,
      takenAt: row.takenAt ?? '',
      createdAt: row.createdAt,
      deletedAt: row.deletedAt ?? '',
      status: row.status,
    })),
  );

  files['healthEvents.csv'] = rowsToCsv(
    ['glucoseAt', 'value', 'unit', 'direction', 'source', 'level', 'loggedAt', 'message'],
    exportData.prism.healthEvents.events.map((row) => ({
      glucoseAt: row.glucoseAt,
      value: row.value,
      unit: row.unit,
      direction: row.direction,
      source: row.source,
      level: row.level,
      loggedAt: row.loggedAt,
      message: row.message,
    })),
  );

  files['location.csv'] = rowsToCsv(
    ['at', 'lat', 'lng', 'accuracyMeters'],
    exportData.prism.location.points.map((row) => ({
      at: row.at,
      lat: row.lat,
      lng: row.lng,
      accuracyMeters: row.accuracyMeters ?? '',
    })),
  );

  files['uiInteractions.csv'] = rowsToCsv(
    ['at', 'screen', 'gesture', 'target', 'direction', 'id'],
    exportData.prism.uiInteractions.events.map((row) => ({
      at: row.at,
      screen: row.screen,
      gesture: row.gesture,
      target: row.target,
      direction: row.direction,
      id: row.id,
    })),
  );

  files['manifest.json'] = JSON.stringify(
    {
      schemaVersion: exportData.schemaVersion,
      exportedAt: exportData.exportedAt,
      appVersion: exportData.appVersion,
      dateRange: exportData.dateRange,
      metrics: Object.keys(exportData.health),
      unavailableMetrics: exportData.unavailableMetrics,
      notes: exportData.notes,
      ipip: {
        isComplete: exportData.prism.ipip.isComplete,
        answeredCount: Object.keys(exportData.prism.ipip.answers).length,
      },
      goals: {
        total: exportData.prism.goals.definitions.length,
        active: exportData.prism.goals.definitions.filter((goal) => goal.status === 'active').length,
        deleted: exportData.prism.goals.definitions.filter((goal) => goal.status === 'deleted').length,
        progressRows: exportData.prism.goals.progress.length,
      },
      medications: {
        total: exportData.prism.medications.schedules.length,
        active: exportData.prism.medications.schedules.filter((row) => row.status === 'active').length,
        deleted: exportData.prism.medications.schedules.filter((row) => row.status === 'deleted').length,
        taken: exportData.prism.medications.schedules.filter((row) => row.takenAt != null).length,
      },
      healthEvents: {
        rows: exportData.prism.healthEvents.events.length,
      },
      location: {
        rows: exportData.prism.location.points.length,
      },
      uiInteractions: {
        rows: exportData.prism.uiInteractions.events.length,
      },
    },
    null,
    2,
  );

  return files;
}

export async function buildCsvZipExport(exportData: PrismExport): Promise<Uint8Array> {
  const zip = new JSZip();
  const files = buildCsvFiles(exportData);
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'uint8array' });
}

export function buildExportFilename(format: ExportFormat, now = new Date()): string {
  const stamp = toLocalDayKey(now);
  return format === 'json' ? `prism-export-${stamp}.json` : `prism-export-${stamp}.zip`;
}

export function serializeHealthEventsForExport(
  events: HealthCorrelatedEvent[],
  dateRange: { start: string; end: string },
): HealthEventExportRow[] {
  const startMs = new Date(dateRange.start).getTime();
  const endMs = new Date(dateRange.end).getTime();
  return events
    .filter((event) => {
      const glucoseMs = new Date(event.glucoseAt).getTime();
      return Number.isFinite(glucoseMs) && glucoseMs >= startMs && glucoseMs <= endMs;
    })
    .map((event) => ({
      id: event.id,
      loggedAt: event.at,
      glucoseAt: event.glucoseAt,
      value: event.glucoseValue,
      unit: 'mg/dL',
      direction: event.direction,
      level: event.level,
      source: event.glucoseSource,
      message: event.message,
    }));
}

export function serializeLocationForExport(
  points: LocationPoint[],
  dateRange: { start: string; end: string },
): LocationExportRow[] {
  return filterLocationLogForExport(points, dateRange).map((point) => ({
    at: point.at,
    lat: point.lat,
    lng: point.lng,
    accuracyMeters: point.accuracyMeters,
  }));
}

export function serializeUiInteractionsForExport(
  events: UiInteractionEvent[],
  dateRange: { start: string; end: string },
): UiInteractionExportRow[] {
  return filterUiInteractionsForExport(events, dateRange).map((event) => ({
    id: event.id,
    at: event.at,
    screen: event.screen,
    gesture: event.gesture,
    target: event.target,
    direction: event.direction,
  }));
}
