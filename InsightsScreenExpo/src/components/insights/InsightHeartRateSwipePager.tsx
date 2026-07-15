import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import type { ChartYRange } from '../../lib/insightChartAxis';
import { logUiInteraction } from '../../lib/uiInteractionLog';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightHeartRateFixedYAxis } from './InsightHeartRateFixedYAxis';
import { InsightHeartRateHorizontalGrid } from './InsightHeartRateHorizontalGrid';

type Props = {
  pageWidth: number;
  plotWidth: number;
  period: string;
  timeOffset: number;
  swipeProgress: SharedValue<number>;
  onStepPast: () => void;
  onStepFuture: () => void;
  canStepPast: boolean;
  canStepFuture: boolean;
  swipeEnabled?: boolean;
  rangeLabel: string;
  pastRangeLabel: string | null;
  futureRangeLabel: string | null;
  yRange: ChartYRange;
  yAxisSide: 'left' | 'right';
  plotPadBottom: number;
  showHorizontalGrid: boolean;
  showYAxis?: boolean;
  trackId?: string;
  renderPage: (offsetDelta: -1 | 0 | 1) => ReactNode;
};

const SPRING = { damping: 26, stiffness: 260, mass: 0.85 };
const SNAP_RATIO = 0.28;
const VELOCITY_COMMIT = 650;

function recenterPager(
  translateX: SharedValue<number>,
  dragStartX: SharedValue<number>,
  swipeProgress: SharedValue<number>,
  plotWidth: number,
) {
  cancelAnimation(translateX);
  cancelAnimation(swipeProgress);
  translateX.value = -plotWidth;
  dragStartX.value = -plotWidth;
  swipeProgress.value = -1;
}

