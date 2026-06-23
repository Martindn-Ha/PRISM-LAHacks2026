import { Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import type { InsightContent } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import {
  alignTrendLabelsForPoints,
  buildChartYRange,
  formatTrendPointValue,
  sanitizeInsightTrendPoints,
} from '../../lib/insightChartAxis';

type Props = {
  content: InsightContent;
  pageWidth: number;
  color: string;
  chartKey: string;
};

const Y_AXIS_W = 36;
const PAD_TOP = 8;
const PAD_BOTTOM = 36;
const CHART_H = 168;

export function InsightDailyBarChart({ content, pageWidth, color, chartKey }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.14)';

  const points = sanitizeInsightTrendPoints(content.trendPoints);
  const labels = alignTrendLabelsForPoints(points.length, content.trendLabels ?? null);
  const n = points.length;
  const innerW = Math.max(pageWidth - Y_AXIS_W - 8, 120);
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const showZeroValues = content.hubValue != null && Number.isFinite(content.hubValue);
  const hasData = points.some((v) => v > 0) || showZeroValues;

  if (!hasData) {
    return (
      <View style={{ width: pageWidth, height: CHART_H, justifyContent: 'center' }}>
        <Text style={{ color: muted, fontSize: ts(14), fontWeight: '600', textAlign: 'center' }}>
          No data for this period
        </Text>
      </View>
    );
  }

  const { min: yMin, max: yMax, ticks: yTicks } = buildChartYRange(points);
  const ySpan = Math.max(yMax - yMin, 1);
  const barGap = 6;
  const barW = Math.max(8, (innerW - barGap * (n - 1)) / n);

  const toY = (value: number) => PAD_TOP + (1 - (value - yMin) / ySpan) * innerH;
  const baselineY = PAD_TOP + innerH;

  return (
    <View style={{ width: pageWidth }}>
      <Svg height={CHART_H} width={pageWidth}>
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <Line key={`${chartKey}-ygrid-${tick}`} x1={Y_AXIS_W} x2={pageWidth} y1={y} y2={y} stroke={gridColor} strokeWidth={1} />
          );
        })}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <SvgText
              key={`${chartKey}-ylabel-${tick}`}
              fill={muted}
              fontSize={10}
              fontWeight="600"
              textAnchor="end"
              x={Y_AXIS_W - 6}
              y={y + 3}
            >
              {tick}
            </SvgText>
          );
        })}
        {points.map((value, idx) => {
          if (!(value > 0)) {
            return null;
          }
          const x = Y_AXIS_W + idx * (barW + barGap);
          const y = toY(value);
          const h = baselineY - y;
          return (
            <Rect
              key={`${chartKey}-bar-${idx}`}
              fill={color}
              height={Math.max(h, 2)}
              opacity={idx === n - 1 ? 1 : 0.72}
              rx={3}
              ry={3}
              width={barW}
              x={x}
              y={y}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', marginLeft: Y_AXIS_W, width: innerW }}>
        {labels.map((label, idx) => (
          <View key={`${chartKey}-day-${idx}`} style={{ width: barW + (idx < n - 1 ? barGap : 0), alignItems: 'center' }}>
            <Text style={{ color: muted, fontSize: ts(10), fontWeight: '700' }}>{label}</Text>
            {showZeroValues || points[idx]! > 0 ? (
              <Text style={{ color: theme.textPrimary, fontSize: ts(10), fontWeight: '800', marginTop: 2 }}>
                {formatTrendPointValue(points[idx]!)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <Text style={{ color: muted, fontSize: ts(11), fontWeight: '600', marginTop: 4, marginLeft: Y_AXIS_W }}>
        {content.trendUnit} · Past {n} days
      </Text>
    </View>
  );
}
