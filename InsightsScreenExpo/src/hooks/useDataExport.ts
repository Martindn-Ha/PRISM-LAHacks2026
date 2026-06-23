import { useCallback, useState } from 'react';
import {
  buildCsvZipExport,
  buildExportFilename,
  buildJsonExport,
  collectPrismExport,
  resolveExportDateRange,
  type ExportCustomDateRange,
  type ExportDateRangePreset,
  type ExportFormat,
  type ExportProgress,
} from '../lib/healthDataExport';
import { getHealthKitLinked } from '../lib/healthKitConnection';
import { ExportShareError, shareExportBytes, shareExportText } from '../lib/shareExportFile';

export type DataExportStatus = 'idle' | 'collecting' | 'building' | 'sharing' | 'error';

export type UseDataExportResult = {
  status: DataExportStatus;
  progress: ExportProgress | null;
  errorMessage: string | null;
  exportData: (
    format: ExportFormat,
    rangePreset: ExportDateRangePreset,
    customRange?: ExportCustomDateRange,
  ) => Promise<{ success: true } | { success: false; errorMessage: string }>;
  reset: () => void;
};

export function useDataExport(): UseDataExportResult {
  const [status, setStatus] = useState<DataExportStatus>('idle');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setErrorMessage(null);
  }, []);

  const exportData = useCallback(async (format: ExportFormat, rangePreset: ExportDateRangePreset, customRange?: ExportCustomDateRange) => {
    reset();
    setStatus('collecting');

    try {
      const linked = await getHealthKitLinked();
      if (!linked) {
        throw new ExportShareError('Connect Apple Health in PRISM before exporting health data.');
      }

      const range = resolveExportDateRange(rangePreset, new Date(), customRange);
      const exportPayload = await collectPrismExport(range, (next) => {
        setProgress(next);
      });

      setStatus('building');
      const filename = buildExportFilename(format);

      setStatus('sharing');
      if (format === 'json') {
        await shareExportText(filename, buildJsonExport(exportPayload), format);
      } else {
        const zipBytes = await buildCsvZipExport(exportPayload);
        await shareExportBytes(filename, zipBytes, format);
      }

      setStatus('idle');
      setProgress(null);
      return { success: true as const };
    } catch (error) {
      const message =
        error instanceof ExportShareError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Export failed. Please try again.';
      setStatus('error');
      setErrorMessage(message);
      return { success: false as const, errorMessage: message };
    }
  }, [reset]);

  return {
    status,
    progress,
    errorMessage,
    exportData,
    reset,
  };
}
