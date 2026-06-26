import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildDailyAvgSeries,
  formatGlucoseSourceLabel,
  isDexcomReadingFresh,
  GLUCOSE_STALE_MS,
} from './glucoseProviderLogic';

describe('formatGlucoseSourceLabel', () => {
  it('labels dexcom with age', () => {
    const now = Date.now();
    assert.equal(formatGlucoseSourceLabel('dexcom', now - 120_000, now), 'Dexcom · 2m ago');
    assert.equal(formatGlucoseSourceLabel('healthkit', now, now), 'Apple Health');
    assert.equal(formatGlucoseSourceLabel('none', 0, now), 'No glucose data');
  });
});

describe('isDexcomReadingFresh', () => {
  it('treats readings within stale window as fresh', () => {
    const now = 1_000_000;
    assert.equal(isDexcomReadingFresh(now - GLUCOSE_STALE_MS, now), true);
    assert.equal(isDexcomReadingFresh(now - GLUCOSE_STALE_MS - 1, now), false);
    assert.equal(isDexcomReadingFresh(0, now), false);
  });
});

describe('buildDailyAvgSeries', () => {
  it('averages samples into daily buckets', () => {
    const day = new Date('2026-06-20T12:00:00');
    day.setHours(0, 0, 0, 0);
    const toDayKey = (d: Date) => d.toISOString().slice(0, 10);
    const series = buildDailyAvgSeries(
      [
        { valueMgDl: 100, timestampMs: day.getTime() + 3_600_000 },
        { valueMgDl: 120, timestampMs: day.getTime() + 7_200_000 },
      ],
      [day],
      toDayKey,
    );
    assert.deepEqual(series, [110]);
  });
});
