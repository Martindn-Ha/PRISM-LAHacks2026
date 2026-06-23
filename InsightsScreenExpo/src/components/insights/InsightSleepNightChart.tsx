import { Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import type { InsightSleepSegment } from '../../constants/insights';
import {
  HEART_RATE_CHART_H,
  HEART_RATE_INTRADAY_PAD_BOTTOM,
  HEART_RATE_PAD_TOP,
  heartRatePlotMetrics,
  heartRateTickLabelLeft,
} from '../../lib/heartRateChartLayout';
import { type ChartYRange } from '../../lib/insightChartAxis';

type Props = {
  segments: InsightSleepSegment[];
  plotWidth: number;
  color: string;
  chartKey: string;
  yRange: ChartYRange;
  showStages?: boolean;
};

const STAGE_COLORS: Record<InsightSleepSegment['stage'], string> = {
  DEEP: '#4E3F91',
  REM: '#5E8BC7',
  CORE: '#9B8FC6',
  ASLEEP: '#9B8FC6',
};

const STAGE_LANE: Record<InsightSleepSegment['stage'], number> = {
  REM: 0,
  CORE: 1,
  DEEP: 2,
  ASLEEP: 1,
};

const STAGE_LABEL_W = 44;

const STAGE_LANE_LABELS: { stage: 'REM' | 'CORE' | 'DEEP'; label: string }[] = [
  { stage: 'REM', label: 'REM' },
  { stage: 'CORE', label: 'Core' },
  { stage: 'DEEP', label: 'Deep' },
];

function formatClockShort(atMs: number): string {
  return new Date(atMs)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '');
}

export function InsightSleepNightChart({ segments, plotWidth, color, chartKey, yRange, showStages = true }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const gridColor = 'rgba(148,163,184,0.12)';

  const labelGutter = showStages ? STAGE_LABEL_W : 0;
  const innerW = Math.max(plotWidth - labelGutter, 120);
  const { baselineY } = heartRatePlotMetrics(yRange, HEART_RATE_INTRADAY_PAD_BOTTOM);
  const plotTop = HEART_RATE_PAD_TOP;
  const plotH = baselineY - plotTop;
  const isEmpty = segments.length === 0;

  const windowStartMs = isEmpty ? Date.now() : Math.min(...segments.map((segment) => segment.startMs));
  const windowEndMs = isEmpty ? windowStartMs + 60 * 60 * 1000 : Math.max(...segments.map((segment) => segment.endMs));
  const span = Math.max(windowEndMs - windowStartMs, 60 * 60 * 1000);

  const toX = (atMs: number) => {
    const t = (atMs - windowStartMs) / span;
    return Math.max(0, Math.min(1, t)) * innerW;
  };

  const laneCount = showStages ? 3 : 1;
  const laneH = plotH / laneCount;
  const laneY = (lane: number) => plotTop + lane * laneH + laneH * 0.18;
  const laneBlockH = laneH * 0.64;

  const labelTimes = isEmpty
    ? []
    : [windowStartMs, windowStartMs + span / 2, windowEndMs].filter((value, idx, arr) => arr.indexOf(value) === idx);

  return (
    <View style={{ width: plotWidth }}>
      <View style={{ height: HEART_RATE_CHART_H, position: 'relative', flexDirection: 'row' }}>
        {showStages ? (
          <View style={{ width: labelGutter, height: HEART_RATE_CHART_H, position: 'relative' }}>
            {STAGE_LANE_LABELS.map(({ stage, label }) => {
              const lane = STAGE_LANE[stage];
              const top = laneY(lane) + laneBlockH / 2 - 7;
              return (
                <View
                  key={`${chartKey}-lane-label-${stage}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      backgroundColor: STAGE_COLORS[stage],
                    }}
                  />
                  <Text style={{ color: muted, fontSize: ts(9), fontWeight: '600' }}>{label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <Svg height={HEART_RATE_CHART_H} width={innerW}>
          {showStages
            ? [1, 2].map((lane) => {
                const y = plotTop + lane * laneH;
                return (
                  <Line
                    key={`${chartKey}-hgrid-${lane}`}
                    x1={0}
                    x2={innerW}
                    y1={y}
                    y2={y}
                    stroke={gridColor}
                    strokeWidth={1}
                  />
                );
              })
            : null}
          {labelTimes.map((tick) => {
            const x = toX(tick);
            return (
              <Line
                key={`${chartKey}-vgrid-${tick}`}
                x1={x}
                x2={x}
                y1={plotTop}
                y2={baselineY}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}
          {!isEmpty
            ? segments.map((segment, idx) => {
                const x = toX(segment.startMs);
                const width = Math.max(toX(segment.endMs) - x, 3);
                const lane = showStages ? STAGE_LANE[segment.stage] : 0;
                const fill = showStages ? STAGE_COLORS[segment.stage] : color;
                return (
                  <Rect
                    key={`${chartKey}-seg-${idx}`}
                    fill={fill}
                    height={laneBlockH}
                    opacity={0.95}
                    rx={3}
                    ry={3}
                    width={width}
                    x={x}
                    y={laneY(lane)}
                  />
                );
              })
            : null}
          <Line x1={0} x2={innerW} y1={baselineY} y2={baselineY} stroke={gridColor} strokeWidth={1} />
        </Svg>

        {isEmpty ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: labelGutter,
              right: 0,
              top: plotTop,
              height: plotH,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: muted, fontSize: ts(14), fontWeight: '600', textAlign: 'center' }}>
              No sleep recorded this night
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'relative', height: 20, width: plotWidth, overflow: 'visible', marginLeft: labelGutter }}>
        {labelTimes.slice(0, -1).map((tick) => {
          const tickX = toX(tick);
          const labelW = 56;
          const left = heartRateTickLabelLeft(tickX, labelW, innerW);
          return (
            <Text
              key={`${chartKey}-clock-${tick}`}
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
              {formatClockShort(tick)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
