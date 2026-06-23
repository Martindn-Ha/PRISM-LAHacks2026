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

type Props = {
  samples: InsightIntradayPoint[];
  dayStartMs: number;
  plotWidth: number;
  color: string;
  chartKey: string;
  yRange: ChartYRange;
};

/** One vertical stem per clock hour on the day chart. */
const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * 60 * 60 * 1000;

type TimeBucket = {
  startMs: number;
  min: number;
  max: number;
};

function bucketSamples(samples: InsightIntradayPoint[], dayStartMs: number): TimeBucket[] {
  const byBucket = new Map<number, number[]>();
  for (const sample of samples) {
    if (!(sample.value > 0) || !Number.isFinite(sample.atMs)) {
      continue;
    }
    const offset = sample.atMs - dayStartMs;
    if (offset < 0 || offset >= MS_DAY) {
      continue;
    }
    const bucketStart = dayStartMs + Math.floor(offset / MS_HOUR) * MS_HOUR;
    const bucket = byBucket.get(bucketStart) ?? [];
    bucket.push(Math.round(sample.value));
    byBucket.set(bucketStart, bucket);
  }
  return [...byBucket.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startMs, values]) => ({
      startMs,
      min: Math.min(...values),
      max: Math.max(...values),
    }));
}

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

export function InsightHeartRateDayChart({ samples, dayStartMs, plotWidth, color, chartKey, yRange }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.12)';

  const buckets = bucketSamples(samples, dayStartMs);
  const innerW = Math.max(plotWidth, 120);
  const { toY, baselineY } = heartRatePlotMetrics(yRange, HEART_RATE_INTRADAY_PAD_BOTTOM);
  const isEmpty = buckets.length === 0;

  const toX = (atMs: number) => {
    const t = (atMs - dayStartMs) / MS_DAY;
    return Math.max(0, Math.min(1, t)) * innerW;
  };

  const hourMarks = [0, 6, 12, 18, 24];

  return (
    <View style={{ width: plotWidth }}>
      <View style={{ height: HEART_RATE_CHART_H, position: 'relative' }}>
        <Svg height={HEART_RATE_CHART_H} width={plotWidth}>
          {hourMarks.map((h) => {
            const x = toX(dayStartMs + h * 60 * 60 * 1000);
            return (
              <Line
                key={`${chartKey}-vgrid-${h}`}
                x1={x}
                x2={x}
                y1={HEART_RATE_PAD_TOP}
                y2={baselineY}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}

          {!isEmpty
            ? buckets.map((bucket, idx) => {
                const centerX = toX(bucket.startMs + MS_HOUR / 2);
                const yTop = toY(bucket.max);
                const yBottom = toY(bucket.min);
                const stemH = Math.max(yBottom - yTop, 3);
                const stemW = Math.max(3, Math.min(10, innerW / 48));
                return (
                  <Line
                    key={`${chartKey}-stem-${idx}`}
                    stroke={color}
                    strokeLinecap="round"
                    strokeWidth={stemW}
                    x1={centerX}
                    x2={centerX}
                    y1={yTop}
                    y2={yTop + stemH}
                  />
                );
              })
            : null}

          <Line x1={0} x2={plotWidth} y1={baselineY} y2={baselineY} stroke={gridColor} strokeWidth={1} />
        </Svg>
      </View>

      <View style={{ position: 'relative', height: 20, width: innerW, overflow: 'visible' }}>
        {hourMarks.slice(0, -1).map((h) => {
          const tickX = toX(dayStartMs + h * 60 * 60 * 1000);
          const labelW = 52;
          const left = heartRateTickLabelLeft(tickX, labelW, innerW);
          return (
            <Text
              key={`${chartKey}-hour-${h}`}
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
              {formatAppleHourLabel(h)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
