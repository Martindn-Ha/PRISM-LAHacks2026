import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TRAIL_STORAGE_KEY = 'prism.locationTrail';
export const LOCATION_TRAIL_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const LOCATION_MATCH_MAX_GAP_MS = 20 * 60 * 1000;
export const LOCATION_TRAIL_MAX_POINTS = 500;

export type LocationTrailPoint = {
  at: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
};

function isValidPoint(raw: unknown): raw is LocationTrailPoint {
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

export function pruneTrailPoints(
  points: LocationTrailPoint[],
  nowMs: number,
  maxAgeMs = LOCATION_TRAIL_MAX_AGE_MS,
  maxPoints = LOCATION_TRAIL_MAX_POINTS,
): LocationTrailPoint[] {
  const cutoff = nowMs - maxAgeMs;
  const pruned = points
    .filter((point) => {
      const ts = new Date(point.at).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (pruned.length <= maxPoints) {
    return pruned;
  }
  return pruned.slice(pruned.length - maxPoints);
}

export async function loadTrail(): Promise<LocationTrailPoint[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_TRAIL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return pruneTrailPoints(parsed.filter(isValidPoint), Date.now());
  } catch {
    return [];
  }
}

export async function saveTrail(points: LocationTrailPoint[]): Promise<void> {
  const pruned = pruneTrailPoints(points, Date.now());
  await AsyncStorage.setItem(LOCATION_TRAIL_STORAGE_KEY, JSON.stringify(pruned));
}

export async function appendLocationPoint(point: LocationTrailPoint): Promise<void> {
  const trail = await loadTrail();
  const pointMs = new Date(point.at).getTime();
  const last = trail[trail.length - 1];
  if (last) {
    const lastMs = new Date(last.at).getTime();
    if (Number.isFinite(lastMs) && Math.abs(pointMs - lastMs) < 60_000) {
      return;
    }
  }
  trail.push(point);
  await saveTrail(trail);
}

export async function clearTrail(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_TRAIL_STORAGE_KEY);
}

export type LocationMatchResult = {
  lat: number;
  lng: number;
  locationAt: string;
  accuracyMeters?: number;
  gapMs: number;
};

export function matchLocationAtTime(
  trail: LocationTrailPoint[],
  timestampMs: number,
  maxGapMs = LOCATION_MATCH_MAX_GAP_MS,
): LocationMatchResult | null {
  if (trail.length === 0 || !Number.isFinite(timestampMs)) {
    return null;
  }

  let best: LocationTrailPoint | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const point of trail) {
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
    locationAt: best.at,
    accuracyMeters: best.accuracyMeters,
    gapMs: bestGap,
  };
}
