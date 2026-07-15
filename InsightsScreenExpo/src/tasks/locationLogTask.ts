import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { appendLocationPoint } from '../lib/locationLog';
import { LOCATION_LOG_TASK_NAME } from '../lib/locationCorrelationSettings';

function locationToPoint(location: LocationObject) {
  return {
    at: new Date(location.timestamp).toISOString(),
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
  };
}

TaskManager.defineTask(LOCATION_LOG_TASK_NAME, async ({ data, error }) => {
  if (error) {
    return;
  }
  const payload = data as { locations?: LocationObject[] } | undefined;
  const locations = payload?.locations;
  if (!locations?.length) {
    return;
  }
  for (const location of locations) {
    if (!Number.isFinite(location.coords.latitude) || !Number.isFinite(location.coords.longitude)) {
      continue;
    }
    await appendLocationPoint(locationToPoint(location));
  }
});

export {};
