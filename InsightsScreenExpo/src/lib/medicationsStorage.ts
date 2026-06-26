import AsyncStorage from '@react-native-async-storage/async-storage';
import { type MedicationSchedule } from '../constants/medications';

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
  return { id, dayKey, name, timeLabel, takenAt, createdAt, deletedAt };
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
};

export async function createMedicationSchedule(input: CreateMedicationScheduleInput): Promise<MedicationSchedule> {
  const name = input.name.trim();
  const dayKey = input.dayKey.trim();
  if (!name || !dayKey) {
    throw new Error('Medication name and day are required.');
  }
  const schedule: MedicationSchedule = {
    id: createId('med'),
    dayKey,
    name,
    timeLabel: input.timeLabel?.trim() || undefined,
    takenAt: null,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  const schedules = await loadAllMedicationSchedules();
  schedules.unshift(schedule);
  await saveSchedules(schedules);
  return schedule;
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
  return updated;
}

export async function toggleMedicationScheduleTaken(id: string, taken: boolean): Promise<void> {
  const schedules = await loadAllMedicationSchedules();
  const index = schedules.findIndex((schedule) => schedule.id === id);
  if (index < 0) {
    return;
  }
  schedules[index] = {
    ...schedules[index]!,
    takenAt: taken ? new Date().toISOString() : null,
  };
  await saveSchedules(schedules);
}
