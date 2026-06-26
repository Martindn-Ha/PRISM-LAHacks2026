import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthCorrelatedEvent } from './healthEventCorrelator';
import type { GlucoseRangeState } from './healthEventCorrelator';
import { classifyGlucoseState } from './healthEventCorrelator';

export const HEALTH_EVENTS_STORAGE_KEY = 'prism.healthEvents.log';
export const HEALTH_EVENTS_CURSOR_KEY = 'prism.healthEvents.cursor';
export const HEALTH_EVENTS_STATE_KEY = 'prism.healthEvents.glucoseState';
export const HEALTH_EVENTS_MAX_ROWS = 500;

function isValidEvent(raw: unknown): raw is HealthCorrelatedEvent {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const row = raw as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.at === 'string' &&
    typeof row.message === 'string' &&
    typeof row.glucoseValue === 'number' &&
    typeof row.glucoseAt === 'string'
  );
}

export async function loadHealthEvents(): Promise<HealthCorrelatedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(HEALTH_EVENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidEvent);
  } catch {
    return [];
  }
}

export async function appendHealthEvents(events: HealthCorrelatedEvent[]): Promise<HealthCorrelatedEvent[]> {
  if (events.length === 0) {
    return loadHealthEvents();
  }
  const existing = await loadHealthEvents();
  const existingIds = new Set(existing.map((event) => event.id));
  const merged = [...events.filter((event) => !existingIds.has(event.id)), ...existing]
    .sort((a, b) => (a.glucoseAt < b.glucoseAt ? 1 : a.glucoseAt > b.glucoseAt ? -1 : 0))
    .slice(0, HEALTH_EVENTS_MAX_ROWS);
  await AsyncStorage.setItem(HEALTH_EVENTS_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export async function loadLastProcessedSampleMs(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(HEALTH_EVENTS_CURSOR_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function saveLastProcessedSampleMs(timestampMs: number): Promise<void> {
  await AsyncStorage.setItem(HEALTH_EVENTS_CURSOR_KEY, String(timestampMs));
}

export async function loadGlucoseRangeState(): Promise<GlucoseRangeState> {
  try {
    const raw = await AsyncStorage.getItem(HEALTH_EVENTS_STATE_KEY);
    if (raw === 'low' || raw === 'high' || raw === 'severe_high' || raw === 'in_range') {
      return raw;
    }
    return 'in_range';
  } catch {
    return 'in_range';
  }
}

export async function saveGlucoseRangeState(state: GlucoseRangeState): Promise<void> {
  await AsyncStorage.setItem(HEALTH_EVENTS_STATE_KEY, state);
}

export async function clearHealthEvents(): Promise<void> {
  await AsyncStorage.multiRemove([
    HEALTH_EVENTS_STORAGE_KEY,
    HEALTH_EVENTS_CURSOR_KEY,
    HEALTH_EVENTS_STATE_KEY,
  ]);
}

export function toAlertLogEvents(events: HealthCorrelatedEvent[]) {
  return events.map((event) => ({
    id: event.id,
    at: event.at,
    level: event.level,
    source: event.source,
    message: event.message,
    glucoseValue: event.glucoseValue,
    glucoseAt: event.glucoseAt,
    latitude: event.latitude,
    longitude: event.longitude,
    locationAt: event.locationAt,
    direction: event.direction,
  }));
}

export function latestGlucoseStateFromSamples(
  samples: Array<{ valueMgDl: number; timestampMs: number }>,
  fallback: GlucoseRangeState,
): GlucoseRangeState {
  if (samples.length === 0) {
    return fallback;
  }
  const latest = [...samples].sort((a, b) => a.timestampMs - b.timestampMs)[samples.length - 1]!;
  return classifyGlucoseState(latest.valueMgDl);
}
