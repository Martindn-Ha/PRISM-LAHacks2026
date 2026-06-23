import { useMemo } from 'react';
import { Text, View } from 'react-native';
import {
  insightTabLabel,
  type InsightContent,
  type InsightHeartRateChartData,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { buildChartYRange } from '../../lib/insightChartAxis';
import { getHeartRateHourWindow } from '../../lib/heartRateChartData';
import { GalleryHourRangeChart } from './GalleryHourRangeChart';

type Props = {
  metric: InsightTab;
  content: InsightContent;
  pageWidth: number;
  theme: string;
  iconGlyph: string;
  chart: InsightHeartRateChartData;
};

function glucoseGalleryYRange(samples: { value: number }[]) {
  const values = samples.map((sample) => sample.value).filter((value) => value > 0);
  if (values.length === 0) {
    return { min: 40, max: 200, ticks: [40, 100, 160, 200] };
  }
  return buildChartYRange(values, 0.15);
}

/** Anchor to the hour containing the most recent sample (not wall-clock now). */
function glucoseGalleryAnchorMs(content: InsightContent, chart: InsightHeartRateChartData): number {
  if (content.freshness?.kind === 'glucose-latest' && content.freshness.atMs > 0) {
    return content.freshness.atMs;
  }

  let latest = 0;
  for (const day of chart.days) {
    for (const sample of day.samples) {
      if (sample.atMs > latest) {
        latest = sample.atMs;
      }
    }
  }
  return latest > 0 ? latest : Date.now();
}

export function DashboardGlucoseGalleryPage({ metric, content, pageWidth, theme, iconGlyph, chart }: Props) {
  const { ts } = useTypography();
  const { theme: appTheme } = useDemoPalette();
  const titleColor = appTheme.textPrimary;
  const mutedColor = appTheme.textMuted;
  const chartColor = theme;
  const anchorMs = glucoseGalleryAnchorMs(content, chart);
  const hourWindow = useMemo(() => getHeartRateHourWindow(chart, anchorMs), [anchorMs, chart]);
  const yRange = glucoseGalleryYRange(hourWindow.samples);

  return (
    <View style={{ width: pageWidth, paddingVertical: 4, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, overflow: 'hidden' }}>
        <Text style={{ fontSize: ts(26), color: chartColor }}>{iconGlyph}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={{ color: titleColor, fontSize: ts(19), fontWeight: '800', letterSpacing: -0.2 }}
          >
            {insightTabLabel(metric)}
          </Text>
        </View>
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{ color: mutedColor, fontSize: ts(13), fontWeight: '700', flexShrink: 0, maxWidth: pageWidth * 0.28 }}
        >
          {content.trendUnit}
        </Text>
      </View>
      <GalleryHourRangeChart
        chartKey="gallery-glucose"
        color={chartColor}
        pageWidth={pageWidth}
        samples={hourWindow.samples}
        windowEndMs={hourWindow.windowEndMs}
        windowStartMs={hourWindow.windowStartMs}
        yRange={yRange}
      />
    </View>
  );
}
