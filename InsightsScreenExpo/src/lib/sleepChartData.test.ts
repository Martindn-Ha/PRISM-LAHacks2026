/**
 * Run: npx tsx --test src/lib/sleepChartData.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveLastRecordedSleepNight } from './sleepChartData';

describe('resolveLastRecordedSleepNight', () => {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  it('uses the same wake night for total and all stages', () => {
    const total = [0, 0, 0, 0, 0, 7, 0];
    const deep = [1.5, 0, 0, 0, 0, 0.5, 0];
    const rem = [0, 2, 0, 0, 0, 1, 0];
    const core = [0, 0, 0, 0, 0, 5.5, 0];

    const night = resolveLastRecordedSleepNight(total, deep, rem, core, labels);
    assert.ok(night);
    assert.equal(night.index, 5);
    assert.equal(night.totalHours, 7);
    assert.equal(night.deepHours, 0.5);
    assert.equal(night.remHours, 1);
    assert.equal(night.coreHours, 5.5);
    assert.equal(night.wakeDayLabel, 'Sat');
  });

  it('does not pull stage values from a different night than total', () => {
    const total = [0, 0, 0, 0, 0, 0, 6];
    const deep = [2, 0, 0, 0, 0, 0, 0];
    const rem = [0, 0, 0, 0, 0, 0, 0];
    const core = [0, 0, 0, 0, 0, 0, 6];

    const night = resolveLastRecordedSleepNight(total, deep, rem, core, labels);
    assert.ok(night);
    assert.equal(night.index, 6);
    assert.equal(night.deepHours, 0);
    assert.equal(night.coreHours, 6);
  });

  it('returns a zero-hour night when Apple Health recorded sleep for that wake day', () => {
    const total = [0, 0, 0, 0, 0, 0, 0];
    const deep = [0, 0, 0, 0, 0, 0, 0];
    const rem = [0, 0, 0, 0, 0, 0, 0];
    const core = [0, 0, 0, 0, 0, 0, 0];
    const recorded = [false, false, false, false, false, false, true];

    const night = resolveLastRecordedSleepNight(total, deep, rem, core, labels, recorded);
    assert.ok(night);
    assert.equal(night.index, 6);
    assert.equal(night.totalHours, 0);
  });
});
