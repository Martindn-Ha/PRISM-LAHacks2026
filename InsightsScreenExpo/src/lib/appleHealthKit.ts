import { NativeModules } from 'react-native';

export type HealthKitWorkoutSample = {
  activityId?: number;
  activityName?: string;
  calories?: number;
  tracked?: boolean;
  distance?: number;
  start?: string;
  end?: string;
  duration?: number;
};

export type HealthKitApi = {
  Constants?: {
    Permissions?: Record<string, string>;
    Units?: Record<string, string>;
  };
  initHealthKit?: (config: unknown, callback: (error?: string) => void) => void;
  getLatestHeartRate?: (options: unknown, callback: (error?: string, result?: { value?: number }) => void) => void;
  getHeartRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getRestingHeartRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getHeartRateVariabilitySamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getWalkingHeartRateAverage?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getRespiratoryRateSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getOxygenSaturationSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getStepCount?: (options: unknown, callback: (error?: string, result?: { value?: number }) => void) => void;
  getDailyDistanceWalkingRunningSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getDailyFlightsClimbedSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getSleepSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: string; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getActiveEnergyBurned?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBasalEnergyBurned?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAppleExerciseTime?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAppleStandTime?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBodyTemperatureSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getVo2MaxSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getBloodGlucoseSamples?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
  ) => void;
  getAnchoredWorkouts?: (
    options: unknown,
    callback: (error?: string, result?: { anchor?: string; data?: HealthKitWorkoutSample[] }) => void,
  ) => void;
};

/** Permission *names* in `react-native-health` Constants.Permissions used by Insights charts only (not the full library). */
const INSIGHTS_PERMISSION_NAMES = [
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariability',
  'WalkingHeartRateAverage',
  'RespiratoryRate',
  'OxygenSaturation',
  'StepCount',
  'Steps',
  'DistanceWalkingRunning',
  'FlightsClimbed',
  'ActiveEnergyBurned',
  'BasalEnergyBurned',
  'AppleExerciseTime',
  'AppleStandTime',
  'SleepAnalysis',
  'BodyTemperature',
  'Vo2Max',
  'BloodGlucose',
  'Workout',
] as const;

/**
 * Read types for `initHealthKit` — keep this tight. Requesting every key from Permissions (~90+)
 * often crashes or hangs native HealthKit / the RN bridge on device.
 */
export function buildInsightsHealthKitReadPermissions(permissions: Record<string, string>): string[] {
  const values = INSIGHTS_PERMISSION_NAMES.map((k) => permissions[k]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  return [...new Set(values)];
}

function loadHealthKit(): Record<string, unknown> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AppleHealthKitModule = require('react-native-health') as unknown;
    const moduleHealthKit = (AppleHealthKitModule as { default?: unknown; HealthKit?: unknown }).default
      ?? (AppleHealthKitModule as { HealthKit?: unknown }).HealthKit
      ?? AppleHealthKitModule;
    const nativeHealthKit = (NativeModules as { AppleHealthKit?: unknown }).AppleHealthKit;
    const rawHealthKit = (nativeHealthKit ?? moduleHealthKit) as Record<string, unknown>;
    const moduleConstants = (moduleHealthKit as { Constants?: unknown })?.Constants;
    if (!rawHealthKit.Constants && moduleConstants) {
      rawHealthKit.Constants = moduleConstants;
    }
    return rawHealthKit;
  } catch {
    return {};
  }
}

export const healthKit = loadHealthKit() as HealthKitApi;
