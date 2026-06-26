/**
 * Daily health score tests.
 * Run: npx tsx --test src/lib/healthScoreFromMetrics.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateGlucoseScore,
  calculateHeartRateScore,
  calculateOverallHealthScore,
  calculateSleepScore,
  filterReadingsToDay,
  type TimestampedReading,
} from './healthScoreFromMetrics';

const hour = 60 * 60 * 1000;

function reading(value: number, startMs: number, endMs = startMs + hour): TimestampedReading {
  return { value, startMs, endMs };
}

describe('calculateGlucoseScore', () => {
  it('returns null for empty readings', () => {
    assert.equal(calculateGlucoseScore([], 'general'), null);
  });

  it('scores time in general wellness range', () => {
    const readings = [
      reading(100, 0, hour),
      reading(150, hour, 2 * hour),
    ];
    assert.equal(calculateGlucoseScore(readings, 'general'), 0.5);
  });

  it('uses wider range for T2D mode', () => {
    const readings = [reading(150, 0, hour)];
    assert.equal(calculateGlucoseScore(readings, 'general'), 0);
    assert.equal(calculateGlucoseScore(readings, 't2d'), 1);
  });
});

describe('calculateSleepScore', () => {
  it('returns null only when sleep is missing or invalid', () => {
    assert.equal(calculateSleepScore(null), null);
    assert.equal(calculateSleepScore(-1), null);
  });

  it('scores zero hours as 0', () => {
    assert.equal(calculateSleepScore(0), 0);
  });

  it('caps at 1 when sleep meets or exceeds target', () => {
    assert.equal(calculateSleepScore(7), 1);
    assert.equal(calculateSleepScore(8.5), 1);
  });

  it('scales linearly below target', () => {
    assert.equal(calculateSleepScore(3.5), 0.5);
  });
});

describe('calculateHeartRateScore', () => {
  const past = [reading(60, 0), reading(62, hour), reading(64, 2 * hour), reading(66, 3 * hour)];

  it('returns null without enough past baseline data', () => {
    assert.equal(calculateHeartRateScore([reading(62, 4 * hour)], [reading(60, 0)]), null);
  });

  it('returns null when today has no readings', () => {
    assert.equal(calculateHeartRateScore([], past), null);
  });

  it('scores time within personal Q1–Q3 range', () => {
    const baseline = [
      reading(50, 0),
      reading(55, hour),
      reading(60, 2 * hour),
      reading(65, 3 * hour),
      reading(70, 4 * hour),
    ];
    const today = [reading(60, 5 * hour, 6 * hour), reading(80, 6 * hour, 7 * hour)];
    assert.equal(calculateHeartRateScore(today, baseline), 0.5);
  });
});

describe('calculateOverallHealthScore', () => {
  it('averages only available components and scales to 100', () => {
    const result = calculateOverallHealthScore(1, 0.5, null);
    assert.equal(result.score, 75);
    assert.deepEqual(result.components, { glucose: 1, sleep: 0.5, heartRate: null });
  });

  it('returns null when every component is missing', () => {
    const result = calculateOverallHealthScore(null, null, null);
    assert.equal(result.score, null);
  });

  it('rounds final score to one decimal place', () => {
    const result = calculateOverallHealthScore(2 / 3, 2 / 3, 2 / 3);
    assert.equal(result.score, 66.7);
  });
});

describe('filterReadingsToDay', () => {
  it('keeps readings that start on the given local day', () => {
    const dayStart = new Date(2026, 5, 21);
    const inDay = reading(100, dayStart.getTime() + hour);
    const outDay = reading(100, dayStart.getTime() - hour);
    const filtered = filterReadingsToDay([inDay, outDay], dayStart);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.value, 100);
  });
});
