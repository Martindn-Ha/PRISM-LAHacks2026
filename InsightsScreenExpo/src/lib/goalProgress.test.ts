/**
 * Goal progress tests.
 * Run: npm run test:goals
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MetricGoal } from '../constants/goals';
import { isGoalMetricAvailable } from '../constants/goals';
import type { InsightContent } from '../constants/insights';
import {
  buildGoalProgressExportRows,
  computeGoalProgressFromInsight,
  evaluateGoalValue,
  serializeGoalsForExport,
} from './goalProgress';

function makeGoal(overrides: Partial<MetricGoal> = {}): MetricGoal {
  return {
    id: 'goal-1',
    metric: 'Steps',
    direction: 'increase',
    target: 10000,
    period: 'daily',
    createdAt: '2026-06-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

const sampleContent: InsightContent = {
  title: 'Steps',
  summary: '5,000 steps',
  trend: 'Trend',
  recommendation: 'Walk more',
  trendPoints: [3000, 4000, 5000, 4200, 5100, 6000, 8200],
  trendLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  trendUnit: 'steps',
  hubValue: 8200,
};

describe('isGoalMetricAvailable', () => {
  const withData: InsightContent = {
    ...sampleContent,
    trendPoints: [1000, 2000, 3000],
  };
  const withoutData: InsightContent = {
    ...sampleContent,
    trendPoints: [0, 0, 0],
  };

  it('blocks greyed-out unlikely metrics when HealthKit is ready but empty', () => {
    assert.equal(isGoalMetricAvailable('Heart Rate Variability', withoutData, true), false);
    assert.equal(isGoalMetricAvailable('Steps', withData, true), true);
  });

  it('blocks watch-only metrics before HealthKit is ready', () => {
    assert.equal(isGoalMetricAvailable('Exercise Minutes', withData, false), false);
    assert.equal(isGoalMetricAvailable('Steps', withData, false), true);
  });

  it('rejects metrics outside the Insights goal allowlist', () => {
    assert.equal(isGoalMetricAvailable('Heart Rate', withData, true), false);
  });
});

describe('evaluateGoalValue', () => {
  it('scores increase goals by ratio to target', () => {
    const result = evaluateGoalValue(makeGoal(), 5000);
    assert.equal(result.progress, 0.5);
    assert.equal(result.met, false);
  });

  it('scores decrease goals as met when at or below target', () => {
    const result = evaluateGoalValue(
      makeGoal({ metric: 'Resting Heart Rate', direction: 'decrease', target: 65 }),
      63,
    );
    assert.equal(result.met, true);
    assert.equal(result.progress, 1);
  });

  it('scores in-range glucose goals', () => {
    const inRange = evaluateGoalValue(
      makeGoal({
        metric: 'Blood Glucose',
        direction: 'in_range',
        target: { min: 70, max: 140 },
      }),
      110,
    );
    assert.equal(inRange.met, true);

    const outOfRange = evaluateGoalValue(
      makeGoal({
        metric: 'Blood Glucose',
        direction: 'in_range',
        target: { min: 70, max: 140 },
      }),
      180,
    );
    assert.equal(outOfRange.met, false);
  });
});

describe('computeGoalProgressFromInsight', () => {
  it('uses today value for daily goals', () => {
    const progress = computeGoalProgressFromInsight(makeGoal(), sampleContent);
    assert.equal(progress.current, 8200);
    assert.equal(progress.met, false);
    assert.match(progress.summary, /82%/);
  });
});

describe('serializeGoalsForExport', () => {
  it('includes deleted goals with status', () => {
    const rows = serializeGoalsForExport([
      makeGoal(),
      makeGoal({ id: 'goal-2', deletedAt: '2026-06-15T00:00:00.000Z' }),
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.status, 'active');
    assert.equal(rows[1]?.status, 'deleted');
  });
});

describe('buildGoalProgressExportRows', () => {
  it('marks days outside a deleted goal lifespan as inactive', () => {
    const rows = buildGoalProgressExportRows(
      [
        makeGoal({
          createdAt: '2026-06-02T00:00:00.000Z',
          deletedAt: '2026-06-03T00:00:00.000Z',
        }),
      ],
      {
        steps: [
          {
            value: 5000,
            unit: 'steps',
            startDate: '2026-06-01T00:00:00.000Z',
            endDate: '2026-06-01T23:59:59.000Z',
          },
          {
            value: 8000,
            unit: 'steps',
            startDate: '2026-06-02T00:00:00.000Z',
            endDate: '2026-06-02T23:59:59.000Z',
          },
          {
            value: 12000,
            unit: 'steps',
            startDate: '2026-06-04T00:00:00.000Z',
            endDate: '2026-06-04T23:59:59.000Z',
          },
        ],
      },
      {
        start: '2026-06-01T00:00:00.000Z',
        end: '2026-06-04T00:00:00.000Z',
      },
    );

    const june1 = rows.find((row) => row.date === '2026-06-01');
    const june2 = rows.find((row) => row.date === '2026-06-02');
    const june4 = rows.find((row) => row.date === '2026-06-04');

    assert.equal(june1?.goalActiveOnDate, false);
    assert.equal(june2?.goalActiveOnDate, true);
    assert.equal(june2?.met, false);
    assert.equal(june4?.goalActiveOnDate, false);
    assert.equal(june4?.goalStatus, 'deleted');
  });
});