export function InsightHeartRateSwipePager({
  pageWidth,
  plotWidth,
  period,
  timeOffset,
  swipeProgress,
  onStepPast,
  onStepFuture,
  canStepPast,
  canStepFuture,
  swipeEnabled = true,
  rangeLabel,
  pastRangeLabel,
  futureRangeLabel,
  yRange,
  yAxisSide,
  plotPadBottom,
  showHorizontalGrid,
  showYAxis = true,
  trackId = 'insights.heartRate.page',
  renderPage,
}: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();
  const translateX = useSharedValue(-plotWidth);
  const dragStartX = useSharedValue(-plotWidth);
  const canStepPastSV = useSharedValue(canStepPast);
  const canStepFutureSV = useSharedValue(canStepFuture);

  useEffect(() => {
    canStepPastSV.value = canStepPast;
    canStepFutureSV.value = canStepFuture;
  }, [canStepFuture, canStepPast, canStepFutureSV, canStepPastSV]);

  useEffect(() => {
    recenterPager(translateX, dragStartX, swipeProgress, plotWidth);
  }, [dragStartX, period, plotWidth, swipeProgress, translateX]);

  useLayoutEffect(() => {
    recenterPager(translateX, dragStartX, swipeProgress, plotWidth);
  }, [dragStartX, plotWidth, swipeProgress, timeOffset, translateX]);

  const stepPast = useCallback(() => {
    logUiInteraction({ target: trackId, gesture: 'swipe', direction: 'right' });
    onStepPast();
  }, [onStepPast, trackId]);

  const stepFuture = useCallback(() => {
    logUiInteraction({ target: trackId, gesture: 'swipe', direction: 'left' });
    onStepFuture();
  }, [onStepFuture, trackId]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(swipeEnabled)
        .activeOffsetX([-8, 8])
        .failOffsetY([-24, 24])
        .onStart(() => {
          cancelAnimation(translateX);
          cancelAnimation(swipeProgress);
          dragStartX.value = translateX.value;
        })
        .onUpdate((event) => {
          let next = dragStartX.value + event.translationX;
          const centerX = -plotWidth;
          const hardMinX = -plotWidth * 2;
          const hardMaxX = 0;

          if (!canStepPastSV.value && next > centerX) {
            next = centerX + (next - centerX) * 0.22;
          } else if (!canStepFutureSV.value && next < centerX) {
            next = centerX + (next - centerX) * 0.22;
          }

          if (next > hardMaxX) {
            next = hardMaxX + (next - hardMaxX) * 0.22;
          } else if (next < hardMinX) {
            next = hardMinX + (next - hardMinX) * 0.22;
          }

          translateX.value = next;
          swipeProgress.value = next / plotWidth;
        })
        .onEnd((event) => {
          const centerX = -plotWidth;
          const hardMinX = -plotWidth * 2;
          const hardMaxX = 0;
          const delta = translateX.value - dragStartX.value;
          const commitPast =
            canStepPastSV.value && (delta > plotWidth * SNAP_RATIO || event.velocityX > VELOCITY_COMMIT);
          const commitFuture =
            canStepFutureSV.value && (delta < -plotWidth * SNAP_RATIO || event.velocityX < -VELOCITY_COMMIT);

          if (commitPast) {
            runOnJS(stepPast)();
            return;
          }

          if (commitFuture) {
            runOnJS(stepFuture)();
            return;
          }

          const minX = canStepFutureSV.value ? hardMinX : centerX;
          const maxX = canStepPastSV.value ? hardMaxX : centerX;
          const target = clamp(translateX.value, minX, maxX);
          translateX.value = withSpring(target, SPRING);
          swipeProgress.value = withSpring(target / plotWidth, SPRING);
        }),
    [canStepFutureSV, canStepPastSV, dragStartX, plotWidth, stepFuture, stepPast, swipeEnabled, swipeProgress, translateX],
  );

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const pastLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-plotWidth, -plotWidth * 0.55, 0], [0, 0.35, 1], 'clamp'),
  }));

  const currentLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-plotWidth * 2, -plotWidth * 1.45, -plotWidth, -plotWidth * 0.55, 0],
      [0, 0.35, 1, 0.35, 0],
      'clamp',
    ),
  }));

  const futureLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-plotWidth * 2, -plotWidth * 1.45, -plotWidth], [1, 0.35, 0], 'clamp'),
  }));

  const plotColumn = (
    <View style={{ width: plotWidth, position: 'relative' }}>
      {showHorizontalGrid ? (
        <InsightHeartRateHorizontalGrid padBottom={plotPadBottom} plotWidth={plotWidth} yRange={yRange} />
      ) : null}
      <View style={[styles.insightsHeartRateSwipeViewport, { width: plotWidth }]}>
        <GestureDetector gesture={gesture}>
          <Reanimated.View style={[{ width: plotWidth * 3, flexDirection: 'row' }, trackStyle]}>
            <View style={{ width: plotWidth }}>{renderPage(1)}</View>
            <View style={{ width: plotWidth }}>{renderPage(0)}</View>
            <View style={{ width: plotWidth }}>{renderPage(-1)}</View>
          </Reanimated.View>
        </GestureDetector>
      </View>
    </View>
  );

  return (
    <View style={{ width: pageWidth }}>
      <View style={styles.insightsHeartRateSwipeLabelStack}>
        {pastRangeLabel ? (
          <Reanimated.Text
            style={[
              mergePaletteLayer(layers, 'insightsHeartRateSwipeLabel', styles.insightsHeartRateSwipeLabel),
              StyleSheet.absoluteFillObject,
              styles.insightsHeartRateSwipeLabelLayer,
              pastLabelStyle,
            ]}
          >
            {pastRangeLabel}
          </Reanimated.Text>
        ) : null}
        <Reanimated.Text
          style={[
            mergePaletteLayer(layers, 'insightsHeartRateSwipeLabel', styles.insightsHeartRateSwipeLabel),
            styles.insightsHeartRateSwipeLabelLayer,
            currentLabelStyle,
          ]}
        >
          {rangeLabel}
        </Reanimated.Text>
        {futureRangeLabel ? (
          <Reanimated.Text
            style={[
              mergePaletteLayer(layers, 'insightsHeartRateSwipeLabel', styles.insightsHeartRateSwipeLabel),
              StyleSheet.absoluteFillObject,
              styles.insightsHeartRateSwipeLabelLayer,
              futureLabelStyle,
            ]}
          >
            {futureRangeLabel}
          </Reanimated.Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', width: pageWidth, alignItems: 'flex-start' }}>
        {showYAxis && yAxisSide === 'left' ? <InsightHeartRateFixedYAxis padBottom={plotPadBottom} side="left" yRange={yRange} /> : null}
        {plotColumn}
        {showYAxis && yAxisSide === 'right' ? <InsightHeartRateFixedYAxis padBottom={plotPadBottom} side="right" yRange={yRange} /> : null}
      </View>
    </View>
  );
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}
