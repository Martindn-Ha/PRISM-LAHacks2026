import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { healthKit } from '../lib/appleHealthKit';
import { processGlucoseEventsIfEnabled } from '../lib/processGlucoseEvents';

export const BACKGROUND_GLUCOSE_TASK_NAME = 'PRISM_BACKGROUND_GLUCOSE_TASK';

TaskManager.defineTask(BACKGROUND_GLUCOSE_TASK_NAME, async () => {
  try {
    await processGlucoseEventsIfEnabled(healthKit);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundGlucoseFetch(): Promise<boolean> {
  if (!TaskManager.isTaskDefined(BACKGROUND_GLUCOSE_TASK_NAME)) {
    return false;
  }
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
      return false;
    }
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GLUCOSE_TASK_NAME);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_GLUCOSE_TASK_NAME, {
        minimumInterval: 15,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundGlucoseFetch(): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GLUCOSE_TASK_NAME);
    if (registered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_GLUCOSE_TASK_NAME);
    }
  } catch {
    // Ignore unregister failures.
  }
}

export {};
