import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import {
  dashboardQuickActionLabel,
  dashboardQuickActionThemeColor,
  isDashboardQuickActionMedications,
  moveDashboardQuickAction,
  type DashboardQuickAction,
} from '../../constants/dashboardQuickActions';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightTabIcon } from '../icons/InsightTabIcon';

type DashboardQuickActionSlotProps = {
  action: DashboardQuickAction;
  index: number;
  slotWidth: number;
  draggingIndexSV: SharedValue<number>;
  dragTranslationSV: SharedValue<number>;
  slotWidthSV: SharedValue<number>;
  onPress: () => void;
  onDragCommit: (fromIndex: number, translationX: number) => void;
};

function DashboardQuickActionSlot({
  action,
  index,
  slotWidth,
  draggingIndexSV,
  dragTranslationSV,
  slotWidthSV,
  onPress,
  onDragCommit,
}: DashboardQuickActionSlotProps) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const quickIconGlyphColor = theme?.textMuted ?? '#a1a1aa';
  const accentColor = dashboardQuickActionThemeColor(action);
  const onPressJS = useCallback(() => {
    onPress();
  }, [onPress]);

  const commitJS = useCallback(
    (fromIdx: number, dx: number) => {
      if (slotWidth <= 0) {
        return;
      }
      onDragCommit(fromIdx, dx);
    },
    [slotWidth, onDragCommit],
  );

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(380)
      .onEnd((_e, success) => {
        'worklet';
        if (success) {
          runOnJS(onPressJS)();
        }
      });

    const pan = Gesture.Pan()
      .activateAfterLongPress(450)
      .onUpdate((e) => {
        dragTranslationSV.value = e.translationX;
      })
      .onEnd((e, success) => {
        if (success) {
          runOnJS(commitJS)(index, e.translationX);
        }
      })
      .onFinalize(() => {
        draggingIndexSV.value = -1;
        dragTranslationSV.value = 0;
      });

    return Gesture.Exclusive(tap, pan);
  }, [commitJS, dragTranslationSV, draggingIndexSV, index, onPressJS]);

  const animatedStyle = useAnimatedStyle(() => {
    const from = draggingIndexSV.value;
    const dx = dragTranslationSV.value;
    const w = slotWidthSV.value;
    if (from < 0 || w <= 0) {
      return { transform: [{ translateX: 0 }, { scale: 1 }], zIndex: 0 };
    }
    const t = dx / w;
    let translate = 0;
    let z = 0;
    let scale = 1;
    if (index === from) {
      translate = dx;
      z = 8;
      scale = 1.06;
    } else if (t > 0) {
      const k = index - from;
      if (k >= 1) {
        const step = Math.min(Math.max(t - (k - 1), 0), 1);
        translate = -step * w;
      }
    } else if (t < 0) {
      const k = from - index;
      if (k >= 1) {
        const u = -t;
        const step = Math.min(Math.max(u - (k - 1), 0), 1);
        translate = step * w;
      }
    }
    return {
      transform: [{ translateX: translate }, { scale }],
      zIndex: z,
    };
  }, [dragTranslationSV, draggingIndexSV, index, slotWidthSV]);

  return (
    <GestureDetector gesture={gesture}>
      <Reanimated.View
        accessibilityHint="Long press, then drag sideways to reorder. Tap to open."
        accessibilityLabel={`Quick action ${dashboardQuickActionLabel(action)}`}
        accessibilityRole="button"
        style={[styles.quickItem, animatedStyle]}
      >
        <View style={[mergePaletteLayer(layers, 'quickIcon', styles.quickIcon), { borderColor: accentColor }]}>
          {isDashboardQuickActionMedications(action) ? (
            <Ionicons color={quickIconGlyphColor} name="medkit-outline" size={28} />
          ) : (
            <InsightTabIcon color={quickIconGlyphColor} metric={action} size={28} />
          )}
        </View>
        <Text numberOfLines={1} style={mergePaletteLayer(layers, 'quickText', styles.quickText)}>
          {dashboardQuickActionLabel(action)}
        </Text>
      </Reanimated.View>
    </GestureDetector>
  );
}

type DashboardQuickActionMetricsRowProps = {
  metrics: DashboardQuickAction[];
  onReorder: (next: DashboardQuickAction[]) => void;
  onMetricPress: (action: DashboardQuickAction) => void;
};

export function DashboardQuickActionMetricsRow({ metrics, onReorder, onMetricPress }: DashboardQuickActionMetricsRowProps) {
  const { styles } = useTypography();
  const [slotWidth, setSlotWidth] = useState(0);
  const slotWidthSV = useSharedValue(0);
  const draggingIndexSV = useSharedValue(-1);
  const dragTranslationSV = useSharedValue(0);
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const handleDragCommit = useCallback(
    (fromIndex: number, translationX: number) => {
      const list = metricsRef.current;
      const w = slotWidth;
      if (w <= 0 || list.length === 0) {
        return;
      }
      const delta = Math.round(translationX / w);
      const toIndex = Math.max(0, Math.min(fromIndex + delta, list.length - 1));
      if (toIndex !== fromIndex) {
        onReorder(moveDashboardQuickAction(list, fromIndex, toIndex));
      }
    },
    [slotWidth, onReorder],
  );

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        const sw = metrics.length > 0 ? w / metrics.length : 0;
        setSlotWidth(sw);
        slotWidthSV.value = sw;
      }}
      style={styles.quickRow}
    >
      {metrics.map((action, index) => (
        <DashboardQuickActionSlot
          key={action}
          action={action}
          dragTranslationSV={dragTranslationSV}
          draggingIndexSV={draggingIndexSV}
          index={index}
          onDragCommit={handleDragCommit}
          onPress={() => onMetricPress(action)}
          slotWidth={slotWidth}
          slotWidthSV={slotWidthSV}
        />
      ))}
    </View>
  );
}

export { moveDashboardQuickAction as moveDashboardQuickMetric };
