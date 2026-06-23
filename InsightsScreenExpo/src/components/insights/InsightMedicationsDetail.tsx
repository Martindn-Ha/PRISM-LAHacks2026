import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatDayLabel, MEDICATIONS_SECTION_COLOR, todayDayKey, type MedicationSchedule } from '../../constants/medications';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { dayKeysWithSchedules } from '../../lib/medicationCalendar';
import { schedulesForDay } from '../../lib/medicationChecklist';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { MedicationMonthCalendar } from './MedicationMonthCalendar';

type Props = {
  schedules: MedicationSchedule[];
  onAddSchedule: (dayKey: string, name: string, timeLabel?: string) => void | Promise<void>;
  onDeleteSchedule: (id: string) => void;
  onToggleTaken: (id: string, taken: boolean) => void;
};

export function InsightMedicationsDetail({ schedules, onAddSchedule, onDeleteSchedule, onToggleTaken }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const mutedColor = theme?.textMuted ?? '#94a3b8';
  const textColor = theme?.textPrimary ?? '#f8fafc';
  const inputPlaceholderColor = theme?.textMuted ?? '#64748b';
  const todayKey = todayDayKey();
  const todayDate = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const daysWithSchedules = useMemo(() => dayKeysWithSchedules(schedules), [schedules]);
  const daySchedules = schedulesForDay(schedules, selectedDayKey);
  const canSchedule = newName.trim().length > 0;

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleSchedule = async () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    setScheduling(true);
    try {
      await onAddSchedule(selectedDayKey, name, newTime.trim() || undefined);
      setNewName('');
      setNewTime('');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <View style={styles.medDetailRoot}>
      <MedicationMonthCalendar
        daysWithSchedules={daysWithSchedules}
        month={viewMonth}
        onNextMonth={() => shiftMonth(1)}
        onPrevMonth={() => shiftMonth(-1)}
        onSelectDay={setSelectedDayKey}
        selectedDayKey={selectedDayKey}
        year={viewYear}
      />

      <View style={mergePaletteLayer(layers, 'goalsCard', styles.medDayPanel)}>
        <Text style={mergePaletteLayer(layers, 'goalsCardTitle', styles.medDayPanelTitle)}>
          {formatDayLabel(selectedDayKey)}
        </Text>

        {daySchedules.length === 0 ? (
          <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.goalsEmptyText)}>No medicines scheduled.</Text>
        ) : (
          daySchedules.map((schedule, index) => (
            <View
              key={schedule.id}
              style={[styles.medChecklistRow, index < daySchedules.length - 1 ? styles.medChecklistRowDivider : null]}
            >
              <TouchableOpacity onPress={() => onToggleTaken(schedule.id, schedule.takenAt == null)} style={styles.medChecklistToggle}>
                <Ionicons
                  color={schedule.takenAt != null ? '#4ade80' : mutedColor}
                  name={schedule.takenAt != null ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                />
              </TouchableOpacity>
              <View style={[styles.medChecklistRowText, { flex: 1 }]}>
                <Text style={[mergePaletteLayer(layers, 'goalsCardTitle', styles.medChecklistMedName), { color: textColor }]}>
                  {schedule.name}
                </Text>
                {schedule.timeLabel ? (
                  <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.medChecklistMeta)}>{schedule.timeLabel}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => onDeleteSchedule(schedule.id)} style={styles.medManageActionBtn}>
                <Ionicons color={mutedColor} name="trash-outline" size={18} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[mergePaletteLayer(layers, 'goalsCardTitle', styles.medScheduleFormTitle), { color: textColor }]}>
          Schedule medication
        </Text>
        <TextInput
          onChangeText={setNewName}
          onSubmitEditing={() => void handleSchedule()}
          placeholder="Medicine name"
          placeholderTextColor={inputPlaceholderColor}
          returnKeyType="next"
          style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.medDayAddInput]}
          value={newName}
        />
        <TextInput
          onChangeText={setNewTime}
          onSubmitEditing={() => void handleSchedule()}
          placeholder="Time (optional, e.g. 8:00 AM)"
          placeholderTextColor={inputPlaceholderColor}
          returnKeyType="done"
          style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.medDayAddInput]}
          value={newTime}
        />
        <TouchableOpacity
          disabled={!canSchedule || scheduling}
          onPress={() => void handleSchedule()}
          style={[
            styles.medScheduleBtn,
            { backgroundColor: MEDICATIONS_SECTION_COLOR },
            (!canSchedule || scheduling) && styles.goalCreateBtnDisabled,
          ]}
        >
          <Text style={styles.medScheduleBtnText}>Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
