import { healthKit } from './appleHealthKit';
import {
  isHealthKitGlucoseObserverAvailable,
  startHealthKitGlucoseObserver,
  stopHealthKitGlucoseObserver,
  subscribeToGlucoseSampleUpdates,
} from './healthKitGlucoseBackground';
import { startLocationUpdates, stopLocationUpdates } from './locationCorrelationSettings';
import { processGlucoseEventsIfEnabled } from './processGlucoseEvents';
import { registerBackgroundGlucoseFetch, unregisterBackgroundGlucoseFetch } from '../tasks/backgroundGlucoseTask';

let unsubscribeNative: (() => void) | null = null;

export async function startHealthEventMonitoring(): Promise<void> {
  await startLocationUpdates();
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
  await stopLocationUpdates();
}

export async function refreshHealthEventMonitoring(): Promise<void> {
  await startHealthEventMonitoring();
}
