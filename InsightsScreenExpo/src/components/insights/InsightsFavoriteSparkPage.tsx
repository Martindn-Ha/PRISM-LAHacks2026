import { ScrollView, Text, View } from 'react-native';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import Svg, { Circle, Path } from 'react-native-svg';
import { insightTabLabel, type InsightContent, type InsightTab } from '../../constants/insights';
import {
  alignTrendLabelsForPoints,
  buildDenseAxisTickIndices,
  formatTrendPointValue,
  placeAxisLabelLeft,
  sanitizeInsightTrendPoints,
  scaleChartX,
} from '../../lib/insightChartAxis';

type Props = {
  metric: InsightTab;
  content: InsightContent;
  pageWidth: number;
  theme: string;
  iconGlyph: string;
};

export function InsightsFavoriteSparkPage({ metric, content, pageWidth, theme, iconGlyph }: Props) {
  const { ts } = useTypography();
  const { theme: appTheme } = useDemoPalette();
  const dotFill = appTheme.screenBackground;
  const titleColor = appTheme.textPrimary;
  const mutedColor = appTheme.textMuted;
  const points = sanitizeInsightTrendPoints(content.trendPoints);
  const labels = alignTrendLabelsForPoints(points.length, content.trendLabels ?? null);
  const n = points.length;
  const graphPaddingX = 10;
  const graphPaddingY = 12;
  const chartHeight = n > 40 ? 102 : 96;
  const minOuter = Math.max(200, Math.floor(pageWidth));
  const innerMin = minOuter - graphPaddingX * 2;
  const gaps = Math.max(n - 1, 1);
  const naturalStep = innerMin / gaps;
  const pxBetween = n > 50 ? Math.max(3.25, naturalStep) : n > 14 ? Math.max(5, naturalStep) : naturalStep;
  const chartWidth = Math.round(graphPaddingX * 2 + pxBetween * gaps);
  const needsScroll = chartWidth > minOuter + 6;
  const displayChartWidth = needsScroll ? chartWidth : pageWidth;
  const showDots = n <= 12;
  const strokeW = n > 45 ? 1.6 : n > 18 ? 2 : 2.4;
  const dense = n > 14;

  const max = Math.max(...points, 1);
  const usableWidth = chartWidth - graphPaddingX * 2;
  const usableHeight = chartHeight - graphPaddingY * 2;
  const stepX = gaps > 0 ? usableWidth / gaps : usableWidth;
  const coords = points.map((value, idx) => {
    const x = graphPaddingX + idx * stepX;
    const y = graphPaddingY + (1 - value / max) * usableHeight;
    return { x, y, value };
  });
  const pathD = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const midY = graphPaddingY + usableHeight / 2;
  const tickXs = coords.map((c) => c.x);
  const displayTickXs = tickXs.map((x) => scaleChartX(x, chartWidth, displayChartWidth));
  const labelW = Math.min(58, Math.max(44, Math.floor(displayChartWidth / 6)));
  const axisTickIndices =
    dense || n > 7
      ? buildDenseAxisTickIndices(labels, n, displayTickXs, {
          minGapPx: dense ? (n > 85 ? 44 : 50) : 52,
          maxTicks: dense ? (n > 85 ? 7 : 9) : Math.min(n, 7),
        })
      : labels.map((_, idx) => idx);

  const chartSvg = (
    <Svg
      height={chartHeight}
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      width={needsScroll ? chartWidth : displayChartWidth}
    >
      <Path
        d={`M ${graphPaddingX} ${chartHeight - graphPaddingY} L ${chartWidth - graphPaddingX} ${chartHeight - graphPaddingY}`}
        stroke="rgba(148,163,184,0.16)"
        strokeWidth={1}
      />
      <Path
        d={`M ${graphPaddingX} ${midY} L ${chartWidth - graphPaddingX} ${midY}`}
        stroke="rgba(148,163,184,0.1)"
        strokeDasharray="4 6"
        strokeWidth={1}
      />
      <Path d={pathD} fill="none" stroke={theme} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeW} />
      {showDots
        ? coords.map((pt, idx) => (
            <Circle key={`${metric}-spark-${idx}`} cx={pt.x} cy={pt.y} fill={dotFill} r={3.2} stroke={theme} strokeWidth={1.8} />
          ))
        : null}
    </Svg>
  );

  const labelsRow = (
    <>
      {(dense || n > 7) ? (
        <Text style={{ color: mutedColor, fontSize: ts(12), fontWeight: '600', marginTop: 4 }}>
          {`Low ${formatTrendPointValue(Math.min(...points))} · High ${formatTrendPointValue(Math.max(...points))}`}
        </Text>
      ) : null}
      <View style={{ position: 'relative', height: 48, width: displayChartWidth, marginTop: 2 }}>
        {axisTickIndices.map((idx) => {
          const pt = coords[idx];
          if (!pt || !Number.isFinite(pt.x)) {
            return null;
          }
          const left = placeAxisLabelLeft(pt.x, idx, n, labelW, displayChartWidth, chartWidth);
          return (
            <View
              key={`${metric}-spark-axis-${idx}`}
              style={{ position: 'absolute', left, top: 0, width: labelW, alignItems: 'center' }}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={{ color: titleColor, fontSize: ts(12), fontWeight: '800', width: '100%', textAlign: 'center' }}
              >
                {formatTrendPointValue(points[idx])}
              </Text>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={{
                  color: mutedColor,
                  fontSize: ts(11),
                  fontWeight: '700',
                  marginTop: 2,
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                {labels[idx]}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );

  const chartBlock = (
    <View style={{ width: displayChartWidth }}>
      {chartSvg}
      {labelsRow}
    </View>
  );

  return (
    <View style={{ width: pageWidth, paddingVertical: 4, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, overflow: 'hidden' }}>
        <Text style={{ fontSize: ts(26), color: theme }}>{iconGlyph}</Text>
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
      {needsScroll ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={n > 35}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingRight: 8 }}
        >
          {chartBlock}
        </ScrollView>
      ) : (
        chartBlock
      )}
    </View>
  );
}
