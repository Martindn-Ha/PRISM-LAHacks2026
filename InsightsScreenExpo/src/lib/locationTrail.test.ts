/**
 * Location trail tests.
 * Run: npm run test:location-trail
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LOCATION_MATCH_MAX_GAP_MS,
  matchLocationAtTime,
  pruneTrailPoints,
  type LocationTrailPoint,
} from './locationTrail';

describe('pruneTrailPoints', () => {
  it('drops points older than max age and caps count', () => {
    const nowMs = Date.parse('2026-06-22T12:00:00.000Z');
    const points: LocationTrailPoint[] = [
      { at: '2026-06-19T12:00:00.000Z', lat: 1, lng: 1 },
      { at: '2026-06-21T12:00:00.000Z', lat: 2, lng: 2 },
      { at: '2026-06-22T11:00:00.000Z', lat: 3, lng: 3 },
    ];
    const pruned = pruneTrailPoints(points, nowMs, 24 * 60 * 60 * 1000, 10);
    assert.equal(pruned.length, 2);
    assert.equal(pruned[0]?.lat, 2);
  });
});

describe('matchLocationAtTime', () => {
  const trail: LocationTrailPoint[] = [
    { at: '2026-06-22T13:50:00.000Z', lat: 34.05, lng: -118.25 },
    { at: '2026-06-22T14:10:00.000Z', lat: 34.06, lng: -118.26 },
  ];

  it('returns nearest point within gap tolerance', () => {
    const match = matchLocationAtTime(trail, Date.parse('2026-06-22T14:14:00.000Z'), LOCATION_MATCH_MAX_GAP_MS);
    assert.ok(match);
    assert.equal(match.lat, 34.06);
    assert.ok(match.gapMs <= 4 * 60 * 1000);
  });

  it('returns null when nearest point exceeds max gap', () => {
    const match = matchLocationAtTime(trail, Date.parse('2026-06-22T16:00:00.000Z'), LOCATION_MATCH_MAX_GAP_MS);
    assert.equal(match, null);
  });
});
