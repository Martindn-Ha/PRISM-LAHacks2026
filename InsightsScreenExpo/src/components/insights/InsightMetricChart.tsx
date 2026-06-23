import { Text, View } from 'react-native';
import {
  APPLE_HEART_RATE_CHART_COLOR,
  insightMetricChartStyle,
  type InsightContent,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { sanitizeInsightTrendPoints } from '../../lib/insightChartAxis';
import { InsightDailyBarChart } from './InsightDailyBarChart';
import { InsightIntradayLineChart } from './InsightIntradayLineChart';

type Props = {
  metric: InsightTab;
  content: InsightContent;
  pageWidth: number;
  chartKey: string;
  color?: string;
};

function todayStartMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function intradayDayLabel(dayStartMs: number | undefined): string {
  if (dayStartMs == null) {
    return 'Today';
  }
  const today = todayStartMs();
  if (dayStartMs === today) {
    return 'Today';
  }
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (dayStartMs === yesterday) {
    return 'Yesterday';
  }
  return new Date(dayStartMs).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function InsightMetricChart({ metric, content, pageWidth, chartKey, color }: Props) {
  const { ts } = useTypography();
  const { theme } = useDemoPalette();
  const style = insightMetricChartStyle(metric);
  const chartColor = color ?? APPLE_HEART_RATE_CHART_COLOR;
  const hasIntraday = (content.intradaySeries?.length ?? 0) > 0;
  const hasWeekly = sanitizeInsightTrendPoints(content.trendPoints).some((v) => v > 0);

  if (style === 'none') {
    return null;
  }

  if (style === 'intraday-line') {
    if (hasIntraday) {
      return (
        <InsightIntradayLineChart
          chartKey={chartKey}
          color={chartColor}
          dayLabel={intradayDayLabel(content.intradayDayStartMs)}
          dayStartMs={content.intradayDayStartMs ?? todayStartMs()}
          pageWidth={pageWidth}
          series={content.intradaySeries ?? []}
          unit={content.trendUnit}
        />
      );
    }
    if (hasWeekly) {
      return <InsightDailyBarChart chartKey={`${chartKey}-week`} color={chartColor} content={content} pageWidth={pageWidth} />;
    }
    return (
      <View style={{ minHeight: 120, justifyContent: 'center' }}>
        <Text style={{ color: theme.textMuted, fontSize: ts(14), fontWeight: '600', textAlign: 'center' }}>
          No heart rate data in Apple Health
        </Text>
      </View>
    );
  }

  if (style === 'daily-bars') {
    return <InsightDailyBarChart chartKey={chartKey} color={chartColor} content={content} pageWidth={pageWidth} />;
  }

  return (
    <View>
      <Text style={{ color: theme.textMuted, fontSize: ts(14) }}>Chart unavailable</Text>
    </View>
  );
}
