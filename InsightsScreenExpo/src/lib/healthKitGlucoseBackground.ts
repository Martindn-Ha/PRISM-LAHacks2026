import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type HealthKitGlucoseObserverModule = {
  startGlucoseObserver?: () => Promise<void>;
  stopGlucoseObserver?: () => Promise<void>;
};

const NativeObserver = NativeModules.HealthKitGlucoseObserver as HealthKitGlucoseObserverModule | undefined;

export function isHealthKitGlucoseObserverAvailable(): boolean {
  return Platform.OS === 'ios' && NativeObserver?.startGlucoseObserver != null;
}

export async function startHealthKitGlucoseObserver(): Promise<boolean> {
  if (!isHealthKitGlucoseObserverAvailable()) {
    return false;
  }
  try {
    await NativeObserver!.startGlucoseObserver!();
    return true;
  } catch {
    return false;
  }
}

export async function stopHealthKitGlucoseObserver(): Promise<void> {
  if (!NativeObserver?.stopGlucoseObserver) {
    return;
  }
  try {
    await NativeObserver.stopGlucoseObserver();
  } catch {
    // Ignore stop failures.
  }
}

export function subscribeToGlucoseSampleUpdates(onUpdate: () => void): () => void {
  if (!isHealthKitGlucoseObserverAvailable()) {
    return () => {};
  }
  const emitter = new NativeEventEmitter(NativeModules.HealthKitGlucoseObserver);
  const subscription = emitter.addListener('glucoseSamplesUpdated', onUpdate);
  return () => subscription.remove();
}
