import AsyncStorage from '@react-native-async-storage/async-storage';
import { type MedicationRecurrence, type MedicationSchedule } from '../constants/medications';
import { cancelMedicationNotification, syncMedicationNotification } from './medicationNotifications';
import { expandMedicationRecurrenceDayKeys } from './medicationRecurrence';

const MEDICATION_SCHEDULES_KEY = 'prism.medicationSchedules';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeSchedule(raw: unknown): MedicationSchedule | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id : '';
  const dayKey = typeof row.dayKey === 'string' ? row.dayKey : '';
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : '';
  if (!id || !dayKey || !name || !createdAt) {
    return null;
  }
  const takenAt = row.takenAt == null ? null : typeof row.takenAt === 'string' ? row.takenAt : null;
  const deletedAt = row.deletedAt == null ? null : typeof row.deletedAt === 'string' ? row.deletedAt : null;
  const timeLabel = typeof row.timeLabel === 'string' && row.timeLabel.trim() ? row.timeLabel.trim() : undefined;
  const timeHour =
    typeof row.timeHour === 'number' && Number.isFinite(row.timeHour) ? Math.round(row.timeHour) : undefined;
  const timeMinute =
    typeof row.timeMinute === 'number' && Number.isFinite(row.timeMinute) ? Math.round(row.timeMinute) : undefined;
  const seriesId = typeof row.seriesId === 'string' && row.seriesId.trim() ? row.seriesId.trim() : undefined;
  const recurrenceRaw = row.recurrence;
  const recurrence: MedicationRecurrence | undefined =
    recurrenceRaw === 'once' || recurrenceRaw === 'daily' || recurrenceRaw === 'weekly' ? recurrenceRaw : undefined;
  return {
    id,
    dayKey,
    name,
    timeLabel,
    timeHour,
    timeMinute,
    seriesId,
    recurrence,
    takenAt,
    createdAt,
    deletedAt,
  };
}

async function saveSchedules(schedules: MedicationSchedule[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDICATION_SCHEDULES_KEY, JSON.stringify(schedules));
  } catch {
    // Ignore persistence failures for this session.
  }
}

export async function loadAllMedicationSchedules(): Promise<MedicationSchedule[]> {
  try {
    const raw = await AsyncStorage.getItem(MEDICATION_SCHEDULES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(sanitizeSchedule).filter((row): row is MedicationSchedule => row != null);
  } catch {
    return [];
  }
}

export async function loadActiveMedicationSchedules(): Promise<MedicationSchedule[]> {
  const schedules = await loadAllMedicationSchedules();
  return schedules.filter((schedule) => schedule.deletedAt == null);
}

export type CreateMedicationScheduleInput = {
  dayKey: string;
  name: string;
  timeLabel?: string;
  timeHour?: number;
  timeMinute?: number;
  recurrence?: MedicationRecurrence;
  endDayKey?: string;
  weekdays?: number[];
};

export type UpdateMedicationScheduleInput = {
  id: string;
  dayKey: string;
  name: string;
  timeLabel?: string;
  timeHour?: number;
  timeMinute?: number;
};

export async function createMedicationSchedule(input: CreateMedicationScheduleInput): Promise<MedicationSchedule[]> {
  const name = input.name.trim();
  const dayKey = input.dayKey.trim();
  if (!name || !dayKey) {
    throw new Error('Medication name and day are required.');
  }

  const recurrence: MedicationRecurrence = input.recurrence ?? 'once';
  const endDayKey = (input.endDayKey ?? dayKey).trim();
  const dayKeys = expandMedicationRecurrenceDayKeys({
    startDayKey: dayKey,
    endDayKey,
    recurrence,
    weekdays: input.weekdays,
  });

  const seriesId = recurrence === 'once' ? undefined : createId('medseries');
  const createdAt = new Date().toISOString();
  const created: MedicationSchedule[] = dayKeys.map((key) => ({
    id: createId('med'),
    dayKey: key,
    name,
    timeLabel: input.timeLabel?.trim() || undefined,
    timeHour: input.timeHour,
    timeMinute: input.timeMinute,
    seriesId,
    recurrence,
    takenAt: null,
    createdAt,
    deletedAt: null,
  }));

  const schedules = await loadAllMedicationSchedules();
  schedules.unshift(...created);
  await saveSchedules(schedules);
  await Promise.all(created.map((schedule) => syncMedicationNotification(schedule)));
  return created;
}

export async function updateMedicationSchedule(input: UpdateMedicationScheduleInput): Promise<MedicationSchedule | null> {
  const name = input.name.trim();
  const dayKey = input.dayKey.trim();
  if (!name || !dayKey) {
    throw new Error('Medication name and day are required.');
  }
  const schedules = await loadAllMedicationSchedules();
  const index = schedules.findIndex((schedule) => schedule.id === input.id);
  if (index < 0) {
    return null;
  }
  const updated: MedicationSchedule = {
    ...schedules[index]!,
    dayKey,
    name,
    timeLabel: input.timeLabel?.trim() || undefined,
    timeHour: input.timeHour,
    timeMinute: input.timeMinute,
  };
  schedules[index] = updated;
  await saveSchedules(schedules);
  await syncMedicationNotification(updated);
  return updated;
}

export async function softDeleteMedicationSchedule(id: string): Promise<MedicationSchedule | null> {
  const schedules = await loadAllMedicationSchedules();
  const index = schedules.findIndex((schedule) => schedule.id === id);
  if (index < 0) {
    return null;
  }
  const updated: MedicationSchedule = {
    ...schedules[index]!,
    deletedAt: new Date().toISOString(),
  };
  schedules[index] = updated;
  await saveSchedules(schedules);
  await cancelMedicationNotification(id);
  return updated;
}

export async function toggleMedicationScheduleTaken(id: string, taken: boolean): Promise<void> {
  const schedules = await loadAllMedicationSchedules();
  const index = schedules.findIndex((schedule) => schedule.id === id);
  if (index < 0) {
    return;
  }
  const updated: MedicationSchedule = {
    ...schedules[index]!,
    takenAt: taken ? new Date().toISOString() : null,
  };
  schedules[index] = updated;
  await saveSchedules(schedules);
  await syncMedicationNotification(updated);
}
