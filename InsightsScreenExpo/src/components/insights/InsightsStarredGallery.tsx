import type { MutableRefObject, RefObject } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  QUICK_ACTION_ICON_BY_TAB,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
  type InsightContent,
  type InsightTab,
} from '../../constants/insights';
import { useDemoPalette } from '../../context/DemoPaletteContext';
import { useTypography } from '../../context/TypographyContext';
import { mergePaletteLayer } from '../../theme/demoPaletteTheme';
import { InsightsFavoriteSparkPage } from './InsightsFavoriteSparkPage';
import { DashboardGlucoseGalleryPage } from '../dashboard/DashboardGlucoseGalleryPage';
import { TrackedTouchableOpacity } from '../TrackedTouchableOpacity';
import { DashboardHeartRateGalleryPage } from '../dashboard/DashboardHeartRateGalleryPage';

type GalleryPage = { metric: InsightTab; pageKey: string };

type Props = {
  galleryMetrics: InsightTab[];
  insightContentByTab: Record<InsightTab, InsightContent>;
  insightsGalleryScrollPages: GalleryPage[];
  starredGalleryPageWidth: number;
  starredGalleryScrollRef: RefObject<ScrollView | null>;
  starredGalleryIndex: number;
  setStarredGalleryIndex: (index: number | ((prev: number) => number)) => void;
  onInsightsGalleryMomentumEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onInsightsGalleryScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  starredGalleryUserDraggingRef: MutableRefObject<boolean>;
  suppressStarredGalleryLayoutScrollRef: MutableRefObject<boolean>;
  starredGallerySuppressAutoUntilRef: MutableRefObject<number>;
  emptyMessage?: string;
};

export function InsightsStarredGallery({
  galleryMetrics,
  insightContentByTab,
  insightsGalleryScrollPages,
  starredGalleryPageWidth,
  starredGalleryScrollRef,
  starredGalleryIndex,
  setStarredGalleryIndex,
  onInsightsGalleryMomentumEnd,
  onInsightsGalleryScroll,
  starredGalleryUserDraggingRef,
  suppressStarredGalleryLayoutScrollRef,
  starredGallerySuppressAutoUntilRef,
  emptyMessage = 'Charts appear when Apple Health data is available.',
}: Props) {
  const { styles } = useTypography();
  const { layers } = useDemoPalette();

  return (
    <View style={styles.insightsStarredGalleryWrap}>
      {galleryMetrics.length === 0 ? (
        <Text style={mergePaletteLayer(layers, 'insightsStarredGalleryEmptyText', styles.insightsStarredGalleryEmptyText)}>
          {emptyMessage}
        </Text>
      ) : starredGalleryPageWidth <= 0 ? (
        <Text style={mergePaletteLayer(layers, 'insightsStarredGalleryEmptyText', styles.insightsStarredGalleryEmptyText)}>
          Preparing charts…
        </Text>
      ) : (
        <>
          <ScrollView
            ref={starredGalleryScrollRef}
            decelerationRate="fast"
            horizontal
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={onInsightsGalleryMomentumEnd}
            onScroll={onInsightsGalleryScroll}
            onScrollBeginDrag={() => {
              starredGalleryUserDraggingRef.current = true;
              suppressStarredGalleryLayoutScrollRef.current = true;
              starredGallerySuppressAutoUntilRef.current = Date.now() + 12000;
            }}
            pagingEnabled
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={styles.insightsStarredGalleryScroll}
          >
            {insightsGalleryScrollPages.map(({ metric, pageKey }) => {
              const content = insightContentByTab[metric];
              const w = starredGalleryPageWidth;
              if (!content || w <= 0) {
                return <View key={pageKey} style={[styles.insightsStarredGalleryPage, { width: w }]} />;
              }
              return (
                <View key={pageKey} style={[styles.insightsStarredGalleryPage, { width: w }]}>
                  {metric === 'Heart Rate' && content.heartRateChart ? (
                    <DashboardHeartRateGalleryPage
                      content={content}
                      iconGlyph={QUICK_ACTION_ICON_BY_TAB[metric]}
                      metric={metric}
                      pageWidth={w}
                      theme={QUICK_ACTION_THEME_COLOR_BY_TAB[metric]}
                    />
                  ) : metric === 'Blood Glucose' && content.glucoseChart ? (
                    <DashboardGlucoseGalleryPage
                      chart={content.glucoseChart}
                      content={content}
                      iconGlyph={QUICK_ACTION_ICON_BY_TAB[metric]}
                      metric={metric}
                      pageWidth={w}
                      theme={QUICK_ACTION_THEME_COLOR_BY_TAB[metric]}
                    />
                  ) : (
                    <InsightsFavoriteSparkPage
                      content={content}
                      iconGlyph={QUICK_ACTION_ICON_BY_TAB[metric]}
                      metric={metric}
                      pageWidth={w}
                      theme={QUICK_ACTION_THEME_COLOR_BY_TAB[metric]}
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.insightsStarredGalleryDots}>
            {galleryMetrics.map((m, idx) => (
              <TrackedTouchableOpacity
                key={`starred-gallery-dot-${m}-${idx}`}
                accessibilityLabel={`Show ${m}`}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                onPress={() => {
                  starredGallerySuppressAutoUntilRef.current = Date.now() + 12000;
                  suppressStarredGalleryLayoutScrollRef.current = false;
                  setStarredGalleryIndex(idx);
                }}
                style={[
                  styles.insightsStarredGalleryDot,
                  idx === starredGalleryIndex && styles.insightsStarredGalleryDotActive,
                  { backgroundColor: idx === starredGalleryIndex ? QUICK_ACTION_THEME_COLOR_BY_TAB[m] : 'rgba(148,163,184,0.35)' },
                ]}
                trackId={`insights.starredGallery.dot.${m}`}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}
