/**
 * Location log tests.
 * Run: npm run test:location
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LOCATION_MATCH_MAX_GAP_MS,
  matchLocationAtTime,
  pruneLocationPoints,
  type LocationPoint,
} from './locationLog';

describe('pruneLocationPoints', () => {
  it('keeps old points and caps count (no age drop)', () => {
    const nowMs = Date.parse('2026-06-22T12:00:00.000Z');
    const points: LocationPoint[] = [
      { at: '2026-01-01T12:00:00.000Z', lat: 1, lng: 1 },
      { at: '2026-06-21T12:00:00.000Z', lat: 2, lng: 2 },
      { at: '2026-06-22T11:00:00.000Z', lat: 3, lng: 3 },
    ];
    const pruned = pruneLocationPoints(points, nowMs, 2);
    assert.equal(pruned.length, 2);
    assert.equal(pruned[0]?.lat, 2);
    assert.equal(pruned[1]?.lat, 3);
  });
});

describe('matchLocationAtTime', () => {
  const points: LocationPoint[] = [
    { at: '2026-06-22T13:50:00.000Z', lat: 34.05, lng: -118.25 },
    { at: '2026-06-22T14:10:00.000Z', lat: 34.06, lng: -118.26 },
  ];

  it('returns nearest point within gap tolerance', () => {
    const match = matchLocationAtTime(points, Date.parse('2026-06-22T14:14:00.000Z'), LOCATION_MATCH_MAX_GAP_MS);
    assert.ok(match);
    assert.equal(match.lat, 34.06);
    assert.ok(match.gapMs <= 4 * 60 * 1000);
  });

  it('returns null when nearest point exceeds max gap', () => {
    const match = matchLocationAtTime(points, Date.parse('2026-06-22T16:00:00.000Z'), LOCATION_MATCH_MAX_GAP_MS);
    assert.equal(match, null);
  });
});
