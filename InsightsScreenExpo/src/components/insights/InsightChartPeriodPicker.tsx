import { Text, View } from 'react-native';
import { INSIGHT_CHART_PERIODS, type InsightChartPeriod } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { TrackedPressable } from '../TrackedPressable';

type Props = {
  period: InsightChartPeriod;
  onChange: (period: InsightChartPeriod) => void;
  periods?: InsightChartPeriod[];
};

export function InsightChartPeriodPicker({ period, onChange, periods = INSIGHT_CHART_PERIODS }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();

  return (
    <View style={styles.insightsChartPeriodPicker}>
      {periods.map((key) => {
        const selected = key === period;
        return (
          <TrackedPressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={[
              styles.insightsChartPeriodSegment,
              selected && styles.insightsChartPeriodSegmentSelected,
            ]}
            trackId={`insights.period.${key.toLowerCase()}`}
          >
            <Text
              style={mergePaletteLayer(
                layers,
                selected ? 'insightsChartPeriodSegmentTextSelected' : 'insightsChartPeriodSegmentText',
                [styles.insightsChartPeriodSegmentText, selected && styles.insightsChartPeriodSegmentTextSelected],
              )}
            >
              {key}
            </Text>
          </TrackedPressable>
        );
      })}
    </View>
  );
}
