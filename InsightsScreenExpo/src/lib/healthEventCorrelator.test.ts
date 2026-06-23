/**
 * Health event correlator tests.
 * Run: npm run test:health-events
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyGlucoseState,
  correlateGlucoseSamples,
  GLUCOSE_RANGE_MAX,
  GLUCOSE_RANGE_MIN,
  GLUCOSE_SEVERE_HIGH,
} from './healthEventCorrelator';

describe('classifyGlucoseState', () => {
  it('classifies in-range, high, low, and severe high values', () => {
    assert.equal(classifyGlucoseState(100), 'in_range');
    assert.equal(classifyGlucoseState(GLUCOSE_RANGE_MIN), 'in_range');
    assert.equal(classifyGlucoseState(GLUCOSE_RANGE_MAX), 'in_range');
    assert.equal(classifyGlucoseState(GLUCOSE_RANGE_MAX + 1), 'high');
    assert.equal(classifyGlucoseState(GLUCOSE_SEVERE_HIGH), 'severe_high');
    assert.equal(classifyGlucoseState(GLUCOSE_RANGE_MIN - 1), 'low');
  });
});

describe('correlateGlucoseSamples', () => {
  it('emits edge events and dedupes by timestamp+direction', () => {
    const samples = [
      { valueMgDl: 120, timestampMs: Date.parse('2026-06-22T14:00:00.000Z'), source: 'healthkit' as const },
      { valueMgDl: 155, timestampMs: Date.parse('2026-06-22T14:05:00.000Z'), source: 'healthkit' as const },
      { valueMgDl: 155, timestampMs: Date.parse('2026-06-22T14:05:00.000Z'), source: 'healthkit' as const },
    ];

    const first = correlateGlucoseSamples(
      samples,
      'in_range',
      () => ({ lat: 34.05, lng: -118.25, locationAt: '2026-06-22T14:04:00.000Z', gapMs: 60_000 }),
      new Set(),
    );

    assert.equal(first.events.length, 1);
    assert.equal(first.events[0]?.direction, 'entered_high');
    assert.equal(first.events[0]?.latitude, 34.05);
    assert.equal(first.nextState, 'high');

    const second = correlateGlucoseSamples(
      samples,
      'in_range',
      () => null,
      new Set(first.events.map((event) => event.id)),
    );
    assert.equal(second.events.length, 0);
  });

  it('emits recovery when glucose returns in range', () => {
    const samples = [
      { valueMgDl: 110, timestampMs: Date.parse('2026-06-22T15:00:00.000Z'), source: 'healthkit' as const },
    ];
    const result = correlateGlucoseSamples(samples, 'high', () => null, new Set());
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0]?.direction, 'returned_in_range');
    assert.equal(result.nextState, 'in_range');
  });
});
