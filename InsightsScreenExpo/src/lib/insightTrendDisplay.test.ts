/**
 * Run: npx tsx --test src/lib/insightTrendDisplay.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  insightDisplayValue,
  resolveLastRecordedTrendDay,
  todayTrendValue,
} from './insightTrendDisplay';

describe('insightTrendDisplay', () => {
  it('uses hubValue when set', () => {
    assert.equal(insightDisplayValue({ hubValue: 42, trendPoints: [0, 0, 7] }), 42);
  });

  it('falls back to today bucket when hubValue is missing', () => {
    assert.equal(todayTrendValue([1, 2, 3]), 3);
    assert.equal(insightDisplayValue({ trendPoints: [1, 2, 3] }), 3);
  });

  it('resolveLastRecordedTrendDay returns the newest positive day', () => {
    const day = resolveLastRecordedTrendDay([0, 5, 0, 8, 0], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    assert.ok(day);
    assert.equal(day.index, 3);
    assert.equal(day.value, 8);
    assert.equal(day.dayLabel, 'Thu');
  });
});
