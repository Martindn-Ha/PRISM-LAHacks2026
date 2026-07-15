import { Text, View } from 'react-native';
import { MEDICATIONS_SECTION_COLOR, WEEKDAY_LABELS } from '../../constants/medications';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { buildMonthCalendar, formatMonthLabel, type CalendarCell } from '../../lib/medicationCalendar';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';

type Props = {
  year: number;
  month: number;
  selectedDayKey: string;
  daysWithSchedules: Set<string>;
  onSelectDay: (dayKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

function chunkWeeks(cells: CalendarCell[]): CalendarCell[][] {
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function MedicationMonthCalendar({
  year,
  month,
  selectedDayKey,
  daysWithSchedules,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const mutedColor = theme?.textMuted ?? '#94a3b8';
  const textColor = theme?.textPrimary ?? '#f8fafc';
  const cells = buildMonthCalendar(year, month);
  const weeks = chunkWeeks(cells);

  return (
    <View style={mergePaletteLayer(layers, 'goalsCard', styles.medCalendarCard)}>
      <View style={styles.medCalendarHeader}>
        <TrackedTouchableOpacity
          accessibilityLabel="Previous month"
          onPress={onPrevMonth}
          style={styles.medCalendarNavBtn}
          trackId="medications.calendar.prevMonth"
        >
          <Text style={[styles.medCalendarNavText, { color: textColor }]}>‹</Text>
        </TrackedTouchableOpacity>
        <Text style={[mergePaletteLayer(layers, 'goalsCardTitle', styles.medCalendarMonthLabel), { color: textColor }]}>
          {formatMonthLabel(year, month)}
        </Text>
        <TrackedTouchableOpacity
          accessibilityLabel="Next month"
          onPress={onNextMonth}
          style={styles.medCalendarNavBtn}
          trackId="medications.calendar.nextMonth"
        >
          <Text style={[styles.medCalendarNavText, { color: textColor }]}>›</Text>
        </TrackedTouchableOpacity>
      </View>

      <View style={styles.medCalendarWeekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={[styles.medCalendarWeekday, { color: mutedColor }]}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={styles.medCalendarWeekRow}>
          {week.map((cell, cellIndex) => {
            if (!cell.dayKey) {
              return <View key={`empty-${weekIndex}-${cellIndex}`} style={styles.medCalendarDayCell} />;
            }
            const selected = cell.dayKey === selectedDayKey;
            const hasSchedules = daysWithSchedules.has(cell.dayKey);
            return (
              <TrackedTouchableOpacity
                key={cell.dayKey}
                accessibilityLabel={`${cell.dayNum}`}
                onPress={() => onSelectDay(cell.dayKey!)}
                style={[
                  styles.medCalendarDayCell,
                  selected && styles.medCalendarDayCellSelected,
                  cell.isToday && !selected && styles.medCalendarDayCellToday,
                ]}
                trackId={`medications.calendar.day.${cell.dayKey}`}
              >
                <Text
                  style={[
                    styles.medCalendarDayNum,
                    { color: selected ? '#0f172a' : textColor },
                    cell.isToday && !selected && { color: MEDICATIONS_SECTION_COLOR },
                  ]}
                >
                  {cell.dayNum}
                </Text>
                {hasSchedules ? <View style={[styles.medCalendarDot, { backgroundColor: MEDICATIONS_SECTION_COLOR }]} /> : null}
              </TrackedTouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
