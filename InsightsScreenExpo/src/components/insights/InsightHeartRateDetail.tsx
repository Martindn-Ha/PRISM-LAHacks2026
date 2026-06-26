import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  insightMetricLatestDisplay,
  insightMetricChartStyle,
  isInsightMetricGreyedOut,
  RESTING_HEART_RATE_CHART_COLOR,
  type InsightContent,
  type InsightHubConfig,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightHeartRateChartPanel } from './InsightHeartRateChartPanel';
import { InsightMetricChart } from './InsightMetricChart';
import { InsightMetricTimeMeta, useInsightMetricTimeLabel } from './InsightMetricTimeMeta';

type Props = {
  hub: InsightHubConfig;
  healthKitReady: boolean;
  insightContentByTab: Record<InsightTab, InsightContent>;
  contentWidth: number;
};

export function InsightHeartRateDetail({ hub, healthKitReady, insightContentByTab, contentWidth }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const [selectedTab, setSelectedTab] = useState<InsightTab>(hub.rootTab);
  const selectedContent = insightContentByTab[selectedTab];
  const { value, unit } = insightMetricLatestDisplay(selectedTab, selectedContent);
  const timeContext = useInsightMetricTimeLabel(selectedContent);
  const chartStyle = insightMetricChartStyle(selectedTab);
  const usesTimeSeriesChart =
    (selectedTab === 'Heart Rate' || selectedTab === 'Resting Heart Rate') && selectedContent.heartRateChart;

  return (
    <View style={styles.insightsDetailBody}>
      {usesTimeSeriesChart ? (
        <InsightHeartRateChartPanel
          chart={selectedContent.heartRateChart!}
          heroMode={selectedTab === 'Resting Heart Rate' ? 'resting' : 'range'}
          pageWidth={contentWidth}
          color={selectedTab === 'Resting Heart Rate' ? RESTING_HEART_RATE_CHART_COLOR : undefined}
          renderStyle={selectedTab === 'Resting Heart Rate' ? 'line' : 'bars'}
        />
      ) : (
        <>
          <View style={styles.insightsDetailHero}>
            <View style={styles.insightsDetailHeroValueRow}>
              <Text style={mergePaletteLayer(layers, 'insightsDetailHeroValue', styles.insightsDetailHeroValue)}>
                {value}
              </Text>
              <Text style={mergePaletteLayer(layers, 'insightsDetailHeroUnit', styles.insightsDetailHeroUnit)}>{unit}</Text>
            </View>
            <Text style={mergePaletteLayer(layers, 'insightsDetailSubtitle', styles.insightsDetailHeroContext)}>
              {timeContext || 'Recent'}
            </Text>
          </View>

          {chartStyle !== 'none' ? (
            <View style={styles.insightsDetailChartWrap}>
              <InsightMetricChart
                chartKey={selectedTab}
                content={selectedContent}
                metric={selectedTab}
                pageWidth={contentWidth}
              />
            </View>
          ) : null}
        </>
      )}

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
                  <Pressable
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
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {selectedContent.summary && !usesTimeSeriesChart ? (
        <Text style={mergePaletteLayer(layers, 'insightsDetailOverviewSummary', styles.insightsDetailSummary)}>
          {selectedContent.summary}
        </Text>
      ) : null}
    </View>
  );
}
