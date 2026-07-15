import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  formatDayLabel,
  MEDICATIONS_SECTION_COLOR,
  todayDayKey,
  WEEKDAY_LABELS,
  type MedicationRecurrence,
  type MedicationSchedule,
} from '../../constants/medications';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { dayKeysWithSchedules } from '../../lib/medicationCalendar';
import { schedulesForDay } from '../../lib/medicationChecklist';
import { addDaysToDayKey } from '../../lib/medicationRecurrence';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';
import { MedicationMonthCalendar } from './MedicationMonthCalendar';

type ScheduleDraft = {
  name: string;
  timeLabel?: string;
  timeHour?: number;
  timeMinute?: number;
  recurrence?: MedicationRecurrence;
  endDayKey?: string;
  weekdays?: number[];
};

type Props = {
  schedules: MedicationSchedule[];
  onAddSchedule: (dayKey: string, draft: ScheduleDraft) => void | Promise<void>;
  onUpdateSchedule: (id: string, dayKey: string, draft: ScheduleDraft) => void | Promise<void>;
  onDeleteSchedule: (id: string) => void;
  onToggleTaken: (id: string, taken: boolean) => void;
};

const RECURRENCE_OPTIONS: { id: MedicationRecurrence; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
];

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function defaultTimeDate(): Date {
  const date = new Date();
  date.setSeconds(0, 0);
  return date;
}

function dateFromScheduleTime(schedule: MedicationSchedule): Date | null {
  if (typeof schedule.timeHour !== 'number' || typeof schedule.timeMinute !== 'number') {
    return null;
  }
  const date = defaultTimeDate();
  date.setHours(schedule.timeHour, schedule.timeMinute, 0, 0);
  return date;
}

function dateFromDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(year!, month! - 1, day, 12, 0, 0, 0);
}

