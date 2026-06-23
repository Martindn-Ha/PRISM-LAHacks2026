import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type HealthKitGlucoseObserverModule = {
  startObserving?: () => Promise<void>;
  stopObserving?: () => Promise<void>;
};

const NativeObserver = NativeModules.HealthKitGlucoseObserver as HealthKitGlucoseObserverModule | undefined;

export function isHealthKitGlucoseObserverAvailable(): boolean {
  return Platform.OS === 'ios' && NativeObserver?.startObserving != null;
}

export async function startHealthKitGlucoseObserver(): Promise<boolean> {
  if (!isHealthKitGlucoseObserverAvailable()) {
    return false;
  }
  try {
    await NativeObserver!.startObserving!();
    return true;
  } catch {
    return false;
  }
}

export async function stopHealthKitGlucoseObserver(): Promise<void> {
  if (!NativeObserver?.stopObserving) {
    return;
  }
  try {
    await NativeObserver.stopObserving();
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
