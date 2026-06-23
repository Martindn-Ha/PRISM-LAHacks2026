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
const BUCKET_MS = 60 * 1000;

type TimeBucket = {
  startMs: number;
  min: number;
  max: number;
};

function bucketSamples(samples: InsightIntradayPoint[], windowStartMs: number, windowEndMs: number): TimeBucket[] {
  const byBucket = new Map<number, number[]>();
  for (const sample of samples) {
    if (!(sample.value > 0) || !Number.isFinite(sample.atMs)) {
      continue;
    }
    if (sample.atMs < windowStartMs || sample.atMs > windowEndMs) {
      continue;
    }
    const offset = sample.atMs - windowStartMs;
    const bucketStart = windowStartMs + Math.floor(offset / BUCKET_MS) * BUCKET_MS;
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

function formatAppleClockLabel(atMs: number): string {
  return new Date(atMs)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '');
}

export function InsightHeartRateHourChart({
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
  const buckets = bucketSamples(samples, windowStartMs, windowEndMs);
  const innerW = Math.max(plotWidth, 120);
  const { toY, baselineY } = heartRatePlotMetrics(yRange, HEART_RATE_INTRADAY_PAD_BOTTOM);
  const isEmpty = buckets.length === 0;

  const toX = (atMs: number) => {
    const t = (atMs - windowStartMs) / span;
    return Math.max(0, Math.min(1, t)) * innerW;
  };

  const gridMarks = heartRateHourAxisTicks(windowStartMs);
  const labelMarks = heartRateHourAxisLabelTicks(windowStartMs);

  return (
    <View style={{ width: plotWidth }}>
      <View style={{ height: HEART_RATE_CHART_H, position: 'relative' }}>
        <Svg height={HEART_RATE_CHART_H} width={plotWidth}>
          {gridMarks.map((t) => {
            const x = toX(t);
            return (
              <Line
                key={`${chartKey}-vgrid-${t}`}
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
                const centerX = toX(bucket.startMs + BUCKET_MS / 2);
                const yTop = toY(bucket.max);
                const yBottom = toY(bucket.min);
                const stemH = Math.max(yBottom - yTop, 3);
                const stemW = Math.max(2, Math.min(3.5, innerW / 120));
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
        {labelMarks.map((t) => {
          const tickX = toX(t);
          const labelW = 56;
          const left = heartRateTickLabelLeft(tickX, labelW, innerW);
          return (
            <Text
              key={`${chartKey}-clock-${t}`}
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
              {formatAppleClockLabel(t)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
