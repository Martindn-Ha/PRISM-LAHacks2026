import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { insightMetricTimeContextLabel, type InsightContent } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';

type Props = {
  content: InsightContent;
  greyedOut?: boolean;
};

function freshnessNeedsTick(content: InsightContent): boolean {
  const kind = content.freshness?.kind;
  return kind === 'point-in-time' || kind === 'glucose-latest';
}

export function useInsightMetricTimeLabel(content: InsightContent): string {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!freshnessNeedsTick(content)) {
      return;
    }
    const interval = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [content.freshness]);

  return insightMetricTimeContextLabel(content, nowMs);
}

export function InsightMetricTimeMeta({ content, greyedOut = false }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const label = useInsightMetricTimeLabel(content);

  if (!label) {
    return null;
  }

  return (
    <Text
      numberOfLines={1}
      style={[
        mergePaletteLayer(layers, 'insightsHeartHubRowMeta', styles.insightsHeartHubRowMeta),
        greyedOut && styles.insightsHeartHubRowLabelGreyedOut,
      ]}
    >
      {label}
    </Text>
  );
}
