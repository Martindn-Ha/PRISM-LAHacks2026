import { type MedicationSchedule } from '../constants/medications';

export type MedicationAdherence = {
  taken: number;
  total: number;
};

export type MedicationScheduleExportRow = {
  id: string;
  dayKey: string;
  name: string;
  timeLabel: string;
  takenAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  status: 'active' | 'deleted';
};

export function activeSchedules(schedules: MedicationSchedule[]): MedicationSchedule[] {
  return schedules.filter((schedule) => schedule.deletedAt == null);
}

export function schedulesForDay(schedules: MedicationSchedule[], dayKey: string): MedicationSchedule[] {
  return activeSchedules(schedules)
    .filter((schedule) => schedule.dayKey === dayKey)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function dayAdherence(schedules: MedicationSchedule[], dayKey: string): MedicationAdherence {
  const items = schedulesForDay(schedules, dayKey);
  return {
    taken: items.filter((item) => item.takenAt != null).length,
    total: items.length,
  };
}

export function nextPendingSchedulePreview(schedules: MedicationSchedule[], dayKey: string, limit = 3): string[] {
  const items = schedulesForDay(schedules, dayKey);
  const pending = items.filter((item) => item.takenAt == null);
  if (pending.length === 0) {
    return items.length > 0 ? ['All doses taken'] : [];
  }
  return pending.slice(0, limit).map((item) => (item.timeLabel ? `${item.name} · ${item.timeLabel}` : item.name));
}

export function serializeMedicationSchedulesForExport(schedules: MedicationSchedule[]): MedicationScheduleExportRow[] {
  return schedules.map((schedule) => ({
    id: schedule.id,
    dayKey: schedule.dayKey,
    name: schedule.name,
    timeLabel: schedule.timeLabel ?? '',
    takenAt: schedule.takenAt,
    createdAt: schedule.createdAt,
    deletedAt: schedule.deletedAt,
    status: schedule.deletedAt == null ? 'active' : 'deleted',
  }));
}

export function filterSchedulesInDateRange(
  schedules: MedicationSchedule[],
  dateRange: { start: string; end: string },
): MedicationSchedule[] {
  const startKey = dateRange.start.slice(0, 10);
  const endKey = dateRange.end.slice(0, 10);
  return schedules.filter((schedule) => schedule.dayKey >= startKey && schedule.dayKey <= endKey);
}
