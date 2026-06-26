import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Reanimated, { interpolate, type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import {
  APPLE_HEART_RATE_CHART_COLOR,
  INSIGHT_CHART_PERIODS,
  RESTING_HEART_RATE_CHART_PERIODS,
  type InsightChartPeriod,
  type InsightHeartRateChartData,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import {
  canStepHeartRateFuture,
  canStepHeartRatePast,
  getHeartRateDayBucket,
  getHeartRateHourWindow,
  getHeartRateMonthBuckets,
  getHeartRateWeekBuckets,
  getHeartRateYearBuckets,
  heartRateHeroForPeriod,
  heartRateFixedYRange,
  heartRatePeriodRangeLabel,
  startOfLocalDay,
  type HeartRateHeroDisplay,
  type HeartRateHeroMode,
} from '../../lib/heartRateChartData';
import {
  heartRatePlotPadBottom,
  heartRatePlotWidth,
  heartRateShowsHorizontalGrid,
  heartRateYAxisSide,
} from '../../lib/heartRateChartLayout';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightChartPeriodPicker } from './InsightChartPeriodPicker';
import { InsightHeartRateDayChart } from './InsightHeartRateDayChart';
import { InsightHeartRateHourChart } from './InsightHeartRateHourChart';
import { InsightHeartRateLineDayChart, lastReadingValue } from './InsightHeartRateLineDayChart';
import { InsightHeartRateLineHourChart } from './InsightHeartRateLineHourChart';
import { InsightHeartRateLineRangeChart } from './InsightHeartRateLineRangeChart';
import { InsightHeartRateRangeChart } from './InsightHeartRateRangeChart';
import { InsightHeartRateSwipePager } from './InsightHeartRateSwipePager';

export type HeartRateChartRenderStyle = 'bars' | 'line';

type Props = {
  chart: InsightHeartRateChartData;
  pageWidth: number;
  color?: string;
  renderStyle?: HeartRateChartRenderStyle;
  heroMode?: HeartRateHeroMode;
};

function HeartRateHeroValueBlock({
  hero,
  swipeProgress,
  slot,
}: {
  hero: HeartRateHeroDisplay;
  swipeProgress: SharedValue<number>;
  slot: 'past' | 'current' | 'future';
}) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();

  const animatedStyle = useAnimatedStyle(() => {
    const slotCenter = slot === 'past' ? 0 : slot === 'current' ? -1 : -2;
    const opacity = interpolate(
      swipeProgress.value,
      [slotCenter - 0.45, slotCenter, slotCenter + 0.45],
      [0, 1, 0],
      'clamp',
    );
    const translateY = interpolate(
      swipeProgress.value,
      [slotCenter - 0.55, slotCenter, slotCenter + 0.55],
      [6, 0, 6],
      'clamp',
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        styles.insightsHeartRateHeroValueSlot,
        slot !== 'current' && styles.insightsHeartRateHeroValueSlotAbsolute,
        animatedStyle,
      ]}
    >
      <View style={styles.insightsDetailHeroValueRow}>
        <Text style={mergePaletteLayer(layers, 'insightsDetailHeroValue', styles.insightsDetailHeroValue)}>{hero.primary}</Text>
        <Text style={mergePaletteLayer(layers, 'insightsDetailHeroUnit', styles.insightsDetailHeroUnit)}>{hero.unit}</Text>
      </View>
    </Reanimated.View>
  );
}

