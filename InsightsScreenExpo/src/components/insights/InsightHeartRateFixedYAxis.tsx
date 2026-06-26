import { View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import {
  HEART_RATE_CHART_H,
  HEART_RATE_Y_AXIS_W,
  heartRatePlotMetrics,
} from '../../lib/heartRateChartLayout';
import type { ChartYRange } from '../../lib/insightChartAxis';

type Props = {
  yRange: ChartYRange;
  padBottom: number;
  side: 'left' | 'right';
};

export function InsightHeartRateFixedYAxis({ yRange, padBottom, side }: Props) {
  const { theme } = useDemoPalette();
  const muted = theme.textMuted;
  const { toY } = heartRatePlotMetrics(yRange, padBottom);
  const labelX = side === 'left' ? HEART_RATE_Y_AXIS_W - 6 : 6;
  const textAnchor = side === 'left' ? 'end' : 'start';

  return (
    <View style={{ width: HEART_RATE_Y_AXIS_W, height: HEART_RATE_CHART_H }}>
      <Svg height={HEART_RATE_CHART_H} width={HEART_RATE_Y_AXIS_W}>
        {yRange.ticks.map((tick) => {
          const y = toY(tick);
          return (
            <SvgText
              key={`hr-yaxis-${side}-${tick}`}
              fill={muted}
              fontSize={side === 'left' ? 10 : 11}
              fontWeight={side === 'left' ? '600' : '500'}
              textAnchor={textAnchor}
              x={labelX}
              y={y + (side === 'left' ? 3 : 4)}
            >
              {tick}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
