import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { InsightIntradayPoint } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { buildChartYRange, formatIntradayTimeLabel } from '../../lib/insightChartAxis';

type Props = {
  series: InsightIntradayPoint[];
  pageWidth: number;
  color: string;
  unit: string;
  chartKey: string;
  /** Local midnight (ms) for the day being shown. */
  dayStartMs: number;
  dayLabel?: string;
};

const Y_AXIS_W = 36;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const CHART_H = 168;

export function InsightIntradayLineChart({ series, pageWidth, color, unit, chartKey, dayStartMs, dayLabel = 'Today' }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.14)';

  const sorted = [...series]
    .filter((p) => Number.isFinite(p.value) && p.value > 0 && Number.isFinite(p.atMs))
    .sort((a, b) => a.atMs - b.atMs);

  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
  const isToday = dayLabel === 'Today';
  const nowMs = Date.now();
  const rangeEndMs = isToday ? Math.min(nowMs, dayEndMs) : dayEndMs;
  const timeSpan = Math.max(rangeEndMs - dayStartMs, 60_000);
  const innerW = Math.max(pageWidth - Y_AXIS_W - 8, 120);
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;

  if (sorted.length === 0) {
    return null;
  }

  const values = sorted.map((p) => p.value);
  const { min: yMin, max: yMax, ticks: yTicks } = buildChartYRange(values);
  const ySpan = Math.max(yMax - yMin, 1);

  const toX = (atMs: number) => {
    const t = (atMs - dayStartMs) / timeSpan;
    return Y_AXIS_W + Math.max(0, Math.min(1, t)) * innerW;
  };
  const toY = (value: number) => PAD_TOP + (1 - (value - yMin) / ySpan) * innerH;

  const coords = sorted.map((p) => ({ x: toX(p.atMs), y: toY(p.value), ...p }));
  const pathD = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  const timeTickMs = [0, 6, 12, 18].map((h) => dayStartMs + h * 60 * 60 * 1000).filter((t) => t <= rangeEndMs);
  if (!timeTickMs.includes(rangeEndMs) && rangeEndMs > dayStartMs) {
    timeTickMs.push(rangeEndMs);
  }

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
        <Path d={pathD} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
        {coords.length <= 24
          ? coords.map((pt, idx) => (
              <Circle key={`${chartKey}-pt-${idx}`} cx={pt.x} cy={pt.y} fill={theme.screenBackground} r={2.8} stroke={color} strokeWidth={1.6} />
            ))
          : null}
        {timeTickMs.map((t) => {
          const x = toX(t);
          return (
            <Line key={`${chartKey}-xtick-${t}`} x1={x} x2={x} y1={CHART_H - PAD_BOTTOM} y2={CHART_H - PAD_BOTTOM + 4} stroke={gridColor} strokeWidth={1} />
          );
        })}
      </Svg>
      <View style={{ position: 'relative', height: 20, marginLeft: Y_AXIS_W, width: innerW, marginTop: 2 }}>
        {timeTickMs.map((t) => {
          const x = toX(t) - Y_AXIS_W;
          const left = t === dayStartMs ? 0 : t >= rangeEndMs - 60000 ? innerW - 44 : Math.max(0, Math.min(innerW - 44, x - 22));
          return (
            <Text
              key={`${chartKey}-xlabel-${t}`}
              style={{
                position: 'absolute',
                left,
                color: muted,
                fontSize: ts(10),
                fontWeight: '600',
                width: 44,
                textAlign: 'center',
              }}
            >
              {formatIntradayTimeLabel(t)}
            </Text>
          );
        })}
      </View>
      <Text style={{ color: muted, fontSize: ts(11), fontWeight: '600', marginTop: 4, marginLeft: Y_AXIS_W }}>
        {unit} · {dayLabel}
      </Text>
    </View>
  );
}