export function InsightHeartRateChartPanel({
  chart,
  pageWidth,
  color = APPLE_HEART_RATE_CHART_COLOR,
  renderStyle = 'bars',
  heroMode = 'range',
}: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const availablePeriods = heroMode === 'resting' ? RESTING_HEART_RATE_CHART_PERIODS : INSIGHT_CHART_PERIODS;
  const todayStartMs = useMemo(() => startOfLocalDay(new Date()).getTime(), []);
  const [period, setPeriod] = useState<InsightChartPeriod>(availablePeriods[0]!);
  const [timeOffset, setTimeOffset] = useState(0);
  const swipeProgress = useSharedValue(-1);

  useEffect(() => {
    if (!availablePeriods.includes(period)) {
      setPeriod(availablePeriods[0]!);
    }
  }, [availablePeriods, period]);

  useEffect(() => {
    setTimeOffset(0);
    swipeProgress.value = -1;
  }, [period, swipeProgress]);

  const nowMs = Date.now();
  const swipeEnabled = period !== 'Y';
  const canPast = swipeEnabled && canStepHeartRatePast(period, chart, timeOffset, nowMs, todayStartMs);
  const canFuture = swipeEnabled && canStepHeartRateFuture(period, timeOffset);

  const heroCurrent = heartRateHeroForPeriod(period, chart, timeOffset, nowMs, todayStartMs, heroMode);
  const heroPast = canPast
    ? heartRateHeroForPeriod(period, chart, timeOffset + 1, nowMs, todayStartMs, heroMode)
    : heroCurrent;
  const heroFuture = canFuture
    ? heartRateHeroForPeriod(period, chart, timeOffset - 1, nowMs, todayStartMs, heroMode)
    : heroCurrent;

  const rangeLabel = heartRatePeriodRangeLabel(period, chart, timeOffset, nowMs, todayStartMs);
  const pastRangeLabel = canPast ? heartRatePeriodRangeLabel(period, chart, timeOffset + 1, nowMs, todayStartMs) : null;
  const futureRangeLabel = canFuture ? heartRatePeriodRangeLabel(period, chart, timeOffset - 1, nowMs, todayStartMs) : null;

  const fixedYRange = useMemo(() => heartRateFixedYRange(period, chart, heroMode), [chart, heroMode, period]);

  const plotWidth = heartRatePlotWidth(pageWidth);
  const yAxisSide = heartRateYAxisSide(period);
  const plotPadBottom = heartRatePlotPadBottom(period);
  const showHorizontalGrid = heartRateShowsHorizontalGrid(period);

  const renderChartAtOffset = useCallback(
    (offset: number) => {
      if (period === 'H') {
        const window = getHeartRateHourWindow(chart, nowMs - offset * 60 * 60 * 1000);
        if (renderStyle === 'line') {
          return (
            <InsightHeartRateLineHourChart
              chartKey={`hr-hour-${offset}`}
              color={color}
              plotWidth={plotWidth}
              samples={window.samples}
              windowEndMs={window.windowEndMs}
              windowStartMs={window.windowStartMs}
              yRange={fixedYRange}
            />
          );
        }
        return (
          <InsightHeartRateHourChart
            chartKey={`hr-hour-${offset}`}
            color={color}
            plotWidth={plotWidth}
            samples={window.samples}
            windowEndMs={window.windowEndMs}
            windowStartMs={window.windowStartMs}
            yRange={fixedYRange}
          />
        );
      }
      if (period === 'D') {
        const day = getHeartRateDayBucket(chart, offset, todayStartMs);
        const previousDay = getHeartRateDayBucket(chart, offset + 1, todayStartMs);
        const leadingValue = previousDay ? lastReadingValue(previousDay.samples) : undefined;
        if (renderStyle === 'line') {
          return (
            <InsightHeartRateLineDayChart
              chartKey={`hr-day-${day?.dayStartMs ?? offset}`}
              color={color}
              dayStartMs={day?.dayStartMs ?? todayStartMs}
              leadingValue={leadingValue}
              plotWidth={plotWidth}
              samples={day?.samples ?? []}
              yRange={fixedYRange}
            />
          );
        }
        return (
          <InsightHeartRateDayChart
            chartKey={`hr-day-${day?.dayStartMs ?? offset}`}
            color={color}
            dayStartMs={day?.dayStartMs ?? todayStartMs}
            plotWidth={plotWidth}
            samples={day?.samples ?? []}
            yRange={fixedYRange}
          />
        );
      }
      if (period === 'W') {
        const buckets = getHeartRateWeekBuckets(chart, offset, todayStartMs);
        if (renderStyle === 'line') {
          return (
            <InsightHeartRateLineRangeChart
              buckets={buckets}
              chartKey={`hr-week-${offset}`}
              color={color}
              plotWidth={plotWidth}
              variant="week"
              yRange={fixedYRange}
            />
          );
        }
        return (
          <InsightHeartRateRangeChart
            buckets={buckets}
            chartKey={`hr-week-${offset}`}
            color={color}
            plotWidth={plotWidth}
            variant="week"
            yRange={fixedYRange}
          />
        );
      }
      if (period === 'M') {
        const buckets = getHeartRateMonthBuckets(chart, offset, nowMs);
        if (renderStyle === 'line') {
          return (
            <InsightHeartRateLineRangeChart
              buckets={buckets}
              chartKey={`hr-month-${offset}`}
              color={color}
              plotWidth={plotWidth}
              variant="month"
              yRange={fixedYRange}
            />
          );
        }
        return (
          <InsightHeartRateRangeChart
            buckets={buckets}
            chartKey={`hr-month-${offset}`}
            color={color}
            plotWidth={plotWidth}
            variant="month"
            yRange={fixedYRange}
          />
        );
      }
      const yearBuckets = getHeartRateYearBuckets(chart, nowMs);
      if (renderStyle === 'line') {
        return (
          <InsightHeartRateLineRangeChart
            buckets={yearBuckets}
            chartKey={`hr-year-${offset}`}
            color={color}
            plotWidth={plotWidth}
            variant="year"
            yRange={fixedYRange}
          />
        );
      }
      return (
        <InsightHeartRateRangeChart
          buckets={yearBuckets}
          chartKey={`hr-year-${offset}`}
          color={color}
          plotWidth={plotWidth}
          variant="year"
          yRange={fixedYRange}
        />
      );
    },
    [chart, color, nowMs, period, fixedYRange, plotWidth, renderStyle, todayStartMs],
  );

  const renderPage = useCallback(
    (offsetDelta: -1 | 0 | 1) => {
      const offset = timeOffset + offsetDelta;
      if (offsetDelta === 1 && !canPast) {
        return renderChartAtOffset(timeOffset);
      }
      if (offsetDelta === -1 && !canFuture) {
        return renderChartAtOffset(timeOffset);
      }
      return renderChartAtOffset(offset);
    },
    [canFuture, canPast, renderChartAtOffset, timeOffset],
  );

  const handleStepPast = useCallback(() => {
    setTimeOffset((offset) => offset + 1);
  }, []);

  const handleStepFuture = useCallback(() => {
    setTimeOffset((offset) => Math.max(0, offset - 1));
  }, []);

  return (
    <View style={styles.insightsHeartRatePanel}>
      <InsightChartPeriodPicker onChange={setPeriod} period={period} periods={availablePeriods} />

      <View style={styles.insightsHeartRateHeroStack}>
        <Text style={mergePaletteLayer(layers, 'insightsDetailSubtitle', styles.insightsHeartRateHeroContext)}>
          {heroCurrent.context}
        </Text>
        <View style={styles.insightsHeartRateHeroValueStack}>
          <HeartRateHeroValueBlock hero={heroPast} slot="past" swipeProgress={swipeProgress} />
          <HeartRateHeroValueBlock hero={heroCurrent} slot="current" swipeProgress={swipeProgress} />
          <HeartRateHeroValueBlock hero={heroFuture} slot="future" swipeProgress={swipeProgress} />
        </View>
      </View>

      <View style={styles.insightsHeartRateChartWrap}>
        <InsightHeartRateSwipePager
          canStepFuture={canFuture}
          canStepPast={canPast}
          futureRangeLabel={futureRangeLabel}
          onStepFuture={handleStepFuture}
          onStepPast={handleStepPast}
          pageWidth={pageWidth}
          pastRangeLabel={pastRangeLabel}
          period={period}
          plotPadBottom={plotPadBottom}
          plotWidth={plotWidth}
          rangeLabel={rangeLabel}
          renderPage={renderPage}
          showHorizontalGrid={showHorizontalGrid}
          swipeEnabled={swipeEnabled}
          swipeProgress={swipeProgress}
          timeOffset={timeOffset}
          yAxisSide={yAxisSide}
          yRange={fixedYRange}
        />
      </View>
    </View>
  );
}
