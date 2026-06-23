import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { insightTabLabel, type InsightContent, type InsightTab } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { getHeartRateHourWindow, heartRateFixedYRange } from '../../lib/heartRateChartData';
import { GalleryHourRangeChart } from './GalleryHourRangeChart';

type Props = {
  metric: InsightTab;
  content: InsightContent;
  pageWidth: number;
  theme: string;
  iconGlyph: string;
};

export function DashboardHeartRateGalleryPage({ metric, content, pageWidth, theme, iconGlyph }: Props) {
  const { ts } = useTypography();
  const { theme: appTheme } = useDemoPalette();
  const titleColor = appTheme.textPrimary;
  const mutedColor = appTheme.textMuted;
  const chartColor = theme;
  const chart = content.heartRateChart;
  const nowMs = Date.now();
  const hourWindow = useMemo(
    () => (chart ? getHeartRateHourWindow(chart, nowMs) : { windowStartMs: 0, windowEndMs: 0, samples: [] }),
    [chart, nowMs],
  );
  const yRange = heartRateFixedYRange('H', chart, 'range');

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
      {chart ? (
        <GalleryHourRangeChart
          chartKey="gallery-heart-rate"
          color={chartColor}
          pageWidth={pageWidth}
          samples={hourWindow.samples}
          variant="stem"
          windowEndMs={hourWindow.windowEndMs}
          windowStartMs={hourWindow.windowStartMs}
          yRange={yRange}
        />
      ) : null}
    </View>
  );
}
