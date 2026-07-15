import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { MEDICATIONS_SECTION_COLOR, todayDayKey, type MedicationSchedule } from '../../constants/medications';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { dayAdherence, nextPendingSchedulePreview } from '../../lib/medicationChecklist';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { TrackedPressable } from '../TrackedPressable';

type Props = {
  schedules: MedicationSchedule[];
  onPress: () => void;
};

export function InsightMedicationsSection({ schedules, onPress }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const dayKey = todayDayKey();
  const adherence = dayAdherence(schedules, dayKey);
  const preview = nextPendingSchedulePreview(schedules, dayKey, 2);
  const mutedColor = theme?.textMuted ?? '#94a3b8';

  return (
    <View style={styles.insightsMetricSection}>
      <View style={styles.insightsMetricSectionHeader}>
        <View style={[styles.insightsMetricSectionAccent, { backgroundColor: MEDICATIONS_SECTION_COLOR }]} />
        <View style={styles.insightsMetricSectionHeaderText}>
          <Text style={mergePaletteLayer(layers, 'insightsMetricSectionTitle', styles.insightsMetricSectionTitle)}>
            Medications
          </Text>
        </View>
      </View>
      <View style={mergePaletteLayer(layers, 'insightsMetricSectionDivider', styles.insightsMetricSectionDivider)} />
      <TrackedPressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          mergePaletteLayer(layers, 'insightsMetricCard', styles.insightsMetricCard),
          styles.medSummaryCard,
          pressed && styles.insightsMetricCardPressed,
        ]}
        trackId="insights.medications"
      >
        <View style={[styles.insightsMetricCardBand, { backgroundColor: MEDICATIONS_SECTION_COLOR }]} />
        <View style={styles.medSummaryCardContent}>
          <View style={[styles.insightsMetricCardIconWrap, { borderColor: MEDICATIONS_SECTION_COLOR }]}>
            <Ionicons color={mutedColor} name="medkit-outline" size={20} />
          </View>
          <View style={styles.medSummaryTextBlock}>
            <Text style={mergePaletteLayer(layers, 'insightsMetricCardLabel', styles.insightsMetricCardLabel)}>
              {adherence.total > 0 ? `${adherence.taken}/${adherence.total} today` : 'Track Medication'}
            </Text>
            {preview.length > 0 ? (
              <Text numberOfLines={2} style={mergePaletteLayer(layers, 'insightsMetricCardPreview', styles.medSummaryPreview)}>
                {preview.join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      </TrackedPressable>
    </View>
  );
}
