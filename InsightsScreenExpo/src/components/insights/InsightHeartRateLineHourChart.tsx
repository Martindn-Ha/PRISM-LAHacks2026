import { Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { InsightIntradayPoint } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import {
  HEART_RATE_CHART_H,
  HEART_RATE_INTRADAY_PAD_BOTTOM,
  HEART_RATE_PAD_TOP,
  heartRatePlotMetrics,
  heartRateTickLabelLeft,
} from '../../lib/heartRateChartLayout';
import { type ChartYRange } from '../../lib/insightChartAxis';
import { heartRateHourAxisLabelTicks, heartRateHourAxisTicks } from '../../lib/heartRateChartData';
import { InsightHeartRateLineMarkers } from './InsightHeartRateLineMarkers';

type Props = {
  samples: InsightIntradayPoint[];
  windowStartMs: number;
  windowEndMs: number;
  plotWidth: number;
  color: string;
  chartKey: string;
  yRange: ChartYRange;
};

const MS_HOUR = 60 * 60 * 1000;

function formatAppleClockLabel(atMs: number): string {
  return new Date(atMs)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '');
}

export function InsightHeartRateLineHourChart({
  samples,
  windowStartMs,
  windowEndMs,
  plotWidth,
  color,
  chartKey,
  yRange,
}: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.12)';

  const span = Math.max(windowEndMs - windowStartMs, MS_HOUR);
  const readings = samples.filter((sample) => sample.value > 0 && Number.isFinite(sample.atMs));
  const innerW = Math.max(plotWidth, 120);
  const { toY, baselineY } = heartRatePlotMetrics(yRange, HEART_RATE_INTRADAY_PAD_BOTTOM);
  const isEmpty = readings.length === 0;

  const toX = (atMs: number) => {
    const t = (atMs - windowStartMs) / span;
    return Math.max(0, Math.min(1, t)) * innerW;
  };

  const gridMarks = heartRateHourAxisTicks(windowStartMs);
  const labelMarks = heartRateHourAxisLabelTicks(windowStartMs);
  const points = readings.map((sample) => ({ x: toX(sample.atMs), y: toY(sample.value) }));

  return (
    <View style={{ width: plotWidth }}>
      <View style={{ height: HEART_RATE_CHART_H, position: 'relative' }}>
        <Svg height={HEART_RATE_CHART_H} width={plotWidth}>
          {gridMarks.map((tick) => {
            const x = toX(tick);
            return (
              <Line
                key={`${chartKey}-vgrid-${tick}`}
                x1={x}
                x2={x}
                y1={HEART_RATE_PAD_TOP}
                y2={baselineY}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}
          <InsightHeartRateLineMarkers color={color} linePoints={points} />
          <Line x1={0} x2={plotWidth} y1={baselineY} y2={baselineY} stroke={gridColor} strokeWidth={1} />
        </Svg>

        {isEmpty ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: HEART_RATE_PAD_TOP,
              height: baselineY - HEART_RATE_PAD_TOP,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: muted, fontSize: ts(14), fontWeight: '600', textAlign: 'center' }}>
              No readings in this hour
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'relative', height: 20, width: innerW, overflow: 'visible' }}>
        {labelMarks.map((tick) => {
          const tickX = toX(tick);
          const labelW = 56;
          const left = heartRateTickLabelLeft(tickX, labelW, innerW);
          return (
            <Text
              key={`${chartKey}-clock-${tick}`}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={{
                position: 'absolute',
                left,
                color: muted,
                fontSize: ts(10),
                fontWeight: '500',
                width: labelW,
                textAlign: 'left',
              }}
            >
              {formatAppleClockLabel(tick)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
