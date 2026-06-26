import { Pressable, Text, View } from 'react-native';
import { INSIGHT_CHART_PERIODS, type InsightChartPeriod } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';

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
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={[
              styles.insightsChartPeriodSegment,
              selected && styles.insightsChartPeriodSegmentSelected,
            ]}
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
          </Pressable>
        );
      })}
    </View>
  );
}
