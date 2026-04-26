import { NativeModules } from 'react-native';
import * as AppleHealthKitModule from 'react-native-health';
const moduleHealthKit = (AppleHealthKitModule as unknown as { default?: unknown; HealthKit?: unknown }).default
  ?? (AppleHealthKitModule as unknown as { HealthKit?: unknown }).HealthKit
  ?? AppleHealthKitModule;
const nativeHealthKit = (NativeModules as { AppleHealthKit?: unknown }).AppleHealthKit;
const rawHealthKit = (nativeHealthKit ?? moduleHealthKit) as Record<string, unknown>;
const moduleConstants = (moduleHealthKit as { Constants?: unknown })?.Constants;
if (!rawHealthKit.Constants && moduleConstants) {
  rawHealthKit.Constants = moduleConstants;
}

export const healthKit = rawHealthKit as {
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
  getWeightSamples?: (
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
  getMindfulSession?: (
    options: unknown,
    callback: (error?: string, result?: Array<{ startDate?: string; endDate?: string }>) => void,
  ) => void;
};
