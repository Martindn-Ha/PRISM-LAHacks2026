import type { MedicationSchedule } from '../constants/medications';
import { Notifications } from './expoNotifications';

export const MEDICATION_NOTIFICATION_PREFIX = 'med-reminder:';

export function medicationNotificationId(scheduleId: string): string {
  return `${MEDICATION_NOTIFICATION_PREFIX}${scheduleId}`;
}

export function fireDateForMedication(schedule: MedicationSchedule): Date | null {
  const parts = schedule.dayKey.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) {
    return null;
  }
  const hour = typeof schedule.timeHour === 'number' && Number.isFinite(schedule.timeHour) ? schedule.timeHour : 9;
  const minute =
    typeof schedule.timeMinute === 'number' && Number.isFinite(schedule.timeMinute) ? schedule.timeMinute : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export async function cancelMedicationNotification(scheduleId: string): Promise<void> {
  if (!Notifications?.cancelScheduledNotificationAsync) {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(medicationNotificationId(scheduleId));
  } catch {
    // Ignore cancel failures.
  }
}

export async function syncMedicationNotification(schedule: MedicationSchedule): Promise<void> {
  await cancelMedicationNotification(schedule.id);

  if (!Notifications?.scheduleNotificationAsync) {
    return;
  }
  if (schedule.deletedAt != null || schedule.takenAt != null) {
    return;
  }

  const fireAt = fireDateForMedication(schedule);
  if (!fireAt || fireAt.getTime() <= Date.now()) {
    return;
  }

  try {
    if (Notifications.requestPermissionsAsync) {
      await Notifications.requestPermissionsAsync();
    }
    await Notifications.scheduleNotificationAsync({
      identifier: medicationNotificationId(schedule.id),
      content: {
        title: 'Medication reminder',
        body: schedule.timeLabel
          ? `Time to take ${schedule.name} (${schedule.timeLabel}).`
          : `Time to take ${schedule.name}.`,
        sound: true,
        data: { scheduleId: schedule.id, type: 'medication' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
  } catch {
    // Ignore schedule failures.
  }
}

export async function syncAllMedicationNotifications(schedules: MedicationSchedule[]): Promise<void> {
  await Promise.all(schedules.map((schedule) => syncMedicationNotification(schedule)));
}
