import { healthKit } from './appleHealthKit';
import {
  isHealthKitGlucoseObserverAvailable,
  startHealthKitGlucoseObserver,
  stopHealthKitGlucoseObserver,
  subscribeToGlucoseSampleUpdates,
} from './healthKitGlucoseBackground';
import { isLocationCorrelationEnabled, startLocationTrailUpdates, stopLocationTrailUpdates } from './locationCorrelationSettings';
import { processGlucoseEventsIfEnabled } from './processGlucoseEvents';
import { registerBackgroundGlucoseFetch, unregisterBackgroundGlucoseFetch } from '../tasks/backgroundGlucoseTask';

let unsubscribeNative: (() => void) | null = null;

export async function startHealthEventMonitoring(): Promise<void> {
  const enabled = await isLocationCorrelationEnabled();
  if (!enabled) {
    return;
  }

  await startLocationTrailUpdates();
  await registerBackgroundGlucoseFetch();

  if (isHealthKitGlucoseObserverAvailable()) {
    unsubscribeNative?.();
    unsubscribeNative = subscribeToGlucoseSampleUpdates(() => {
      void processGlucoseEventsIfEnabled(healthKit);
    });
    await startHealthKitGlucoseObserver();
  }
}

export async function stopHealthEventMonitoring(): Promise<void> {
  unsubscribeNative?.();
  unsubscribeNative = null;
  await stopHealthKitGlucoseObserver();
  await unregisterBackgroundGlucoseFetch();
  await stopLocationTrailUpdates();
}

export async function refreshHealthEventMonitoring(): Promise<void> {
  const enabled = await isLocationCorrelationEnabled();
  if (!enabled) {
    await stopHealthEventMonitoring();
    return;
  }
  await startHealthEventMonitoring();
}
