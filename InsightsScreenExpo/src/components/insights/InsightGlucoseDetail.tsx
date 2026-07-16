import { useMemo } from 'react';
import { Text, View } from 'react-native';
import {
  insightMetricLatestDisplay,
  isInsightMetricGreyedOut,
  type InsightContent,
  type InsightIntradayPoint,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightMetricTimeMeta } from './InsightMetricTimeMeta';

const GLUCOSE_READINGS_CAP = 200;
const GLUCOSE_TAB = 'Blood Glucose' as const;

type Props = {
  content: InsightContent;
  healthKitReady: boolean;
};

function formatReadingAt(atMs: number): string {
  return new Date(atMs).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function newestGlucoseReadings(content: InsightContent): InsightIntradayPoint[] {
  const samples = content.glucoseChart?.days.flatMap((day) => day.samples) ?? [];
  return [...samples]
    .filter((sample) => Number.isFinite(sample.value) && sample.value > 0 && Number.isFinite(sample.atMs))
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, GLUCOSE_READINGS_CAP);
}

export function InsightGlucoseDetail({ content, healthKitReady }: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const { value, unit } = insightMetricLatestDisplay(GLUCOSE_TAB, content);
  const greyedOut = isInsightMetricGreyedOut(GLUCOSE_TAB, content, healthKitReady);
  const readings = useMemo(() => newestGlucoseReadings(content), [content]);

  return (
    <View style={styles.insightsHeartHub}>
      <View style={styles.insightsHeartHubSection}>
        <View style={styles.insightsHeartHubRows}>
          <View
            style={[
              styles.insightsHeartHubRow,
              styles.insightsHeartHubRowBorder,
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
                Latest
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
        </View>
      </View>

      <View style={styles.insightsHeartHubSection}>
        <Text style={mergePaletteLayer(layers, 'insightsMetricSectionLabel', styles.insightsHeartHubSectionLabel)}>
          Readings
        </Text>
        {readings.length === 0 ? (
          <Text
            style={[
              mergePaletteLayer(layers, 'insightsHeartHubRowMeta', styles.insightsHeartHubRowMeta),
              { paddingVertical: 12 },
            ]}
          >
            {healthKitReady ? 'No blood-glucose samples found.' : 'Connect a glucose source to view readings.'}
          </Text>
        ) : (
          <View style={[styles.insightsHeartHubRows, greyedOut && styles.insightsHeartHubRowGreyedOut]}>
            {readings.map((sample, index) => {
              const isLast = index === readings.length - 1;
              return (
                <View
                  key={`${sample.atMs}-${sample.value}-${index}`}
                  style={[styles.insightsHeartHubRow, !isLast && styles.insightsHeartHubRowBorder]}
                >
                  <View style={styles.insightsHeartHubRowText}>
                    <Text
                      style={mergePaletteLayer(layers, 'insightsHeartHubRowLabel', styles.insightsGlucoseReadingTime)}
                    >
                      {formatReadingAt(sample.atMs)}
                    </Text>
                  </View>
                  <View style={styles.insightsHeartHubRowValue}>
                    <Text
                      style={mergePaletteLayer(layers, 'insightsHeartHubRowNumber', styles.insightsGlucoseReadingValue)}
                    >
                      {Math.round(sample.value)}
                    </Text>
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'insightsHeartHubRowUnit', styles.insightsHeartHubRowUnit),
                        { color: theme?.textMuted ?? '#94a3b8' },
                      ]}
                    >
                      mg/dL
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
