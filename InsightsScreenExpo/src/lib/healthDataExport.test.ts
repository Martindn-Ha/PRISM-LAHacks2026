/**
 * PRISM data export tests.
 * Run: npm run test:export
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCsvFiles,
  buildJsonExport,
  collectPrismExportData,
  normalizeCustomExportDateRange,
  resolveExportDateRange,
  type ExportRow,
  type HealthKitExportApi,
  type PrismExport,
} from './healthDataExportCore';

function makeSample(value: number, startDate: string, endDate = startDate) {
  return { value, startDate, endDate };
}

function makeMockKit(overrides: Partial<HealthKitExportApi> = {}): HealthKitExportApi {
  return {
    Constants: { Units: { bpm: 'bpm', kcal: 'kcal', mile: 'mile', minute: 'minute' } },
    getHeartRateSamples: (_options, callback) => {
      callback(undefined, [makeSample(72, '2026-06-01T10:00:00.000Z')]);
    },
    getStepCount: (options, callback) => {
      const startDate = (options as { startDate?: string }).startDate ?? '';
      const day = startDate.slice(0, 10);
      callback(undefined, { value: day.endsWith('01') ? 5000 : 3000 });
    },
    getAnchoredWorkouts: (_options, callback) => {
      callback(undefined, {
        data: [
          {
            activityName: 'Running',
            start: '2026-06-01T08:00:00.000Z',
            end: '2026-06-01T08:30:00.000Z',
            duration: 1800,
            calories: 220,
            distance: 3.1,
            tracked: true,
          },
        ],
      });
    },
    ...overrides,
  };
}

describe('resolveExportDateRange', () => {
  it('returns 30 local days inclusive for last30days', () => {
    const now = new Date('2026-06-22T15:00:00.000Z');
    const range = resolveExportDateRange('last30days', now);
    assert.equal(range.end.toISOString(), now.toISOString());
    const daySpan = Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000));
    assert.equal(daySpan, 29);
  });

  it('resolves custom ranges through normalizeCustomExportDateRange', () => {
    const now = new Date('2026-06-22T15:00:00.000Z');
    const range = resolveExportDateRange('custom', now, {
      start: new Date('2026-06-01T00:00:00.000Z'),
      end: new Date('2026-06-10T00:00:00.000Z'),
    });
    assert.ok(range.end.getTime() > new Date('2026-06-10T00:00:00.000Z').getTime());
    assert.ok(range.end.getTime() <= now.getTime());
  });
});

describe('normalizeCustomExportDateRange', () => {
  it('caps end at now when the selected end date is today', () => {
    const now = new Date('2026-06-22T15:00:00.000Z');
    const range = normalizeCustomExportDateRange(new Date('2026-06-01T00:00:00.000Z'), new Date('2026-06-22T08:00:00.000Z'), now);
    assert.equal(range.end.toISOString(), now.toISOString());
  });

  it('throws when start is after end', () => {
    assert.throws(
      () =>
        normalizeCustomExportDateRange(
          new Date('2026-06-10T00:00:00.000Z'),
          new Date('2026-06-01T00:00:00.000Z'),
        ),
      /Start date must be on or before end date/,
    );
  });
});

describe('buildJsonExport', () => {
  it('includes schema, health, and prism ipip sections', () => {
    const exportData: PrismExport = {
      schemaVersion: 1,
      exportedAt: '2026-06-22T00:00:00.000Z',
      appVersion: '1.0.0',
      dateRange: { start: '2026-06-01T00:00:00.000Z', end: '2026-06-22T00:00:00.000Z' },
      health: {
        heartRate: [{ value: 70, unit: 'bpm', startDate: '2026-06-01T10:00:00.000Z', endDate: '2026-06-01T10:00:00.000Z' }],
        workouts: [],
      },
      unavailableMetrics: [],
      prism: {
        ipip: {
          answers: { 1: 4 },
          results: null,
          isComplete: false,
        },
        goals: {
          definitions: [],
          progress: [],
        },
        medications: {
          schedules: [],
        },
        healthEvents: {
          events: [],
        },
      },
      notes: { stepsAreDailyTotals: true },
    };

    const parsed = JSON.parse(buildJsonExport(exportData)) as PrismExport;
    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.health.heartRate?.length, 1);
    assert.equal(parsed.prism.ipip.answers['1'], 4);
    assert.equal(parsed.prism.ipip.isComplete, false);
  });
});

describe('buildCsvFiles', () => {
  it('writes steps as daily totals and includes ipip answers when results are null', () => {
    const exportData: PrismExport = {
      schemaVersion: 1,
      exportedAt: '2026-06-22T00:00:00.000Z',
      appVersion: '1.0.0',
      dateRange: { start: '2026-06-01T00:00:00.000Z', end: '2026-06-02T00:00:00.000Z' },
      health: {
        steps: [
          { value: 5000, unit: 'steps', startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-06-01T23:59:59.000Z' },
          { value: 4200, unit: 'steps', startDate: '2026-06-02T00:00:00.000Z', endDate: '2026-06-02T23:59:59.000Z' },
        ] as ExportRow[],
      },
      unavailableMetrics: [],
      prism: {
        ipip: {
          answers: { 2: 3 },
          results: null,
          isComplete: false,
        },
        goals: {
          definitions: [],
          progress: [],
        },
        medications: {
          schedules: [],
        },
        healthEvents: {
          events: [],
        },
      },
      notes: { stepsAreDailyTotals: true },
    };

    const files = buildCsvFiles(exportData);
    assert.match(files['steps.csv'], /date,value,unit/);
    assert.match(files['steps.csv'], /2026-06-01,5000,steps/);
    assert.match(files['prism_ipip.csv'], /answer,2,3/);
    assert.equal(files['prism_ipip.csv'].split('\n').filter(Boolean).length, 2);

    const manifest = JSON.parse(files['manifest.json']) as { ipip: { isComplete: boolean; answeredCount: number } };
    assert.equal(manifest.ipip.isComplete, false);
    assert.equal(manifest.ipip.answeredCount, 1);
  });
});

describe('collectPrismExportData', () => {
  it('marks unavailable metrics and fetches available sample data from a mock kit', async () => {
    const progress: string[] = [];
    const exportData = await collectPrismExportData(
      {
        start: new Date('2026-06-01T00:00:00.000Z'),
        end: new Date('2026-06-02T12:00:00.000Z'),
      },
      makeMockKit(),
      {
        ipip: {
          answers: {},
          results: null,
          isComplete: false,
        },
        goals: [],
        medicationSchedules: [],
        healthEvents: [],
      },
      '1.0.0',
      (next) => {
        progress.push(next.metricKey);
      },
    );

    assert.ok(progress.includes('heartRate'));
    assert.ok(progress.includes('steps'));
    assert.equal(exportData.health.heartRate?.length, 1);
    assert.ok((exportData.health.steps?.length ?? 0) >= 2);
    assert.equal((exportData.health.workouts as Array<{ activityName: string }>)[0]?.activityName, 'Running');
    assert.ok(exportData.unavailableMetrics.includes('restingHeartRate'));
    assert.equal(exportData.notes.stepsAreDailyTotals, true);
  });
});
