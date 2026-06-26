import { Text, View } from 'react-native';
import { InsightMetricTimeMeta } from './InsightMetricTimeMeta';
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

type Props = {
  hub: InsightHubConfig;
  healthKitReady: boolean;
  insightContentByTab: Record<InsightTab, InsightContent>;
};

export function InsightMetricHubDetail({ hub, healthKitReady, insightContentByTab }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();

  return (
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
              const { value, unit } = insightMetricLatestDisplay(row.tab, content);
              const greyedOut = isInsightMetricGreyedOut(row.tab, content, healthKitReady);
              const isLast = index === section.rows.length - 1;

              return (
                <View
                  key={row.tab}
                  style={[
                    styles.insightsHeartHubRow,
                    !isLast && styles.insightsHeartHubRowBorder,
                    greyedOut && styles.insightsHeartHubRowGreyedOut,
                  ]}
                >
                  <View style={styles.insightsHeartHubRowText}>
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'insightsHeartHubRowLabel', styles.insightsHeartHubRowLabel),
                        greyedOut && styles.insightsHeartHubRowLabelGreyedOut,
                      ]}
                    >
                      {row.tab}
                    </Text>
                    <InsightMetricTimeMeta content={content} greyedOut={greyedOut} />
                  </View>
                  <View style={styles.insightsHeartHubRowValue}>
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'insightsHeartHubRowNumber', styles.insightsHeartHubRowNumber),
                        greyedOut && styles.insightsHeartHubRowNumberGreyedOut,
                      ]}
                    >
                      {value}
                    </Text>
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'insightsHeartHubRowUnit', styles.insightsHeartHubRowUnit),
                        greyedOut && styles.insightsHeartHubRowUnitGreyedOut,
                      ]}
                    >
                      {unit}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
