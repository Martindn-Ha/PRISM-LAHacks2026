import { dayKeyFromDate, parseDayKey, type MedicationRecurrence } from '../constants/medications';

export const MEDICATION_RECURRENCE_MAX_DAYS = 90;

export function addDaysToDayKey(dayKey: string, days: number): string {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + days);
  return dayKeyFromDate(date);
}

export function compareDayKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Expand start…end inclusive into day keys for once/daily/weekly recurrence. */
export function expandMedicationRecurrenceDayKeys(options: {
  startDayKey: string;
  endDayKey: string;
  recurrence: MedicationRecurrence;
  weekdays?: number[];
  maxDays?: number;
}): string[] {
  const { startDayKey, endDayKey, recurrence } = options;
  const maxDays = options.maxDays ?? MEDICATION_RECURRENCE_MAX_DAYS;

  if (compareDayKeys(endDayKey, startDayKey) < 0) {
    return [startDayKey];
  }

  if (recurrence === 'once') {
    return [startDayKey];
  }

  const start = parseDayKey(startDayKey);
  const end = parseDayKey(endDayKey);
  const weekdaySet =
    recurrence === 'weekly'
      ? new Set(
          (options.weekdays?.length ? options.weekdays : [start.getDay()]).filter(
            (day) => Number.isInteger(day) && day >= 0 && day <= 6,
          ),
        )
      : null;

  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cursor.getTime() <= end.getTime() && keys.length < maxDays) {
    const key = dayKeyFromDate(cursor);
    if (recurrence === 'daily' || (weekdaySet != null && weekdaySet.has(cursor.getDay()))) {
      keys.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys.length > 0 ? keys : [startDayKey];
}