export function InsightMedicationsDetail({
  schedules,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onToggleTaken,
}: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const mutedColor = theme?.textMuted ?? '#94a3b8';
  const textColor = theme?.textPrimary ?? '#f8fafc';
  const inputPlaceholderColor = theme?.textMuted ?? '#64748b';
  const todayKey = todayDayKey();
  const todayDate = useMemo(() => new Date(), []);
  const scrollRef = useRef<ScrollView>(null);

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [timeDate, setTimeDate] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState<MedicationRecurrence>('once');
  const [endDayKey, setEndDayKey] = useState(addDaysToDayKey(todayKey, 13));
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([dateFromDayKey(todayKey).getDay()]);
  const [scheduling, setScheduling] = useState(false);

  const daysWithSchedules = useMemo(() => dayKeysWithSchedules(schedules), [schedules]);
  const daySchedules = schedulesForDay(schedules, selectedDayKey);
  const canSchedule = newName.trim().length > 0 && (recurrence === 'once' || endDayKey >= selectedDayKey);
  const timeLabel = timeDate ? formatTimeLabel(timeDate) : undefined;
  const isEditing = editingId != null;

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const scrollFormIntoView = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setNewName('');
    setTimeDate(null);
    setShowTimePicker(false);
    setRecurrence('once');
    setEndDayKey(addDaysToDayKey(selectedDayKey, 13));
    setShowEndDatePicker(false);
    setWeekdays([dateFromDayKey(selectedDayKey).getDay()]);
  };

  const beginEdit = (schedule: MedicationSchedule) => {
    setEditingId(schedule.id);
    setSelectedDayKey(schedule.dayKey);
    setNewName(schedule.name);
    setTimeDate(dateFromScheduleTime(schedule));
    setShowTimePicker(false);
    setRecurrence('once');
    setShowEndDatePicker(false);
    scrollFormIntoView();
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((value) => value !== day);
        return next.length > 0 ? next : prev;
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleTimeChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (!date) {
      return;
    }
    setTimeDate(date);
  };

  const handleEndDateChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (!date) {
      return;
    }
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setEndDayKey(key < selectedDayKey ? selectedDayKey : key);
  };

  const handleSchedule = async () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    const draft: ScheduleDraft = {
      name,
      timeLabel,
      timeHour: timeDate ? timeDate.getHours() : undefined,
      timeMinute: timeDate ? timeDate.getMinutes() : undefined,
      recurrence: isEditing ? 'once' : recurrence,
      endDayKey: !isEditing && recurrence !== 'once' ? endDayKey : undefined,
      weekdays: !isEditing && recurrence === 'weekly' ? weekdays : undefined,
    };
    setScheduling(true);
    try {
      if (editingId) {
        await onUpdateSchedule(editingId, selectedDayKey, draft);
      } else {
        await onAddSchedule(selectedDayKey, draft);
      }
      resetForm();
    } finally {
      setScheduling(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        bounces={Platform.OS === 'ios'}
        contentContainerStyle={styles.medDetailRoot}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MedicationMonthCalendar
          daysWithSchedules={daysWithSchedules}
          month={viewMonth}
          onNextMonth={() => shiftMonth(1)}
          onPrevMonth={() => shiftMonth(-1)}
          onSelectDay={(dayKey) => {
            setSelectedDayKey(dayKey);
            if (!isEditing && recurrence !== 'once' && endDayKey < dayKey) {
              setEndDayKey(addDaysToDayKey(dayKey, 13));
            }
            if (!isEditing) {
              setWeekdays((prev) => (prev.length === 1 ? [dateFromDayKey(dayKey).getDay()] : prev));
            }
          }}
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
                <TrackedTouchableOpacity
                  onPress={() => onToggleTaken(schedule.id, schedule.takenAt == null)}
                  style={styles.medChecklistToggle}
                  trackId={`medications.toggle.${schedule.id}`}
                >
                  <Ionicons
                    color={schedule.takenAt != null ? '#4ade80' : mutedColor}
                    name={schedule.takenAt != null ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                  />
                </TrackedTouchableOpacity>
                <View style={[styles.medChecklistRowText, { flex: 1 }]}>
                  <Text style={[mergePaletteLayer(layers, 'goalsCardTitle', styles.medChecklistMedName), { color: textColor }]}>
                    {schedule.name}
                  </Text>
                  <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.medChecklistMeta)}>
                    {schedule.timeLabel ?? 'Reminder at 9:00 AM'}
                    {schedule.recurrence && schedule.recurrence !== 'once' ? ` · ${schedule.recurrence}` : ''}
                  </Text>
                </View>
                <TrackedTouchableOpacity onPress={() => beginEdit(schedule)} style={styles.medManageActionBtn} trackId={`medications.edit.${schedule.id}`}>
                  <Ionicons color={editingId === schedule.id ? MEDICATIONS_SECTION_COLOR : mutedColor} name="pencil-outline" size={18} />
                </TrackedTouchableOpacity>
                <TrackedTouchableOpacity onPress={() => onDeleteSchedule(schedule.id)} style={styles.medManageActionBtn} trackId={`medications.delete.${schedule.id}`}>
                  <Ionicons color={mutedColor} name="trash-outline" size={18} />
                </TrackedTouchableOpacity>
              </View>
            ))
          )}

          <Text style={[mergePaletteLayer(layers, 'goalsCardTitle', styles.medScheduleFormTitle), { color: textColor }]}>
            {isEditing ? 'Edit medication' : 'Schedule medication'}
          </Text>
          <TextInput
            onChangeText={setNewName}
            onFocus={scrollFormIntoView}
            placeholder="Medicine name"
            placeholderTextColor={inputPlaceholderColor}
            returnKeyType="done"
            style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.medDayAddInput]}
            value={newName}
          />
          <TrackedTouchableOpacity
            accessibilityLabel={timeLabel ? `Time ${timeLabel}` : 'Select time'}
            accessibilityRole="button"
            onPress={() => {
              if (!timeDate) {
                setTimeDate(defaultTimeDate());
              }
              setShowTimePicker((open) => !open);
              setShowEndDatePicker(false);
              scrollFormIntoView();
            }}
            style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.medDayAddInput, styles.medTimePickerBtn]}
            trackId="medications.form.time"
          >
            <Text style={{ color: timeLabel ? textColor : inputPlaceholderColor, fontSize: 16, fontWeight: '600' }}>
              {timeLabel ?? 'Select time (optional, default 9:00 AM)'}
            </Text>
            <Ionicons color={mutedColor} name="time-outline" size={20} />
          </TrackedTouchableOpacity>

          {showTimePicker ? (
            <View style={styles.medTimePickerCard}>
              {Platform.OS === 'ios' ? (
                <View style={styles.medTimePickerHeader}>
                  <Text style={[styles.medTimePickerTitle, { color: textColor }]}>Time</Text>
                  <View style={styles.medTimePickerHeaderActions}>
                    <TrackedTouchableOpacity
                      onPress={() => {
                        setTimeDate(null);
                        setShowTimePicker(false);
                      }}
                      trackId="medications.form.time.clear"
                    >
                      <Text style={styles.medTimePickerClear}>Clear</Text>
                    </TrackedTouchableOpacity>
                    <TrackedTouchableOpacity onPress={() => setShowTimePicker(false)} trackId="medications.form.time.done">
                      <Text style={styles.medTimePickerDone}>Done</Text>
                    </TrackedTouchableOpacity>
                  </View>
                </View>
              ) : null}
              <DateTimePicker
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                mode="time"
                onChange={handleTimeChange}
                themeVariant="dark"
                value={timeDate ?? defaultTimeDate()}
              />
            </View>
          ) : null}

          {!isEditing ? (
            <>
              <Text style={[mergePaletteLayer(layers, 'goalsCardDetail', styles.medChecklistMeta), { marginTop: 4 }]}>Repeat</Text>
              <View style={styles.medRecurrenceRow}>
                {RECURRENCE_OPTIONS.map((option) => {
                  const active = recurrence === option.id;
                  return (
                    <TrackedTouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setRecurrence(option.id);
                        if (option.id !== 'once' && endDayKey < selectedDayKey) {
                          setEndDayKey(addDaysToDayKey(selectedDayKey, 13));
                        }
                        scrollFormIntoView();
                      }}
                      style={[
                        styles.medRecurrenceChip,
                        active && { backgroundColor: MEDICATIONS_SECTION_COLOR, borderColor: MEDICATIONS_SECTION_COLOR },
                      ]}
                      trackId={`medications.form.recurrence.${option.id}`}
                    >
                      <Text style={[styles.medRecurrenceChipText, { color: active ? '#0f172a' : textColor }]}>{option.label}</Text>
                    </TrackedTouchableOpacity>
                  );
                })}
              </View>

              {recurrence !== 'once' ? (
                <>
                  <TrackedTouchableOpacity
                    onPress={() => {
                      setShowEndDatePicker((open) => !open);
                      setShowTimePicker(false);
                      scrollFormIntoView();
                    }}
                    style={[mergePaletteLayer(layers, 'challengeInput', styles.challengeInput), styles.medDayAddInput, styles.medTimePickerBtn]}
                    trackId="medications.form.endDate"
                  >
                    <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>Until {formatDayLabel(endDayKey)}</Text>
                    <Ionicons color={mutedColor} name="calendar-outline" size={20} />
                  </TrackedTouchableOpacity>
                  {showEndDatePicker ? (
                    <View style={styles.medTimePickerCard}>
                      {Platform.OS === 'ios' ? (
                        <View style={styles.medTimePickerHeader}>
                          <Text style={[styles.medTimePickerTitle, { color: textColor }]}>End date</Text>
                          <TrackedTouchableOpacity onPress={() => setShowEndDatePicker(false)} trackId="medications.form.endDate.done">
                            <Text style={styles.medTimePickerDone}>Done</Text>
                          </TrackedTouchableOpacity>
                        </View>
                      ) : null}
                      <DateTimePicker
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={dateFromDayKey(selectedDayKey)}
                        mode="date"
                        onChange={handleEndDateChange}
                        themeVariant="dark"
                        value={dateFromDayKey(endDayKey)}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}

              {recurrence === 'weekly' ? (
                <View style={styles.medWeekdayRow}>
                  {WEEKDAY_LABELS.map((label, day) => {
                    const active = weekdays.includes(day);
                    return (
                      <TrackedTouchableOpacity
                        key={label}
                        onPress={() => toggleWeekday(day)}
                        style={[
                          styles.medWeekdayChip,
                          active && { backgroundColor: MEDICATIONS_SECTION_COLOR, borderColor: MEDICATIONS_SECTION_COLOR },
                        ]}
                        trackId={`medications.form.weekday.${day}`}
                      >
                        <Text style={[styles.medWeekdayChipText, { color: active ? '#0f172a' : textColor }]}>{label.slice(0, 1)}</Text>
                      </TrackedTouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={mergePaletteLayer(layers, 'goalsCardDetail', styles.medChecklistMeta)}>
              Editing updates this dose only.
            </Text>
          )}

          <View style={styles.medScheduleActionsRow}>
            {isEditing ? (
              <TrackedTouchableOpacity disabled={scheduling} onPress={resetForm} style={styles.medCancelEditBtn} trackId="medications.form.cancel">
                <Text style={[styles.medCancelEditBtnText, { color: mutedColor }]}>Cancel</Text>
              </TrackedTouchableOpacity>
            ) : null}
            <TrackedTouchableOpacity
              disabled={!canSchedule || scheduling}
              onPress={() => void handleSchedule()}
              style={[
                styles.medScheduleBtn,
                { backgroundColor: MEDICATIONS_SECTION_COLOR, flex: 1 },
                (!canSchedule || scheduling) && styles.goalCreateBtnDisabled,
              ]}
              trackId={isEditing ? 'medications.form.save' : 'medications.form.schedule'}
            >
              <Text style={styles.medScheduleBtnText}>{isEditing ? 'Save' : 'Schedule'}</Text>
            </TrackedTouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
