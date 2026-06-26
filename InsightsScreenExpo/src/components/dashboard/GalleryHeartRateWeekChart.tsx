import { Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { InsightHeartRateDayBucket } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { type ChartYRange } from '../../lib/insightChartAxis';

/** Match `InsightsFavoriteSparkPage` chart footprint for gallery parity. */
export const GALLERY_SPARK_CHART_HEIGHT = 96;
export const GALLERY_SPARK_LABEL_ROW_HEIGHT = 48;
const PADDING_X = 10;
const PADDING_Y = 12;

type Props = {
  buckets: InsightHeartRateDayBucket[];
  pageWidth: number;
  color: string;
  yRange: ChartYRange;
};

export function GalleryHeartRateWeekChart({ buckets, pageWidth, color, yRange }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const n = buckets.length;
  const innerW = Math.max(pageWidth - PADDING_X * 2, 120);
  const slotW = innerW / Math.max(n, 1);
  const barW = 7;
  const ySpan = Math.max(yRange.max - yRange.min, 1);
  const usableHeight = GALLERY_SPARK_CHART_HEIGHT - PADDING_Y * 2;
  const baselineY = PADDING_Y + usableHeight;
  const toY = (value: number) => PADDING_Y + (1 - (value - yRange.min) / ySpan) * usableHeight;
  const barX = (idx: number) => PADDING_X + idx * slotW + (slotW - barW) / 2;

  return (
    <View style={{ width: pageWidth }}>
      <Svg height={GALLERY_SPARK_CHART_HEIGHT} width={pageWidth}>
        <Line
          x1={PADDING_X}
          x2={pageWidth - PADDING_X}
          y1={baselineY}
          y2={baselineY}
          stroke="rgba(148,163,184,0.16)"
          strokeWidth={1}
        />
        {buckets.map((bucket, idx) => {
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
              key={`gallery-hr-week-${bucket.dayStartMs}`}
              fill={color}
              height={h}
              opacity={isLast ? 1 : 0.75}
              rx={3.5}
              ry={3.5}
              width={barW}
              x={x}
              y={yTop}
            />
          );
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          width: pageWidth,
          height: GALLERY_SPARK_LABEL_ROW_HEIGHT,
          marginTop: 2,
          paddingHorizontal: PADDING_X,
        }}
      >
        {buckets.map((bucket, idx) => (
          <View key={`gallery-hr-week-label-${bucket.dayStartMs}`} style={{ width: slotW, alignItems: 'center', justifyContent: 'flex-start' }}>
            <Text style={{ color: muted, fontSize: ts(11), fontWeight: '700' }}>{bucket.shortLabel}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
