export type MedicationSchedule = {
  id: string;
  dayKey: string;
  name: string;
  timeLabel?: string;
  takenAt: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export const MEDICATIONS_SECTION_COLOR = '#E8A87C';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function todayDayKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayKeyFromDate(date: Date): string {
  return todayDayKey(date);
}

export function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year!, month! - 1, day);
}

export function formatDayLabel(dayKey: string): string {
  const date = parseDayKey(dayKey);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
