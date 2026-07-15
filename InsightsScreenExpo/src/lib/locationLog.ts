import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_LOG_STORAGE_KEY = 'prism.locationLog';
/** Previous key; migrated on first load. */
const LEGACY_LOCATION_STORAGE_KEY = 'prism.locationTrail';
export const LOCATION_MATCH_MAX_GAP_MS = 20 * 60 * 1000;
export const LOCATION_LOG_MAX_POINTS = 5000;

export type LocationPoint = {
  at: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
};

function isValidPoint(raw: unknown): raw is LocationPoint {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const row = raw as Record<string, unknown>;
  return (
    typeof row.at === 'string' &&
    typeof row.lat === 'number' &&
    Number.isFinite(row.lat) &&
    typeof row.lng === 'number' &&
    Number.isFinite(row.lng)
  );
}

/** Keep valid points newest-by-time order, capped at maxPoints (no age prune). */
export function pruneLocationPoints(
  points: LocationPoint[],
  _nowMs: number = Date.now(),
  maxPoints = LOCATION_LOG_MAX_POINTS,
): LocationPoint[] {
  const pruned = points
    .filter((point) => Number.isFinite(new Date(point.at).getTime()))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (pruned.length <= maxPoints) {
    return pruned;
  }
  return pruned.slice(pruned.length - maxPoints);
}

async function readRawLocationPoints(): Promise<LocationPoint[]> {
  const primary = await AsyncStorage.getItem(LOCATION_LOG_STORAGE_KEY);
  if (primary) {
    const parsed = JSON.parse(primary) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidPoint);
    }
    return [];
  }

  const legacy = await AsyncStorage.getItem(LEGACY_LOCATION_STORAGE_KEY);
  if (!legacy) {
    return [];
  }
  const parsed = JSON.parse(legacy) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  const points = parsed.filter(isValidPoint);
  await AsyncStorage.setItem(LOCATION_LOG_STORAGE_KEY, JSON.stringify(pruneLocationPoints(points, Date.now())));
  await AsyncStorage.removeItem(LEGACY_LOCATION_STORAGE_KEY);
  return points;
}

export async function loadLocationLog(): Promise<LocationPoint[]> {
  try {
    return pruneLocationPoints(await readRawLocationPoints(), Date.now());
  } catch {
    return [];
  }
}

export async function saveLocationLog(points: LocationPoint[]): Promise<void> {
  const pruned = pruneLocationPoints(points, Date.now());
  await AsyncStorage.setItem(LOCATION_LOG_STORAGE_KEY, JSON.stringify(pruned));
}

export async function appendLocationPoint(point: LocationPoint): Promise<void> {
  const log = await loadLocationLog();
  const pointMs = new Date(point.at).getTime();
  const last = log[log.length - 1];
  if (last) {
    const lastMs = new Date(last.at).getTime();
    if (Number.isFinite(lastMs) && Math.abs(pointMs - lastMs) < 60_000) {
      return;
    }
  }
  log.push(point);
  await saveLocationLog(log);
}

export async function clearLocationLog(): Promise<void> {
  await AsyncStorage.multiRemove([LOCATION_LOG_STORAGE_KEY, LEGACY_LOCATION_STORAGE_KEY]);
}

export function filterLocationLogForExport(
  points: LocationPoint[],
  dateRange: { start: string; end: string },
): LocationPoint[] {
  const startMs = new Date(dateRange.start).getTime();
  const endMs = new Date(dateRange.end).getTime();
  return points.filter((point) => {
    const atMs = new Date(point.at).getTime();
    return Number.isFinite(atMs) && atMs >= startMs && atMs <= endMs;
  });
}

export type LocationMatchResult = {
  lat: number;
  lng: number;
  at: string;
  accuracyMeters?: number;
  gapMs: number;
};

/** Match a timestamp to the nearest stored location point (for export/analysis joins). */
export function matchLocationAtTime(
  points: LocationPoint[],
  timestampMs: number,
  maxGapMs = LOCATION_MATCH_MAX_GAP_MS,
): LocationMatchResult | null {
  if (points.length === 0 || !Number.isFinite(timestampMs)) {
    return null;
  }

  let best: LocationPoint | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const pointMs = new Date(point.at).getTime();
    if (!Number.isFinite(pointMs)) {
      continue;
    }
    const gap = Math.abs(pointMs - timestampMs);
    if (gap < bestGap) {
      bestGap = gap;
      best = point;
    }
  }

  if (!best || bestGap > maxGapMs) {
    return null;
  }

  return {
    lat: best.lat,
    lng: best.lng,
    at: best.at,
    accuracyMeters: best.accuracyMeters,
    gapMs: bestGap,
  };
}
