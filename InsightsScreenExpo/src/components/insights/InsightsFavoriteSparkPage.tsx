import { ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { InsightContent, InsightTab } from '../../constants/insights';
import { buildDenseAxisTickIndices, formatTrendPointValue } from '../../lib/insightChartAxis';

type Props = {
  metric: InsightTab;
  content: InsightContent;
  pageWidth: number;
  theme: string;
  iconGlyph: string;
};

export function InsightsFavoriteSparkPage({ metric, content, pageWidth, theme, iconGlyph }: Props) {
  const points = content.trendPoints ?? [0, 0, 0, 0, 0, 0, 0];
  const labels = content.trendLabels ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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
  const axisTickIndices = dense
    ? buildDenseAxisTickIndices(labels, n, tickXs, {
        minGapPx: n > 85 ? 44 : 50,
        maxTicks: n > 85 ? 7 : 9,
      })
    : [];

  const chartSvg = (
    <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={needsScroll ? chartWidth : '100%'}>
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
            <Circle key={`${metric}-spark-${idx}`} cx={pt.x} cy={pt.y} fill="#0f172a" r={3.2} stroke={theme} strokeWidth={1.8} />
          ))
        : null}
    </Svg>
  );

  const labelsRow = dense ? (
    <>
      <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', marginTop: 4 }}>
        {`Low ${formatTrendPointValue(Math.min(...points))} · High ${formatTrendPointValue(Math.max(...points))}`}
      </Text>
      <View style={{ position: 'relative', height: 44, width: chartWidth, marginTop: 2 }}>
        {axisTickIndices.map((idx) => {
          const cx = coords[idx].x;
          const labelW = 50;
          const left = Math.min(chartWidth - labelW, Math.max(0, Math.round(cx - labelW / 2)));
          return (
            <View
              key={`${metric}-spark-axis-${idx}`}
              style={{ position: 'absolute', left, top: 0, width: labelW, alignItems: 'center' }}
            >
              <Text style={{ color: '#e2e8f0', fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
                {formatTrendPointValue(points[idx])}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 9, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                {labels[idx]}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  ) : (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
      {labels.map((label, idx) => (
        <View key={`${metric}-spark-lbl-${idx}`} style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#e2e8f0', fontSize: 10, fontWeight: '800' }}>
            {formatTrendPointValue(points[idx])}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '700', marginTop: 2 }}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );

  const chartBlock = (
    <View style={{ width: needsScroll ? chartWidth : '100%' }}>
      {chartSvg}
      {labelsRow}
    </View>
  );

  return (
    <View style={{ width: pageWidth, paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Text style={{ fontSize: 22, color: theme }}>{iconGlyph}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#93c5fd', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>FAVORITE</Text>
          <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>{metric}</Text>
        </View>
        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>{content.trendUnit}</Text>
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
