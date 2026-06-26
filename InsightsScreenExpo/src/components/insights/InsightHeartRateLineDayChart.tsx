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
import { InsightHeartRateLineMarkers, type LineChartPoint } from './InsightHeartRateLineMarkers';

type Props = {
  samples: InsightIntradayPoint[];
  dayStartMs: number;
  plotWidth: number;
  color: string;
  chartKey: string;
  yRange: ChartYRange;
  /** Last reading from the chronologically previous day — extends the line from the left edge. */
  leadingValue?: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

function formatAppleHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) {
    return '12 AM';
  }
  if (hour === 12) {
    return '12 PM';
  }
  if (hour < 12) {
    return `${hour} AM`;
  }
  return `${hour - 12} PM`;
}

function buildDayStepPath(
  readings: InsightIntradayPoint[],
  innerW: number,
  toX: (atMs: number) => number,
  toY: (value: number) => number,
  leadingValue?: number,
): { linePoints: LineChartPoint[] } {
  const sorted = [...readings].sort((a, b) => a.atMs - b.atMs);
  const linePoints: LineChartPoint[] = [];

  if (sorted.length === 0) {
    if (leadingValue != null && leadingValue > 0) {
      const y = toY(leadingValue);
      linePoints.push({ x: 0, y }, { x: innerW, y });
    }
    return { linePoints };
  }

  const first = sorted[0]!;
  const x0 = toX(first.atMs);
  const y0 = toY(first.value);

  if (leadingValue != null && leadingValue > 0) {
    const yLead = toY(leadingValue);
    linePoints.push({ x: 0, y: yLead }, { x: x0, y: yLead }, { x: x0, y: y0 });
  } else {
    linePoints.push({ x: x0, y: y0 });
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const curr = sorted[i]!;
    const next = sorted[i + 1]!;
    const xNext = toX(next.atMs);
    linePoints.push({ x: xNext, y: toY(curr.value) }, { x: xNext, y: toY(next.value) });
  }

  const last = sorted[sorted.length - 1]!;
  linePoints.push({ x: innerW, y: toY(last.value) });

  return { linePoints };
}

export function InsightHeartRateLineDayChart({
  samples,
  dayStartMs,
  plotWidth,
  color,
  chartKey,
  yRange,
  leadingValue,
}: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.12)';

  const readings = samples.filter((sample) => sample.value > 0 && Number.isFinite(sample.atMs));
  const innerW = Math.max(plotWidth, 120);
  const { toY, baselineY } = heartRatePlotMetrics(yRange, HEART_RATE_INTRADAY_PAD_BOTTOM);

  const toX = (atMs: number) => {
    const t = (atMs - dayStartMs) / MS_DAY;
    return Math.max(0, Math.min(1, t)) * innerW;
  };

  const { linePoints } = buildDayStepPath(readings, innerW, toX, toY, leadingValue);
  const isEmpty = linePoints.length === 0;
  const hourMarks = [0, 6, 12, 18, 24];

  return (
    <View style={{ width: plotWidth }}>
      <View style={{ height: HEART_RATE_CHART_H, position: 'relative' }}>
        <Svg height={HEART_RATE_CHART_H} width={plotWidth}>
          {hourMarks.map((hour) => {
            const x = toX(dayStartMs + hour * 60 * 60 * 1000);
            return (
              <Line
                key={`${chartKey}-vgrid-${hour}`}
                x1={x}
                x2={x}
                y1={HEART_RATE_PAD_TOP}
                y2={baselineY}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}
          {!isEmpty ? (
            <InsightHeartRateLineMarkers color={color} linePoints={linePoints} markerPoints={[]} sharpSteps />
          ) : null}
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
              No readings this day
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'relative', height: 20, width: innerW, overflow: 'visible' }}>
        {hourMarks.slice(0, -1).map((hour) => {
          const tickX = toX(dayStartMs + hour * 60 * 60 * 1000);
          const labelW = 52;
          const left = heartRateTickLabelLeft(tickX, labelW, innerW);
          return (
            <Text
              key={`${chartKey}-hour-${hour}`}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={{
                position: 'absolute',
                left,
                color: muted,
                fontSize: ts(11),
                fontWeight: '500',
                width: labelW,
                textAlign: 'left',
              }}
            >
              {formatAppleHourLabel(hour)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function lastReadingValue(samples: InsightIntradayPoint[]): number | undefined {
  const sorted = samples.filter((sample) => sample.value > 0 && Number.isFinite(sample.atMs)).sort((a, b) => a.atMs - b.atMs);
  return sorted[sorted.length - 1]?.value;
}

export { lastReadingValue };
