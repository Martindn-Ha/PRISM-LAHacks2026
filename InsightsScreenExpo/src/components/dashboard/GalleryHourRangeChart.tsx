import { Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import type { InsightIntradayPoint } from '../../constants/insights';
import { InsightHeartRateLineMarkers } from '../insights/InsightHeartRateLineMarkers';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { type ChartYRange } from '../../lib/insightChartAxis';
import { heartRateHourAxisLabelTicks, heartRateHourAxisTicks } from '../../lib/heartRateChartData';
import { GALLERY_SPARK_CHART_HEIGHT, GALLERY_SPARK_LABEL_ROW_HEIGHT } from './GalleryHeartRateWeekChart';

const MS_HOUR = 60 * 60 * 1000;
const PADDING_X = 10;
const PADDING_Y = 12;

function formatAppleClockLabel(atMs: number): string {
  return new Date(atMs)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '');
}

function readingsInWindow(
  samples: InsightIntradayPoint[],
  windowStartMs: number,
  windowEndMs: number,
): InsightIntradayPoint[] {
  return samples
    .filter((sample) => sample.value > 0 && Number.isFinite(sample.atMs))
    .filter((sample) => sample.atMs >= windowStartMs && sample.atMs <= windowEndMs)
    .sort((a, b) => a.atMs - b.atMs);
}

type Props = {
  samples: InsightIntradayPoint[];
  windowStartMs: number;
  windowEndMs: number;
  pageWidth: number;
  color: string;
  yRange: ChartYRange;
  chartKey: string;
  /** `line` = dots connected by lines (glucose). `stem` = min/max vertical stems (heart rate). */
  variant?: 'line' | 'stem';
};

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

export function GalleryHourRangeChart({
  samples,
  windowStartMs,
  windowEndMs,
  pageWidth,
  color,
  yRange,
  chartKey,
  variant = 'line',
}: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.12)';

  const span = Math.max(windowEndMs - windowStartMs, MS_HOUR);
  const readings = readingsInWindow(samples, windowStartMs, windowEndMs);
  const buckets = variant === 'stem' ? bucketSamples(samples, windowStartMs, windowEndMs) : [];
  const innerW = Math.max(pageWidth - PADDING_X * 2, 120);
  const ySpan = Math.max(yRange.max - yRange.min, 1);
  const usableHeight = GALLERY_SPARK_CHART_HEIGHT - PADDING_Y * 2;
  const baselineY = PADDING_Y + usableHeight;
  const toY = (value: number) => PADDING_Y + (1 - (value - yRange.min) / ySpan) * usableHeight;
  const isEmpty = variant === 'stem' ? buckets.length === 0 : readings.length === 0;

  const toX = (atMs: number) => {
    const t = (atMs - windowStartMs) / span;
    return PADDING_X + Math.max(0, Math.min(1, t)) * innerW;
  };

  const points = readings.map((sample) => ({ x: toX(sample.atMs), y: toY(sample.value) }));
  const gridMarks = heartRateHourAxisTicks(windowStartMs);
  const labelMarks = heartRateHourAxisLabelTicks(windowStartMs);

  return (
    <View style={{ width: pageWidth }}>
      <View style={{ height: GALLERY_SPARK_CHART_HEIGHT, position: 'relative' }}>
        <Svg height={GALLERY_SPARK_CHART_HEIGHT} width={pageWidth}>
          {gridMarks.map((t) => {
            const x = toX(t);
            return (
              <Line
                key={`${chartKey}-vgrid-${t}`}
                x1={x}
                x2={x}
                y1={PADDING_Y}
                y2={baselineY}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}

          {!isEmpty && variant === 'stem'
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

          {!isEmpty && variant === 'line' ? (
            <InsightHeartRateLineMarkers color={color} linePoints={points} pointRadius={3.5} strokeWidth={2} />
          ) : null}

          <Line
            x1={PADDING_X}
            x2={pageWidth - PADDING_X}
            y1={baselineY}
            y2={baselineY}
            stroke={gridColor}
            strokeWidth={1}
          />
        </Svg>

        {isEmpty ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: PADDING_Y,
              height: baselineY - PADDING_Y,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: muted, fontSize: ts(13), fontWeight: '600', textAlign: 'center' }}>
              No readings in this hour
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'relative', height: GALLERY_SPARK_LABEL_ROW_HEIGHT, width: pageWidth, marginTop: 2 }}>
        {labelMarks.map((t) => {
          const tickX = toX(t) - PADDING_X;
          const labelW = 56;
          const left = Math.min(Math.max(tickX, 0), innerW - labelW) + PADDING_X;
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
