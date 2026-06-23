import { Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { InsightHeartRateDayBucket, InsightHeartRateMonthBucket } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import {
  HEART_RATE_CHART_H,
  HEART_RATE_PAD_TOP,
  HEART_RATE_RANGE_PAD_BOTTOM,
  heartRatePlotMetrics,
  heartRateTickLabelLeft,
} from '../../lib/heartRateChartLayout';
import { type ChartYRange } from '../../lib/insightChartAxis';

type RangeBucket = Pick<InsightHeartRateDayBucket, 'shortLabel' | 'min' | 'max'> | InsightHeartRateMonthBucket;

type Props = {
  buckets: RangeBucket[];
  plotWidth: number;
  color: string;
  chartKey: string;
  yRange: ChartYRange;
  variant?: 'week' | 'month' | 'year';
};

export function InsightHeartRateRangeChart({ buckets, plotWidth, color, chartKey, yRange, variant }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.12)';

  const active = buckets.filter((b) => b.max > 0);
  const n = buckets.length;
  const innerW = Math.max(plotWidth, 120);
  const { toY, baselineY } = heartRatePlotMetrics(yRange, HEART_RATE_RANGE_PAD_BOTTOM);
  const isSlotView = variant === 'week' || variant === 'year';
  const slotW = innerW / Math.max(n, 1);
  const barGap = n > 20 ? 3 : n > 12 ? 4 : 6;
  const barW = isSlotView ? 7 : Math.max(n > 20 ? 4 : 8, (innerW - barGap * Math.max(n - 1, 0)) / Math.max(n, 1));

  const barX = (idx: number) => (isSlotView ? idx * slotW + (slotW - barW) / 2 : idx * (barW + barGap));
  const xLabelText = (bucket: RangeBucket) => {
    if (variant === 'week' && 'dayStartMs' in bucket) {
      return String(new Date(bucket.dayStartMs).getDate());
    }
    if (variant === 'month' && 'dayStartMs' in bucket) {
      const day = new Date(bucket.dayStartMs).getDate();
      return day % 7 === 0 ? String(day) : '';
    }
    if (variant === 'year' && 'monthStartMs' in bucket) {
      return new Date(bucket.monthStartMs).toLocaleDateString('en-US', { month: 'short' }).charAt(0);
    }
    return bucket.shortLabel;
  };

  const tickXForLabel = (idx: number) =>
    variant === 'month' ? idx * (barW + barGap) : idx * slotW;

  const labelWidth = variant === 'year' ? 16 : 28;

  return (
    <View style={{ width: plotWidth }}>
      <Svg height={HEART_RATE_CHART_H} width={plotWidth}>
        {variant === 'year'
          ? Array.from({ length: n + 1 }, (_, idx) => {
              const x = idx * slotW;
              return (
                <Line
                  key={`${chartKey}-vgrid-${idx}`}
                  x1={x}
                  x2={x}
                  y1={HEART_RATE_PAD_TOP}
                  y2={baselineY}
                  stroke={gridColor}
                  strokeWidth={1}
                />
              );
            })
          : null}
        {active.length > 0
          ? buckets.map((bucket, idx) => {
              if (!(bucket.max > 0)) {
                return null;
              }
              const x = barX(idx);
              const yTop = toY(bucket.max);
              const yBottom = toY(bucket.min);
              const h = Math.max(yBottom - yTop, 3);
              const isLast = idx === n - 1;
              return (
                <Rect
                  key={`${chartKey}-range-${idx}`}
                  fill={color}
                  height={h}
                  opacity={isLast ? 1 : 0.75}
                  rx={Math.min(barW / 2, 4)}
                  ry={Math.min(barW / 2, 4)}
                  width={barW}
                  x={x}
                  y={yTop}
                />
              );
            })
          : null}
      </Svg>
      <View style={{ position: 'relative', height: 20, width: innerW, overflow: 'visible' }}>
        {buckets.map((bucket, idx) => {
          const label = xLabelText(bucket);
          if (!label) {
            return null;
          }
          const tickX = tickXForLabel(idx);
          const left = heartRateTickLabelLeft(tickX, labelWidth, innerW);
          return (
            <Text
              key={`${chartKey}-x-${idx}`}
              numberOfLines={1}
              style={{
                position: 'absolute',
                left,
                color: muted,
                fontSize: ts(variant === 'year' ? 10 : n > 20 ? 9 : 10),
                fontWeight: '700',
                width: labelWidth,
                textAlign: 'left',
              }}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
