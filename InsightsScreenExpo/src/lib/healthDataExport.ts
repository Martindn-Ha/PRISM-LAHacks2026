import Constants from 'expo-constants';
import { loadIpipProgress, loadIpipResults } from '../ipip/storage';
import { loadAllGoals } from './goalsStorage';
import { loadHealthEvents } from './healthEventStorage';
import { loadLocationLog } from './locationLog';
import { loadAllMedicationSchedules } from './medicationsStorage';
import { flushUiInteractions } from './uiInteractionLog';
import { loadUiInteractions } from './uiInteractionStorage';
import { healthKit, type HealthKitApi } from './appleHealthKit';
import {
  buildCsvZipExport,
  buildExportFilename,
  buildJsonExport,
  collectPrismExportData,
  resolveExportDateRange,
  type ExportDateRange,
  type ExportFormat,
  type ExportProgress,
  type PrismExport,
  type PrismIpipExport,
  type PrismGoalsExport,
  type PrismMedicationsExport,
  type PrismHealthEventsExport,
  type PrismLocationExport,
  type PrismUiInteractionsExport,
} from './healthDataExportCore';

export {
  buildCsvZipExport,
  buildExportFilename,
  buildJsonExport,
  collectPrismExportData,
  resolveExportDateRange,
  normalizeCustomExportDateRange,
  createDefaultCustomExportRange,
  formatExportDisplayDate,
  EXPORT_SCHEMA_VERSION,
  type ExportDateRange,
  type ExportCustomDateRange,
  type ExportDateRangePreset,
  type ExportFormat,
  type ExportProgress,
  type ExportRow,
  type ExportWorkoutRow,
  type PrismExport,
  type PrismIpipExport,
  type PrismGoalsExport,
  type PrismMedicationsExport,
  type PrismHealthEventsExport,
  type PrismLocationExport,
  type PrismUiInteractionsExport,
} from './healthDataExportCore';

export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export async function loadPrismAppData(): Promise<{
  ipip: PrismIpipExport;
  goals: Awaited<ReturnType<typeof loadAllGoals>>;
  medicationSchedules: Awaited<ReturnType<typeof loadAllMedicationSchedules>>;
  healthEvents: Awaited<ReturnType<typeof loadHealthEvents>>;
  location: Awaited<ReturnType<typeof loadLocationLog>>;
  uiInteractions: Awaited<ReturnType<typeof loadUiInteractions>>;
}> {
  await flushUiInteractions();
  const [progress, results, goals, medicationSchedules, healthEvents, location, uiInteractions] = await Promise.all([
    loadIpipProgress(),
    loadIpipResults(),
    loadAllGoals(),
    loadAllMedicationSchedules(),
    loadHealthEvents(),
    loadLocationLog(),
    loadUiInteractions(),
  ]);
  return {
    ipip: {
      answers: progress.answers,
      results,
      isComplete: progress.isComplete,
    },
    goals,
    medicationSchedules,
    healthEvents,
    location,
    uiInteractions,
  };
}

export async function collectPrismExport(
  range: ExportDateRange,
  onProgress?: (progress: ExportProgress) => void,
  kit: HealthKitApi = healthKit,
): Promise<PrismExport> {
  const prism = await loadPrismAppData();
  return collectPrismExportData(range, kit, prism, getAppVersion(), onProgress);
}
