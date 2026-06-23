import { todayDayKey, type MedicationSchedule } from '../constants/medications';

export type CalendarCell = {
  dayKey: string | null;
  dayNum: number;
  isToday: boolean;
};

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function buildMonthCalendar(year: number, month: number, todayKey = todayDayKey()): CalendarCell[] {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ dayKey: null, dayNum: 0, isToday: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dayKey = `${year}-${monthStr}-${dayStr}`;
    cells.push({
      dayKey,
      dayNum: day,
      isToday: dayKey === todayKey,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dayKey: null, dayNum: 0, isToday: false });
  }

  return cells;
}

export function dayKeysWithSchedules(schedules: MedicationSchedule[]): Set<string> {
  const keys = new Set<string>();
  for (const schedule of schedules) {
    if (schedule.deletedAt == null) {
      keys.add(schedule.dayKey);
    }
  }
  return keys;
}
