import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { useDataExport } from '../hooks/useDataExport';
import {
  createDefaultCustomExportRange,
  formatExportDisplayDate,
  type ExportDateRangePreset,
  type ExportFormat,
} from '../lib/healthDataExport';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
import { TrackedTouchableOpacity } from '../components/TrackedTouchableOpacity';

type Props = {
  onClose: () => void;
};

type ActiveDateField = 'start' | 'end' | null;

const DATE_RANGE_OPTIONS: { id: ExportDateRangePreset; label: string }[] = [
  { id: 'last30days', label: 'Last 30 days' },
  { id: 'last12months', label: 'Last 12 months' },
  { id: 'allTime', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

const FORMAT_OPTIONS: { id: ExportFormat; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'csv_zip', label: 'CSV (ZIP)' },
];

export default function ProfileShowcaseScreen({ onClose }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const { status, progress, exportData, reset } = useDataExport();
  const defaultCustomRange = useMemo(() => createDefaultCustomExportRange(), []);
  const [rangePreset, setRangePreset] = useState<ExportDateRangePreset>('last30days');
  const [customStart, setCustomStart] = useState(defaultCustomRange.start);
  const [customEnd, setCustomEnd] = useState(defaultCustomRange.end);
  const [activeDateField, setActiveDateField] = useState<ActiveDateField>(null);
  const [format, setFormat] = useState<ExportFormat>('json');

  const isExporting = status === 'collecting' || status === 'building' || status === 'sharing';
  const activePickerValue = activeDateField === 'start' ? customStart : customEnd;

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    if (rangePreset === 'allTime') {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Export all time?',
          'This may take a minute for large health histories.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ],
        );
      });
      if (!confirmed) {
        return;
      }
    }

    const result = await exportData(
      format,
      rangePreset,
      rangePreset === 'custom' ? { start: customStart, end: customEnd } : undefined,
    );
    if (!result.success) {
      Alert.alert('Export failed', result.errorMessage, [{ text: 'OK', onPress: reset }]);
    }
  };

  const handleDateChange = (date?: Date) => {
    if (!date || !activeDateField) {
      return;
    }

    if (activeDateField === 'start') {
      setCustomStart(date);
      if (date.getTime() > customEnd.getTime()) {
        setCustomEnd(date);
      }
    } else {
      setCustomEnd(date);
      if (date.getTime() < customStart.getTime()) {
        setCustomStart(date);
      }
    }

    if (Platform.OS === 'android') {
      setActiveDateField(null);
    }
  };

  return (
    <View style={mergePaletteLayer(layers, 'profileShowcaseBackdrop', styles.profileShowcaseBackdrop)}>
      <View style={mergePaletteLayer(layers, 'profileShowcaseCard', styles.profileShowcaseCard)}>
        <View style={styles.profileShowcaseHeader}>
          <TrackedTouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.profileShowcaseBackBtn} trackId="profile.back">
            <Ionicons name="chevron-back" size={22} color={theme?.textPrimary ?? '#f8fafc'} />
          </TrackedTouchableOpacity>
          <View style={styles.profileShowcaseHeaderText}>
            <Text style={mergePaletteLayer(layers, 'profileShowcaseTitle', styles.profileShowcaseTitle)}>Export Data</Text>
          </View>
        </View>
        <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.profileShowcaseScroll}>
          <View style={styles.profileExportSection}>
            <Text style={styles.profileExportSectionLabel}>Export my data</Text>

            <View style={styles.profileExportOptionGroup}>
              <Text style={styles.profileExportOptionLabel}>Date range</Text>
              <View style={styles.profileExportSegmentRow}>
                {DATE_RANGE_OPTIONS.map((option) => {
                  const active = rangePreset === option.id;
                  return (
                    <TrackedTouchableOpacity
                      key={option.id}
                      accessibilityRole="button"
                      disabled={isExporting}
                      onPress={() => setRangePreset(option.id)}
                      style={[styles.profileExportSegmentBtn, active && styles.profileExportSegmentBtnActive]}
                      trackId={`profile.export.range.${option.id}`}
                    >
                      <Text style={[styles.profileExportSegmentBtnText, active && styles.profileExportSegmentBtnTextActive]}>
                        {option.label}
                      </Text>
                    </TrackedTouchableOpacity>
                  );
                })}
              </View>

              {rangePreset === 'custom' ? (
                <View style={styles.profileExportCustomRange}>
                  <View style={styles.profileExportDateRow}>
                    <Text style={styles.profileExportDateLabel}>From</Text>
                    <TrackedTouchableOpacity
                      accessibilityRole="button"
                      disabled={isExporting}
                      onPress={() => setActiveDateField('start')}
                      style={styles.profileExportDateBtn}
                      trackId="profile.export.customStart"
                    >
                      <Text style={styles.profileExportDateBtnText}>{formatExportDisplayDate(customStart)}</Text>
                    </TrackedTouchableOpacity>
                  </View>
                  <View style={styles.profileExportDateRow}>
                    <Text style={styles.profileExportDateLabel}>To</Text>
                    <TrackedTouchableOpacity
                      accessibilityRole="button"
                      disabled={isExporting}
                      onPress={() => setActiveDateField('end')}
                      style={styles.profileExportDateBtn}
                      trackId="profile.export.customEnd"
                    >
                      <Text style={styles.profileExportDateBtnText}>{formatExportDisplayDate(customEnd)}</Text>
                    </TrackedTouchableOpacity>
                  </View>

                  {activeDateField && Platform.OS === 'ios' ? (
                    <View style={styles.profileExportDatePickerCard}>
                      <View style={styles.profileExportDatePickerHeader}>
                        <Text style={styles.profileExportDatePickerTitle}>
                          {activeDateField === 'start' ? 'Start date' : 'End date'}
                        </Text>
                        <TrackedTouchableOpacity accessibilityRole="button" onPress={() => setActiveDateField(null)} trackId="profile.export.dateDone">
                          <Text style={styles.profileExportDatePickerDone}>Done</Text>
                        </TrackedTouchableOpacity>
                      </View>
                      <DateTimePicker
                        display="spinner"
                        maximumDate={activeDateField === 'start' ? customEnd : new Date()}
                        minimumDate={activeDateField === 'end' ? customStart : undefined}
                        mode="date"
                        onChange={(_event, date) => handleDateChange(date)}
                        themeVariant="dark"
                        value={activePickerValue}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.profileExportOptionGroup}>
              <Text style={styles.profileExportOptionLabel}>Format</Text>
              <View style={styles.profileExportSegmentRow}>
                {FORMAT_OPTIONS.map((option) => {
                  const active = format === option.id;
                  return (
                    <TrackedTouchableOpacity
                      key={option.id}
                      accessibilityRole="button"
                      disabled={isExporting}
                      onPress={() => setFormat(option.id)}
                      style={[styles.profileExportSegmentBtn, active && styles.profileExportSegmentBtnActive]}
                      trackId={`profile.export.format.${option.id}`}
                    >
                      <Text style={[styles.profileExportSegmentBtnText, active && styles.profileExportSegmentBtnTextActive]}>
                        {option.label}
                      </Text>
                    </TrackedTouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TrackedTouchableOpacity
              accessibilityRole="button"
              disabled={isExporting}
              onPress={() => {
                void handleExport();
              }}
              style={[styles.profileExportPrimaryBtn, isExporting && styles.profileExportPrimaryBtnDisabled]}
              trackId="profile.export.submit"
            >
              <Text style={styles.profileExportPrimaryBtnText}>{isExporting ? 'Preparing export…' : 'Export my data'}</Text>
            </TrackedTouchableOpacity>

            <Text style={styles.profileExportPrivacyText}>
              Contains health data and personality results. Only share with people or services you trust.
            </Text>
            <Text style={styles.profileExportAppleHintText}>
              For all Apple Health data, use Health app → Profile → Export All Health Data.
            </Text>
          </View>
        </ScrollView>
      </View>

      {activeDateField && Platform.OS === 'android' ? (
        <DateTimePicker
          display="default"
          maximumDate={activeDateField === 'start' ? customEnd : new Date()}
          minimumDate={activeDateField === 'end' ? customStart : undefined}
          mode="date"
          onChange={(event, date) => {
            if (event.type === 'dismissed') {
              setActiveDateField(null);
              return;
            }
            handleDateChange(date);
          }}
          value={activePickerValue}
        />
      ) : null}

      <Modal animationType="fade" transparent visible={isExporting}>
        <View style={styles.dataExportProgressBackdrop}>
          <View style={styles.dataExportProgressCard}>
            <ActivityIndicator color={theme?.accent ?? '#38bdf8'} size="large" />
            <Text style={styles.dataExportProgressTitle}>Exporting data</Text>
            <Text style={styles.dataExportProgressSubtitle}>
              {progress
                ? `Fetching ${progress.metricLabel} (${progress.index}/${progress.total})`
                : status === 'building'
                  ? 'Building export file…'
                  : status === 'sharing'
                    ? 'Opening share sheet…'
                    : 'Starting export…'}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
