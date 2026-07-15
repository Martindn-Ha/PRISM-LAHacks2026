import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  insightMetricLatestDisplay,
  isInsightMetricGreyedOut,
  type InsightContent,
  type InsightHubConfig,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { TrackedPressable } from '../TrackedPressable';
import { InsightMetricTimeMeta } from './InsightMetricTimeMeta';
import { InsightSleepChartPanel } from './InsightSleepChartPanel';

type Props = {
  hub: InsightHubConfig;
  healthKitReady: boolean;
  insightContentByTab: Record<InsightTab, InsightContent>;
  contentWidth: number;
};

export function InsightSleepDetail({ hub, healthKitReady, insightContentByTab, contentWidth }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const [selectedTab, setSelectedTab] = useState<InsightTab>(hub.rootTab);
  const selectedContent = insightContentByTab[selectedTab];
  const usesSleepChart = Boolean(selectedContent.sleepChart);

  return (
    <View style={styles.insightsDetailBody}>
      {usesSleepChart ? (
        <InsightSleepChartPanel
          chart={selectedContent.sleepChart!}
          pageWidth={contentWidth}
          showStageLanes={selectedTab === 'Sleep'}
        />
      ) : null}

      <View style={styles.insightsHeartHub}>
        {hub.sections.map((section, sectionIndex) => (
          <View key={section.title ?? `section-${sectionIndex}`} style={styles.insightsHeartHubSection}>
            {section.title ? (
              <Text style={mergePaletteLayer(layers, 'insightsMetricSectionLabel', styles.insightsHeartHubSectionLabel)}>
                {section.title}
              </Text>
            ) : null}
            <View style={styles.insightsHeartHubRows}>
              {section.rows.map((row, index) => {
                const content = insightContentByTab[row.tab];
                const rowDisplay = insightMetricLatestDisplay(row.tab, content);
                const greyedOut = isInsightMetricGreyedOut(row.tab, content, healthKitReady);
                const isSelected = selectedTab === row.tab;
                const isLast = index === section.rows.length - 1;

                return (
                  <TrackedPressable
                    key={row.tab}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedTab(row.tab)}
                    style={({ pressed }) => [
                      styles.insightsHeartHubRow,
                      styles.insightsHeartHubRowPressable,
                      !isLast && styles.insightsHeartHubRowBorder,
                      isSelected && styles.insightsHeartHubRowSelected,
                      greyedOut && styles.insightsHeartHubRowGreyedOut,
                      pressed && styles.insightsHeartHubRowPressed,
                    ]}
                    trackId={`insights.sleep.hub.${row.tab}`}
                  >
                    <View style={styles.insightsHeartHubRowText}>
                      <Text
                        style={[
                          mergePaletteLayer(layers, 'insightsHeartHubRowLabel', styles.insightsHeartHubRowLabel),
                          greyedOut && styles.insightsHeartHubRowLabelGreyedOut,
                          isSelected && styles.insightsHeartHubRowLabelSelected,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <InsightMetricTimeMeta content={content} greyedOut={greyedOut} />
                    </View>
                    <View style={styles.insightsHeartHubRowValue}>
                      <Text
                        style={[
                          mergePaletteLayer(layers, 'insightsHeartHubRowNumber', styles.insightsHeartHubRowNumber),
                          greyedOut && styles.insightsHeartHubRowNumberGreyedOut,
                          isSelected && styles.insightsHeartHubRowNumberSelected,
                        ]}
                      >
                        {rowDisplay.value}
                      </Text>
                      <Text
                        style={[
                          mergePaletteLayer(layers, 'insightsHeartHubRowUnit', styles.insightsHeartHubRowUnit),
                          greyedOut && styles.insightsHeartHubRowUnitGreyedOut,
                        ]}
                      >
                        {rowDisplay.unit}
                      </Text>
                    </View>
                  </TrackedPressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {selectedContent.summary && !usesSleepChart ? (
        <Text style={mergePaletteLayer(layers, 'insightsDetailOverviewSummary', styles.insightsDetailSummary)}>
          {selectedContent.summary}
        </Text>
      ) : null}
    </View>
  );
}
