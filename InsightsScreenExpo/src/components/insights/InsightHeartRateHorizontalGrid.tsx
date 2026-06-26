import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import {
  HEART_RATE_CHART_H,
  heartRatePlotMetrics,
} from '../../lib/heartRateChartLayout';
import type { ChartYRange } from '../../lib/insightChartAxis';

type Props = {
  yRange: ChartYRange;
  plotWidth: number;
  padBottom: number;
};

export function InsightHeartRateHorizontalGrid({ yRange, plotWidth, padBottom }: Props) {
  const { theme } = useDemoPalette();
  const gridColor = 'rgba(148,163,184,0.14)';
  const { toY, baselineY } = heartRatePlotMetrics(yRange, padBottom);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: plotWidth, height: HEART_RATE_CHART_H }}>
      <Svg height={HEART_RATE_CHART_H} width={plotWidth}>
        {yRange.ticks.map((tick) => {
          const y = toY(tick);
          return (
            <Line key={`hr-hgrid-${tick}`} x1={0} x2={plotWidth} y1={y} y2={y} stroke={gridColor} strokeWidth={1} />
          );
        })}
        <Line x1={0} x2={plotWidth} y1={baselineY} y2={baselineY} stroke={gridColor} strokeWidth={1} />
      </Svg>
    </View>
  );
}
