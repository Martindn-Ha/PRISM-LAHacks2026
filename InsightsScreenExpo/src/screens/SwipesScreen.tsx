import { Image } from 'expo-image';
import { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
import { useTypography } from '../context/TypographyContext';
import { scaleStyleRecord } from '../theme/typography';
import { logUiInteraction } from '../lib/uiInteractionLog';
import { TrackedPressable } from '../components/TrackedPressable';

export type DemoSwipeCategory = 'nutrition' | 'activity' | 'recovery' | 'mindfulness' | 'habits';

export type DemoSwipeItem = {
  id: string;
  name: string;
  emoji: string;
  category: DemoSwipeCategory;
  /** Demo hero photo (remote). */
  imageUrl: string;
  /** One-line stat: kcal, minutes, hours, steps, etc. */
  detailLine: string;
  tags: string[];
  blurb: string;
};

/** Mixed nutrition, movement, sleep, hydration, and mindfulness — demo-only swipe deck. */
export const DEMO_SWIPE_DECK: DemoSwipeItem[] = [
  {
    id: 'k1',
    name: 'Hang out with Kyle',
    emoji: '👋',
    category: 'activity',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
    detailLine: 'This afternoon · low-key',
    tags: ['Social', 'Recovery'],
    blurb: 'Coffee, a walk, or just catch up — good for mood and stress balance.',
  },
  {
    id: 'n1',
    name: 'Mediterranean grain bowl',
    emoji: '🥗',
    category: 'nutrition',
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
    detailLine: '420 kcal · demo portion',
    tags: ['High fiber', 'Vegetarian'],
    blurb: 'Quinoa, chickpeas, feta, cucumber, and lemon tahini.',
  },
  {
    id: 'a1',
    name: 'Lunch walk (brisk)',
    emoji: '🚶',
    category: 'activity',
    imageUrl:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
    detailLine: '22 min · ~2.1k steps',
    tags: ['NEAT', 'Glucose friendly'],
    blurb: 'Loop the block after eating to blunt post-meal glucose and clear your head.',
  },
  {
    id: 'n2',
    name: 'Teriyaki salmon plate',
    emoji: '🍱',
    category: 'nutrition',
    imageUrl:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=80',
    detailLine: '540 kcal · demo portion',
    tags: ['Omega-3', 'High protein'],
    blurb: 'Glazed salmon, jasmine rice, and steamed broccoli.',
  },
  {
    id: 'm1',
    name: 'Box breathing reset',
    emoji: '🫁',
    category: 'mindfulness',
    imageUrl:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80',
    detailLine: '6 min · HRV-friendly',
    tags: ['Stress', 'Focus'],
    blurb: '4-4-4-4 pattern to downshift sympathetic drive between meetings.',
  },
  {
    id: 'n3',
    name: 'Veggie tikka wrap',
    emoji: '🌯',
    category: 'nutrition',
    imageUrl:
      'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80',
    detailLine: '380 kcal · demo portion',
    tags: ['Plant-forward', 'Spiced'],
    blurb: 'Roasted cauliflower, spinach, mint yogurt, whole wheat.',
  },
  {
    id: 'a2',
    name: 'Full-body strength circuit',
    emoji: '🏋️',
    category: 'activity',
    imageUrl:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80',
    detailLine: '40 min · moderate–hard',
    tags: ['Strength', 'Metabolic'],
    blurb: 'Push + pull + hinge + carry — track RPE and rest if sleep was short.',
  },
  {
    id: 'n4',
    name: 'Berry protein smoothie',
    emoji: '🫐',
    category: 'nutrition',
    imageUrl:
      'https://images.unsplash.com/photo-1553530666-a651aa14576a?auto=format&fit=crop&w=900&q=80',
    detailLine: '290 kcal · demo portion',
    tags: ['Quick', 'Post-workout'],
    blurb: 'Greek yogurt, mixed berries, oats, and almond milk.',
  },
  {
    id: 'h1',
    name: 'Hydration push (electrolytes)',
    emoji: '💧',
    category: 'habits',
    imageUrl:
      'https://images.unsplash.com/photo-1548839140-29a049e095cf?auto=format&fit=crop&w=900&q=80',
    detailLine: '750 ml by 3pm · demo goal',
    tags: ['Water', 'Electrolytes'],
    blurb: 'Pair water with sodium + potassium if you trained or sweat today.',
  },
  {
    id: 'n5',
    name: 'Soba noodle salad',
    emoji: '🍜',
    category: 'nutrition',
    imageUrl:
      'https://images.unsplash.com/photo-1569718212169-5038fedd62dd?auto=format&fit=crop&w=900&q=80',
    detailLine: '440 kcal · demo portion',
    tags: ['Refreshing', 'Sesame'],
    blurb: 'Cold buckwheat noodles, edamame, carrots, ginger dressing.',
  },
  {
    id: 'a3',
    name: 'Zone 2 spin',
    emoji: '🚴',
    category: 'activity',
    imageUrl:
      'https://images.unsplash.com/photo-1541625602330-2277a4c4617f?auto=format&fit=crop&w=900&q=80',
    detailLine: '45 min · conversational pace',
    tags: ['Cardio', 'Mitochondrial'],
    blurb: 'Aim for nose-breathable intensity — great for aerobic base without trashing legs.',
  },
  {
    id: 'n6',
    name: 'Chipotle black bean tacos',
    emoji: '🌮',
    category: 'nutrition',
    imageUrl:
      'https://images.unsplash.com/photo-1565299585323-38174c2b43d7?auto=format&fit=crop&w=900&q=80',
    detailLine: '410 kcal · demo portion',
    tags: ['Comfort', 'Shared plate'],
    blurb: 'Corn tortillas, pickled onions, avocado, lime crema.',
  },
  {
    id: 'r1',
    name: 'Sleep wind-down',
    emoji: '🌙',
    category: 'recovery',
    imageUrl:
      'https://images.unsplash.com/photo-1541781774459-bb2eb912374d?auto=format&fit=crop&w=900&q=80',
    detailLine: '8h target · lights low by 10:30',
    tags: ['Sleep', 'Recovery'],
    blurb: 'Dim screens, cool room, same wake time — consistency beats perfection.',
  },
  {
    id: 'a4',
    name: 'Morning mobility + yoga flow',
    emoji: '🧘',
    category: 'activity',
    imageUrl:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80',
    detailLine: '25 min · easy',
    tags: ['Mobility', 'Stress'],
    blurb: 'Hips, T-spine, and breath — stack before coffee if you wake stiff.',
  },
  {
    id: 'a5',
    name: 'Easy run (conversational)',
    emoji: '🏃',
    category: 'activity',
    imageUrl:
      'https://images.unsplash.com/photo-1571008887538-bdbbb9f58abf?auto=format&fit=crop&w=900&q=80',
    detailLine: '35 min · zone 2',
    tags: ['Running', 'Aerobic'],
    blurb: 'Keep HR steady; skip if HRV is flagged low in your insights.',
  },
  {
    id: 'm2',
    name: 'Mood + energy check-in',
    emoji: '📝',
    category: 'mindfulness',
    imageUrl:
      'https://images.unsplash.com/photo-1517842645767-c639b880cd60?auto=format&fit=crop&w=900&q=80',
    detailLine: '2 min · daily',
    tags: ['Mental health', 'Trends'],
    blurb: 'Three sliders: mood, stress, sleep quality — builds a signal for your week.',
  },
  {
    id: 'r2',
    name: 'Foam roll + calf flush',
    emoji: '🧴',
    category: 'recovery',
    imageUrl:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
    detailLine: '12 min · post-long day',
    tags: ['Recovery', 'Mobility'],
    blurb: 'Quads, glutes, calves — pairs well after standing meetings or a long walk.',
  },
];

function SwipeCardFace({
  item,
  compact,
  heroWidth,
}: {
  item: DemoSwipeItem;
  compact?: boolean;
  /** Inner content width (card minus horizontal padding). Avoids % sizing bugs inside animated cards. */
  heroWidth: number;
}) {
  const local = useSwipeLocalStyles();
  const heroH = compact ? 132 : 172;
  return (
    <View style={[local.cardInner, compact && local.cardInnerCompact]}>
      <View
        collapsable={Platform.OS === 'android' ? false : undefined}
        style={[local.cardImageWrap, compact && local.cardImageWrapCompact, { width: heroWidth, height: heroH }]}
      >
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="cover"
          recyclingKey={item.id}
          source={{ uri: item.imageUrl }}
          style={{ width: heroWidth, height: heroH }}
          transition={0}
        />
        <Text style={local.cardEmojiBadge}>{item.emoji}</Text>
      </View>
      <Text style={local.cardTitle}>{item.name}</Text>
      <Text style={local.cardDetailLine}>{item.detailLine}</Text>
      <View style={local.tagRow}>
        {item.tags.map((t) => (
          <View key={t} style={local.tagChip}>
            <Text style={local.tagChipText}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={local.cardBlurb}>{item.blurb}</Text>
    </View>
  );
}

type SwipeableCardProps = {
  item: DemoSwipeItem;
  onSwipedLeft: () => void;
  onSwipedRight: () => void;
  screenWidth: number;
  cardWidth: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
};

function SwipeScreenEdge({
  side,
  slotHeight,
  translateX,
  swipeThreshold,
  onPress,
}: {
  side: 'left' | 'right';
  slotHeight: number;
  translateX: SharedValue<number>;
  swipeThreshold: number;
  onPress: () => void;
}) {
  const local = useSwipeLocalStyles();
  const pillH = Math.max(280, Math.min(slotHeight * 0.9, slotHeight - 32));
  const pillTop = (slotHeight - pillH) / 2;
  const glowStyle = useAnimatedStyle(() => {
    /** No tint until the card has moved a few px off center; then ramp to full by ~half threshold. */
    const dead = 14;
    const rampEnd = swipeThreshold * 0.52;
    const raw =
      side === 'left'
        ? interpolate(translateX.value, [-rampEnd, -dead, 0], [1, 0, 0], Extrapolation.CLAMP)
        : interpolate(translateX.value, [0, dead, rampEnd], [0, 0, 1], Extrapolation.CLAMP);
    return { opacity: raw * 0.94 };
  });

  return (
    <TrackedPressable
      accessibilityLabel={side === 'left' ? 'Skip this meal' : 'Save this meal'}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      onPress={onPress}
      style={[
        local.edgeHit,
        side === 'left' ? local.edgeHitLeft : local.edgeHitRight,
        { height: slotHeight },
      ]}
      trackId={side === 'left' ? 'swipes.nudge.left' : 'swipes.nudge.right'}
    >
      <Reanimated.View
        pointerEvents="none"
        style={[
          side === 'left' ? local.edgeStadiumLeft : local.edgeStadiumRight,
          side === 'left' ? local.edgeTintRed : local.edgeTintGreen,
          { height: pillH, top: pillTop, width: 58 },
          glowStyle,
        ]}
      />
    </TrackedPressable>
  );
}

export type SwipeableFoodCardHandle = {
  nudgeLeft: () => void;
  nudgeRight: () => void;
};

const SwipeableFoodCard = forwardRef<SwipeableFoodCardHandle, SwipeableCardProps>(function SwipeableFoodCard(
  { item, onSwipedLeft, onSwipedRight, screenWidth, cardWidth, translateX, translateY },
  ref,
) {
  const local = useSwipeLocalStyles();
  const swipeThreshold = screenWidth * 0.22;
  const exitX = screenWidth * 1.35;

  const commitLeft = useCallback(() => {
    onSwipedLeft();
  }, [onSwipedLeft]);

  const commitRight = useCallback(() => {
    onSwipedRight();
  }, [onSwipedRight]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .failOffsetY([-18, 18])
        .onUpdate((e) => {
          translateX.value = e.translationX;
          translateY.value = e.translationY * 0.08;
        })
        .onEnd((e) => {
          const vx = e.velocityX;
          const settle = { duration: 200 };
          if (translateX.value > swipeThreshold || vx > 680) {
            translateX.value = withTiming(exitX, { duration: 240 }, (finished) => {
              if (finished) runOnJS(commitRight)();
            });
          } else if (translateX.value < -swipeThreshold || vx < -680) {
            translateX.value = withTiming(-exitX, { duration: 240 }, (finished) => {
              if (finished) runOnJS(commitLeft)();
            });
          } else {
            translateX.value = withTiming(0, settle);
            translateY.value = withTiming(0, settle);
          }
        }),
    [commitLeft, commitRight, exitX, swipeThreshold, translateX, translateY],
  );

  const cardStyle = useAnimatedStyle(() => {
    const rotateZ = `${interpolate(translateX.value, [-screenWidth * 0.5, 0, screenWidth * 0.5], [-14, 0, 14])}deg`;
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { rotateZ }],
    };
  });

  const nudge = useCallback(
    (dir: 'left' | 'right') => {
      const target = dir === 'right' ? exitX : -exitX;
      translateX.value = withTiming(target, { duration: 220 }, (finished) => {
        if (finished) {
          if (dir === 'right') runOnJS(commitRight)();
          else runOnJS(commitLeft)();
        }
      });
    },
    [commitLeft, commitRight, exitX, translateX],
  );

  useImperativeHandle(
    ref,
    () => ({
      nudgeLeft: () => nudge('left'),
      nudgeRight: () => nudge('right'),
    }),
    [nudge],
  );

  return (
    <GestureDetector gesture={pan}>
      <Reanimated.View style={[local.swipeCard, { width: cardWidth }, cardStyle]}>
        <SwipeCardFace heroWidth={Math.max(120, cardWidth - 36)} item={item} />
        <View style={local.cardHintRow}>
          <Text style={local.cardHint}>Swipe right to save · left to skip</Text>
        </View>
      </Reanimated.View>
    </GestureDetector>
  );
});

export default function SwipesScreen() {
  const { styles: appStyles } = useTypography();
  const { layers } = useDemoPalette();
  const { width } = useWindowDimensions();
  const local = useMemo(
    () => StyleSheet.create(scaleStyleRecord(swipeLocalBase as Record<string, import('react-native').ViewStyle | import('react-native').TextStyle>, width)),
    [width],
  );
  const swipeCardRef = useRef<SwipeableFoodCardHandle>(null);
  const [hostLayout, setHostLayout] = useState({ width: 0, height: 0 });
  const [deck, setDeck] = useState<DemoSwipeItem[]>(() => [...DEMO_SWIPE_DECK]);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const current = deck[0];
  const next = deck[1];
  const cardWidth = Math.min(width - 32, 348);

  const onSwipedLeft = useCallback(() => {
    if (current) {
      logUiInteraction({ gesture: 'swipe', target: `swipes.card.${current.id}`, direction: 'left' });
    }
    setDeck((d) => d.slice(1));
  }, [current]);

  const onSwipedRight = useCallback(() => {
    if (current) {
      logUiInteraction({ gesture: 'swipe', target: `swipes.card.${current.id}`, direction: 'right' });
    }
    setDeck((d) => d.slice(1));
  }, [current]);

  const restart = useCallback(() => {
    setDeck([...DEMO_SWIPE_DECK]);
  }, []);

  const swipeThreshold = width * 0.22;

  useLayoutEffect(() => {
    if (!current) {
      return;
    }
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    translateX.value = 0;
    translateY.value = 0;
  }, [current?.id, translateX, translateY]);

  useEffect(() => {
    const urls = deck.slice(0, 4).map((i) => i.imageUrl);
    if (urls.length === 0) {
      return;
    }
    void Image.prefetch(urls, 'memory-disk').catch(() => {
      /* ignore prefetch failures — cards still load on demand */
    });
  }, [deck]);

  const resourcesScreenStyle = useMemo(
    () =>
      StyleSheet.flatten(
        mergePaletteLayer(layers, 'resourcesScreen', appStyles.resourcesScreen),
      ) as ViewStyle,
    [layers, appStyles],
  );
  const swipesOuterBackground = resourcesScreenStyle.backgroundColor ?? '#111827';

  return (
    <SwipeLocalStylesContext.Provider value={local}>
    <View
      style={[local.swipesScreenOuter, { backgroundColor: swipesOuterBackground }]}
      onLayout={(e) => {
        const { width: layoutWidth, height: layoutHeight } = e.nativeEvent.layout;
        setHostLayout((prev) =>
          prev.width === layoutWidth && prev.height === layoutHeight ? prev : { width: layoutWidth, height: layoutHeight },
        );
      }}
    >
      {current && hostLayout.height > 0 ? (
        <View pointerEvents="box-none" style={local.edgeGlowLayerTabBounds}>
          <SwipeScreenEdge
            side="left"
            slotHeight={hostLayout.height}
            swipeThreshold={swipeThreshold}
            translateX={translateX}
            onPress={() => swipeCardRef.current?.nudgeLeft()}
          />
          <SwipeScreenEdge
            side="right"
            slotHeight={hostLayout.height}
            swipeThreshold={swipeThreshold}
            translateX={translateX}
            onPress={() => swipeCardRef.current?.nudgeRight()}
          />
        </View>
      ) : null}
      <View
        pointerEvents="box-none"
        style={[
          mergePaletteLayer(layers, 'resourcesScreen', appStyles.resourcesScreen),
          local.swipesContentLayer,
          local.swipesContentTransparent,
        ]}
      >
        <Text style={mergePaletteLayer(layers, 'resourcesTitle', appStyles.resourcesTitle)}>Swipes</Text>

        <View style={local.deckWrap} pointerEvents="box-none">
          {!current ? (
            <View style={[local.emptyCard, local.glassOutline]}>
              <Text style={local.emptyTitle}>You're caught up</Text>
              <Text style={local.emptyBody}>Reload the demo deck to keep swiping.</Text>
              <TrackedPressable accessibilityRole="button" onPress={restart} style={local.restartBtn} trackId="swipes.restart">
                <Text style={local.restartBtnText}>Shuffle demo again</Text>
              </TrackedPressable>
            </View>
          ) : (
            <View style={[local.deckCluster, { width: cardWidth }]}>
              {next ? (
                <View style={[local.backCard, local.glassOutline, { width: cardWidth }]}>
                  <SwipeCardFace compact heroWidth={Math.max(120, cardWidth - 36)} item={next} />
                </View>
              ) : (
                <View style={[local.backPlaceholder, { width: cardWidth }]} />
              )}
              <SwipeableFoodCard
                ref={swipeCardRef}
                cardWidth={cardWidth}
                item={current}
                translateX={translateX}
                translateY={translateY}
                onSwipedLeft={onSwipedLeft}
                onSwipedRight={onSwipedRight}
                screenWidth={width}
              />
            </View>
          )}
        </View>
      </View>
    </View>
    </SwipeLocalStylesContext.Provider>
  );
}

const swipeLocalBase = {
  swipesScreenOuter: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  /** Side-edge skip/save targets — confined to the Swipes tab, not the app header. */
  edgeGlowLayerTabBounds: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  swipesContentLayer: {
    flex: 1,
    zIndex: 2,
  },
  /** Lets side-edge tints show beside the deck while the outer view supplies the screen fill. */
  swipesContentTransparent: {
    backgroundColor: 'transparent',
  },
  deckWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 96,
    position: 'relative',
    overflow: 'visible',
  },
  edgeHit: {
    position: 'absolute',
    top: 0,
    width: 96,
    justifyContent: 'center',
    zIndex: 3,
  },
  edgeHitLeft: {
    left: 0,
    alignItems: 'flex-start',
  },
  edgeHitRight: {
    right: 0,
    alignItems: 'flex-end',
  },
  edgeStadiumLeft: {
    position: 'absolute',
    left: 0,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  edgeStadiumRight: {
    position: 'absolute',
    right: 0,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  edgeTintRed: {
    backgroundColor: 'rgba(248, 113, 113, 0.62)',
    shadowColor: '#f87171',
    shadowOpacity: 1,
    shadowRadius: 42,
    shadowOffset: { width: 6, height: 0 },
    elevation: 28,
  },
  edgeTintGreen: {
    backgroundColor: 'rgba(74, 222, 128, 0.55)',
    shadowColor: '#4ade80',
    shadowOpacity: 1,
    shadowRadius: 42,
    shadowOffset: { width: -6, height: 0 },
    elevation: 28,
  },
  /** Card stack only; heights tuned for front + back layers. */
  deckCluster: {
    position: 'relative',
    height: 540,
    alignSelf: 'center',
    zIndex: 8,
  },
  glassOutline: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.36)',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    shadowColor: '#fff',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  backPlaceholder: {
    position: 'absolute',
    top: 28,
    height: 480,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
  },
  backCard: {
    position: 'absolute',
    top: 28,
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
    paddingBottom: 12,
  },
  swipeCard: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 0,
    zIndex: 12,
  },
  cardInner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
    backgroundColor: 'rgba(17, 24, 39, 0.92)',
    paddingVertical: 22,
    paddingHorizontal: 18,
    minHeight: 430,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  cardInnerCompact: {
    minHeight: 360,
    paddingVertical: 18,
    opacity: 1,
  },
  cardImageWrap: {
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#1e293b',
  },
  cardImageWrapCompact: {
    marginBottom: 10,
  },
  cardEmojiBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 34,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  cardDetailLine: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.45)',
  },
  tagChipText: {
    color: '#bfdbfe',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardBlurb: {
    color: '#cbd5e1',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  cardHintRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  cardHint: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 0,
    paddingVertical: 36,
    paddingHorizontal: 22,
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 348,
    width: '100%',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyBody: {
    color: '#94a3b8',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  restartBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.55)',
  },
  restartBtnText: {
    color: '#dbeafe',
    fontSize: 17,
    fontWeight: '800',
  },
};

type SwipeLocalStyles = ReturnType<typeof StyleSheet.create<Record<string, import('react-native').ViewStyle | import('react-native').TextStyle>>>;

const SwipeLocalStylesContext = createContext<SwipeLocalStyles | null>(null);

function useSwipeLocalStyles(): SwipeLocalStyles {
  const styles = useContext(SwipeLocalStylesContext);
  if (!styles) {
    throw new Error('useSwipeLocalStyles must be used within SwipeLocalStylesContext');
  }
  return styles;
}

