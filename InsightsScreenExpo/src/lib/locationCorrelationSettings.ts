import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const LOCATION_CORRELATION_ENABLED_KEY = 'prism.locationCorrelation.enabled';
export const LOCATION_TRAIL_TASK_NAME = 'PRISM_LOCATION_TRAIL_TASK';

export async function isLocationCorrelationEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_CORRELATION_ENABLED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setLocationCorrelationEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCATION_CORRELATION_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function requestLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return false;
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

export async function startLocationTrailUpdates(): Promise<boolean> {
  const enabled = await isLocationCorrelationEnabled();
  if (!enabled) {
    return false;
  }

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) {
    return false;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRAIL_TASK_NAME);
  if (started) {
    return true;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TRAIL_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10 * 60 * 1000,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: 'PRISM location trail',
      notificationBody: 'Logging location to correlate with glucose events.',
    },
  });
  return true;
}

export async function stopLocationTrailUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRAIL_TASK_NAME);
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TRAIL_TASK_NAME);
  }
}

export async function enableLocationCorrelation(): Promise<{ ok: boolean; reason?: string }> {
  await setLocationCorrelationEnabled(true);
  const granted = await requestLocationPermissions();
  if (!granted) {
    return { ok: false, reason: 'Location permission was not granted.' };
  }
  try {
    await startLocationTrailUpdates();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Could not start background location updates.',
    };
  }
}

export async function disableLocationCorrelation(clearTrail: () => Promise<void>): Promise<void> {
  await setLocationCorrelationEnabled(false);
  await stopLocationTrailUpdates();
  await clearTrail();
}

export function isLocationTrailTaskDefined(): boolean {
  return TaskManager.isTaskDefined(LOCATION_TRAIL_TASK_NAME);
}
