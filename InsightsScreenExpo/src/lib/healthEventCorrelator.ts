import type { LocationMatchResult } from './locationTrail';

export const GLUCOSE_RANGE_MIN = 70;
export const GLUCOSE_RANGE_MAX = 140;
export const GLUCOSE_SEVERE_HIGH = 170;

export type GlucoseSampleInput = {
  valueMgDl: number;
  timestampMs: number;
  source: 'healthkit' | 'dexcom';
};

export type GlucoseRangeState = 'in_range' | 'low' | 'high' | 'severe_high';

export type HealthEventDirection =
  | 'entered_low'
  | 'entered_high'
  | 'entered_severe_high'
  | 'returned_in_range';

export type HealthCorrelatedEvent = {
  id: string;
  at: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  glucoseValue: number;
  glucoseAt: string;
  glucoseSource: 'healthkit' | 'dexcom';
  direction: HealthEventDirection;
  latitude?: number;
  longitude?: number;
  locationAt?: string;
  locationAccuracyMeters?: number;
  locationGapMs?: number;
};

export function classifyGlucoseState(valueMgDl: number): GlucoseRangeState {
  if (valueMgDl < GLUCOSE_RANGE_MIN) {
    return 'low';
  }
  if (valueMgDl >= GLUCOSE_SEVERE_HIGH) {
    return 'severe_high';
  }
  if (valueMgDl > GLUCOSE_RANGE_MAX) {
    return 'high';
  }
  return 'in_range';
}

function directionForTransition(
  previous: GlucoseRangeState,
  next: GlucoseRangeState,
): HealthEventDirection | null {
  if (previous === next) {
    return null;
  }
  if (next === 'in_range') {
    return 'returned_in_range';
  }
  if (next === 'low') {
    return 'entered_low';
  }
  if (next === 'severe_high') {
    return 'entered_severe_high';
  }
  if (next === 'high') {
    return 'entered_high';
  }
  return null;
}

function levelForDirection(direction: HealthEventDirection): 'info' | 'warn' | 'error' {
  if (direction === 'entered_severe_high' || direction === 'entered_low') {
    return 'warn';
  }
  if (direction === 'entered_high') {
    return 'warn';
  }
  return 'info';
}

function messageForEvent(direction: HealthEventDirection, valueMgDl: number, location: LocationMatchResult | null): string {
  const value = Math.round(valueMgDl);
  const locationSuffix = location
    ? ` Near ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}.`
    : ' Location unavailable.';

  switch (direction) {
    case 'entered_low':
      return `Low glucose: ${value} mg/dL (below ${GLUCOSE_RANGE_MIN}).${locationSuffix}`;
    case 'entered_high':
      return `High glucose: ${value} mg/dL (above ${GLUCOSE_RANGE_MAX}).${locationSuffix}`;
    case 'entered_severe_high':
      return `Severe high glucose: ${value} mg/dL (≥${GLUCOSE_SEVERE_HIGH}).${locationSuffix}`;
    case 'returned_in_range':
      return `Glucose returned to range: ${value} mg/dL (${GLUCOSE_RANGE_MIN}–${GLUCOSE_RANGE_MAX}).${locationSuffix}`;
    default:
      return `Glucose event: ${value} mg/dL.${locationSuffix}`;
  }
}

function eventId(timestampMs: number, direction: HealthEventDirection): string {
  return `he-${timestampMs}-${direction}`;
}

export function correlateGlucoseSamples(
  samples: GlucoseSampleInput[],
  previousState: GlucoseRangeState,
  matchLocation: (timestampMs: number) => LocationMatchResult | null,
  existingEventIds: Set<string>,
): { events: HealthCorrelatedEvent[]; nextState: GlucoseRangeState } {
  const sorted = [...samples].sort((a, b) => a.timestampMs - b.timestampMs);
  const events: HealthCorrelatedEvent[] = [];
  let state = previousState;

  for (const sample of sorted) {
    if (!Number.isFinite(sample.valueMgDl) || sample.valueMgDl <= 0 || !Number.isFinite(sample.timestampMs)) {
      continue;
    }

    const nextState = classifyGlucoseState(sample.valueMgDl);
    const direction = directionForTransition(state, nextState);
    state = nextState;

    if (!direction) {
      continue;
    }

    const id = eventId(sample.timestampMs, direction);
    if (existingEventIds.has(id)) {
      continue;
    }

    const location = matchLocation(sample.timestampMs);
    const glucoseAt = new Date(sample.timestampMs).toISOString();

    events.push({
      id,
      at: new Date().toISOString(),
      level: levelForDirection(direction),
      source: 'alert:glucose',
      message: messageForEvent(direction, sample.valueMgDl, location),
      glucoseValue: sample.valueMgDl,
      glucoseAt,
      glucoseSource: sample.source,
      direction,
      latitude: location?.lat,
      longitude: location?.lng,
      locationAt: location?.locationAt,
      locationAccuracyMeters: location?.accuracyMeters,
      locationGapMs: location?.gapMs,
    });
  }

  return { events, nextState: state };
}
