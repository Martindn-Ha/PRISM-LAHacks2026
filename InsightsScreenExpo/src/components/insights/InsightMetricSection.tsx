import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import {
  INSIGHT_GROUPS,
  isInsightMetricGreyedOut,
  type InsightContent,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightMetricCard } from './InsightMetricCard';

type InsightGroup = (typeof INSIGHT_GROUPS)[number];

type InsightMetricSectionProps = {
  group: InsightGroup;
  healthKitReady: boolean;
  insightContentByTab: Record<InsightTab, InsightContent>;
  onOpenMetric: (metric: InsightTab) => void;
};

export function InsightMetricSection({
  group,
  healthKitReady,
  insightContentByTab,
  onOpenMetric,
}: InsightMetricSectionProps) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const [uniformCardHeight, setUniformCardHeight] = useState(0);
  const measuredHeightsRef = useRef<Partial<Record<InsightTab, number>>>({});

  useEffect(() => {
    measuredHeightsRef.current = {};
    setUniformCardHeight(0);
  }, [group.id, group.tabs]);

  const handleMetricLayout = useCallback(
    (metric: InsightTab, height: number) => {
      if (uniformCardHeight > 0) {
        return;
      }
      measuredHeightsRef.current[metric] = height;
      const heights = group.tabs.map((tab) => measuredHeightsRef.current[tab] ?? 0);
      if (heights.some((value) => value <= 0)) {
        return;
      }
      const maxHeight = Math.max(...heights);
      setUniformCardHeight((prev) => (maxHeight !== prev ? maxHeight : prev));
    },
    [group.tabs, uniformCardHeight],
  );

  return (
    <View style={styles.insightsMetricSection}>
      <View style={styles.insightsMetricSectionHeader}>
        <View style={[styles.insightsMetricSectionAccent, { backgroundColor: group.color }]} />
        <View style={styles.insightsMetricSectionHeaderText}>
          <Text style={mergePaletteLayer(layers, 'insightsMetricSectionTitle', styles.insightsMetricSectionTitle)}>
            {group.title}
          </Text>
        </View>
      </View>
      <View style={mergePaletteLayer(layers, 'insightsMetricSectionDivider', styles.insightsMetricSectionDivider)} />
      <View style={styles.insightsMetricGrid}>
        {group.tabs.map((metric) => (
          <View
            key={`${group.id}-${metric}`}
            style={[
              styles.insightsMetricGridCell,
              uniformCardHeight > 0 ? { height: uniformCardHeight } : null,
            ]}
            onLayout={
              uniformCardHeight > 0
                ? undefined
                : (event) => handleMetricLayout(metric, event.nativeEvent.layout.height)
            }
          >
            <InsightMetricCard
              fillHeight={uniformCardHeight > 0}
              greyedOut={isInsightMetricGreyedOut(metric, insightContentByTab[metric], healthKitReady)}
              groupColor={group.color}
              metric={metric}
              onPress={() => onOpenMetric(metric)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
