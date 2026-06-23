/**
 * Run: npx tsx --test src/lib/insightMetricFreshness.test.ts
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatInsightMetricFreshness, formatLastSyncedLabel, formatSampleAge } from './insightMetricFreshness';

describe('formatSampleAge', () => {
  it('formats recent samples', () => {
    const now = Date.parse('2026-06-22T12:00:00');
    assert.equal(formatSampleAge(now - 30_000, now), 'Just now');
    assert.equal(formatSampleAge(now - 8 * 60_000, now), '8m ago');
  });

  it('formats same-day clock time', () => {
    const now = Date.parse('2026-06-22T15:00:00');
    const at = Date.parse('2026-06-22T08:15:00');
    assert.match(formatSampleAge(at, now), /8:15/);
  });
});

describe('formatInsightMetricFreshness', () => {
  const now = Date.parse('2026-06-22T12:00:00');

  it('formats point-in-time metrics', () => {
    const label = formatInsightMetricFreshness({ kind: 'point-in-time', atMs: now - 5 * 60_000 }, now);
    assert.equal(label, 'As of 5m ago');
  });

  it('formats daily totals and averages', () => {
    assert.equal(formatInsightMetricFreshness({ kind: 'today-total' }, now), 'Total so far today');
    assert.equal(formatInsightMetricFreshness({ kind: 'today-avg' }, now), "Today's average so far");
  });

  it('formats sleep night label', () => {
    assert.equal(
      formatInsightMetricFreshness({ kind: 'last-night', wakeDayLabel: 'Sat, Jun 21' }, now),
      "Last night's sleep · Sat, Jun 21",
    );
  });

  it('formats glucose latest from Dexcom', () => {
    const label = formatInsightMetricFreshness(
      { kind: 'glucose-latest', source: 'dexcom', atMs: now - 120_000 },
      now,
    );
    assert.equal(label, 'Dexcom · as of 2m ago');
  });
});

describe('formatLastSyncedLabel', () => {
  const now = Date.parse('2026-06-22T12:00:00');

  it('formats recent sync times', () => {
    assert.equal(formatLastSyncedLabel(now - 30_000, now), 'Last synced just now');
    assert.equal(formatLastSyncedLabel(now - 5 * 60_000, now), 'Last synced 5m ago');
  });
});
