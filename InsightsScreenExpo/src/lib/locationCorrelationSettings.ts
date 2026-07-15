import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_LOG_TASK_NAME = 'PRISM_LOCATION_LOG_TASK';

export async function requestLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return false;
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

export async function startLocationUpdates(): Promise<boolean> {
  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) {
    return false;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_LOG_TASK_NAME);
  if (started) {
    return true;
  }

  await Location.startLocationUpdatesAsync(LOCATION_LOG_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10 * 60 * 1000,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: 'PRISM location',
      notificationBody: 'Logging location for health context.',
    },
  });
  return true;
}

export async function stopLocationUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_LOG_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_LOG_TASK_NAME);
  }
  // Stop legacy task name if still registered from older builds.
  try {
    const legacyStarted = await Location.hasStartedLocationUpdatesAsync('PRISM_LOCATION_TRAIL_TASK');
    if (legacyStarted) {
      await Location.stopLocationUpdatesAsync('PRISM_LOCATION_TRAIL_TASK');
    }
  } catch {
    // Ignore legacy cleanup failures.
  }
}

export async function enableLocationCorrelation(): Promise<{ ok: boolean; reason?: string }> {
  const granted = await requestLocationPermissions();
  if (!granted) {
    return { ok: false, reason: 'Location permission was not granted.' };
  }
  try {
    await startLocationUpdates();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Could not start background location updates.',
    };
  }
}

export function isLocationLogTaskDefined(): boolean {
  return TaskManager.isTaskDefined(LOCATION_LOG_TASK_NAME);
}
