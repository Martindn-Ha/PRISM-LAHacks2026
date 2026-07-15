import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Reanimated, { interpolate, type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SLEEP_CHART_COLOR, SLEEP_CHART_PERIODS, type InsightChartPeriod } from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import {
  heartRatePlotPadBottom,
  heartRatePlotWidth,
  heartRateShowsHorizontalGrid,
  heartRateYAxisSide,
} from '../../lib/heartRateChartLayout';
import type { HeartRateHeroDisplay } from '../../lib/heartRateChartData';
import {
  canStepSleepFuture,
  canStepSleepPast,
  getSleepDayBucket,
  getSleepMonthBuckets,
  getSleepNightSegments,
  getSleepWeekBuckets,
  getSleepYearBuckets,
  sleepFixedYRange,
  sleepHeroForPeriod,
  sleepPeriodRangeLabel,
  startOfLocalDay,
  type InsightSleepChartData,
} from '../../lib/sleepChartData';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightChartPeriodPicker } from './InsightChartPeriodPicker';
import { InsightHeartRateRangeChart } from './InsightHeartRateRangeChart';
import { InsightHeartRateSwipePager } from './InsightHeartRateSwipePager';
import { InsightSleepNightChart } from './InsightSleepNightChart';

type Props = {
  chart: InsightSleepChartData;
  pageWidth: number;
  showStageLanes?: boolean;
};

function SleepHeroValueBlock({
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
        {hero.unit ? (
          <Text style={mergePaletteLayer(layers, 'insightsDetailHeroUnit', styles.insightsDetailHeroUnit)}>{hero.unit}</Text>
        ) : null}
      </View>
    </Reanimated.View>
  );
}

export function InsightSleepChartPanel({ chart, pageWidth, showStageLanes = true }: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const todayStartMs = useMemo(() => startOfLocalDay(new Date()).getTime(), []);
  const [period, setPeriod] = useState<InsightChartPeriod>(SLEEP_CHART_PERIODS[0]!);
  const [timeOffset, setTimeOffset] = useState(0);
  const swipeProgress = useSharedValue(-1);

  useEffect(() => {
    setTimeOffset(0);
    swipeProgress.value = -1;
  }, [period, swipeProgress]);

  const nowMs = Date.now();
  const swipeEnabled = period !== 'Y';
  const canPast = swipeEnabled && canStepSleepPast(period, chart, timeOffset, nowMs, todayStartMs);
  const canFuture = swipeEnabled && canStepSleepFuture(period, timeOffset);

  const heroCurrent = sleepHeroForPeriod(period, chart, timeOffset, nowMs, todayStartMs);
  const heroPast = canPast ? sleepHeroForPeriod(period, chart, timeOffset + 1, nowMs, todayStartMs) : heroCurrent;
  const heroFuture = canFuture ? sleepHeroForPeriod(period, chart, timeOffset - 1, nowMs, todayStartMs) : heroCurrent;

  const rangeLabel = sleepPeriodRangeLabel(period, chart, timeOffset, nowMs, todayStartMs);
  const pastRangeLabel = canPast ? sleepPeriodRangeLabel(period, chart, timeOffset + 1, nowMs, todayStartMs) : null;
  const futureRangeLabel = canFuture ? sleepPeriodRangeLabel(period, chart, timeOffset - 1, nowMs, todayStartMs) : null;

  const showYAxis = period !== 'D';
  const showHorizontalGrid = heartRateShowsHorizontalGrid(period) && period !== 'D';

  const fixedYRange = useMemo(() => sleepFixedYRange(), []);
  const plotWidth = showYAxis ? heartRatePlotWidth(pageWidth) : pageWidth;
  const yAxisSide = heartRateYAxisSide(period);
  const plotPadBottom = heartRatePlotPadBottom(period);

  const renderChartAtOffset = useCallback(
    (offset: number) => {
      if (period === 'D') {
        const day = getSleepDayBucket(chart, offset, todayStartMs);
        const dayStartMs = day?.dayStartMs ?? todayStartMs;
        return (
          <InsightSleepNightChart
            chartKey={`sleep-night-${dayStartMs}`}
            color={SLEEP_CHART_COLOR}
            plotWidth={plotWidth}
            segments={getSleepNightSegments(chart, dayStartMs)}
            showStages={showStageLanes}
            yRange={fixedYRange}
          />
        );
      }
      if (period === 'W') {
        return (
          <InsightHeartRateRangeChart
            buckets={getSleepWeekBuckets(chart, offset, todayStartMs)}
            chartKey={`sleep-week-${offset}`}
            color={SLEEP_CHART_COLOR}
            plotWidth={plotWidth}
            variant="week"
            yRange={fixedYRange}
          />
        );
      }
      if (period === 'M') {
        return (
          <InsightHeartRateRangeChart
            buckets={getSleepMonthBuckets(chart, offset, nowMs)}
            chartKey={`sleep-month-${offset}`}
            color={SLEEP_CHART_COLOR}
            plotWidth={plotWidth}
            variant="month"
            yRange={fixedYRange}
          />
        );
      }
      return (
        <InsightHeartRateRangeChart
          buckets={getSleepYearBuckets(chart, nowMs)}
          chartKey={`sleep-year-${offset}`}
          color={SLEEP_CHART_COLOR}
          plotWidth={plotWidth}
          variant="year"
          yRange={fixedYRange}
        />
      );
    },
    [chart, fixedYRange, nowMs, period, plotWidth, showStageLanes, todayStartMs],
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
      <InsightChartPeriodPicker onChange={setPeriod} period={period} periods={SLEEP_CHART_PERIODS} />

      <View style={styles.insightsHeartRateHeroStack}>
        <Text style={mergePaletteLayer(layers, 'insightsDetailSubtitle', styles.insightsHeartRateHeroContext)}>
          {heroCurrent.context}
        </Text>
        <View style={styles.insightsHeartRateHeroValueStack}>
          <SleepHeroValueBlock hero={heroPast} slot="past" swipeProgress={swipeProgress} />
          <SleepHeroValueBlock hero={heroCurrent} slot="current" swipeProgress={swipeProgress} />
          <SleepHeroValueBlock hero={heroFuture} slot="future" swipeProgress={swipeProgress} />
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
          showYAxis={showYAxis}
          swipeEnabled={swipeEnabled}
          swipeProgress={swipeProgress}
          timeOffset={timeOffset}
          yAxisSide={yAxisSide}
          yRange={fixedYRange}
          trackId="insights.sleep.page"
        />
      </View>
    </View>
  );
}
