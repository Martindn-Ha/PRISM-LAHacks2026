// @ts-nocheck
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { INSIGHT_GROUPS, QUICK_ACTION_ICON_BY_TAB, QUICK_ACTION_THEME_COLOR_BY_TAB, type InsightContent, type InsightTab } from '../constants/insights';
import { InsightsFavoriteSparkPage } from '../components/insights/InsightsFavoriteSparkPage';
import { styles } from '../styles/appStyles';

type Props = any;

export default function InsightsScreen(props: Props) {
  const {
    activeInsightTab,
    healthKitLoading,
    healthKitStatus,
    healthKitLastError,
    setHealthKitStatus,
    initHealthKitAsync,
    dashboardQuickMetrics,
    starredGalleryScrollRef,
    onInsightsGalleryMomentumEnd,
    onInsightsGalleryScroll,
    suppressStarredGalleryLayoutScrollRef,
    starredGallerySuppressAutoUntilRef,
    insightsGalleryScrollPages,
    insightContentByTab,
    starredGalleryPageWidth,
    starredGalleryIndex,
    setStarredGalleryIndex,
    setQuickMetricSearchQuery,
    quickMetricSearchQuery,
    filteredQuickMetricOptions,
    toggleDashboardQuickMetric,
    expandedInsightGroups,
    setExpandedInsightGroups,
    setActiveInsightTab,
    selectedInsightContent,
  } = props;
  return (
        <View style={styles.insightsScreen}>
          {activeInsightTab == null ? (
            <>
              <Text style={styles.insightsTitle}>Insights</Text>
              <View style={styles.insightsStatusRow}>
                {Platform.OS === 'ios' && healthKitLoading ? (
                  <ActivityIndicator accessibilityLabel="Connecting to Apple Health" color="#93c5fd" size="small" />
                ) : null}
                <Text
                  style={[
                    styles.insightsHealthTagline,
                    healthKitStatus === 'ready' && Platform.OS === 'ios' && styles.insightsHealthTaglineConnected,
                  ]}
                >
                  {Platform.OS !== 'ios'
                    ? 'Apple Health is available on iOS only.'
                    : healthKitLoading
                      ? 'Connecting to Apple Health...'
                      : healthKitStatus === 'ready'
                        ? 'Connected to Apple Health.'
                        : healthKitStatus === 'denied'
                          ? 'Apple Health permission denied.'
                          : healthKitStatus === 'unsupported'
                            ? 'Apple Health unavailable in this build.'
                            : 'Requesting Apple Health access...'}
                </Text>
              </View>
              {Platform.OS === 'ios' && healthKitStatus !== 'ready' ? (
                <TouchableOpacity
                  disabled={healthKitLoading}
                  onPress={() => {
                    setHealthKitStatus('idle');
                    void initHealthKitAsync();
                  }}
                  style={[styles.healthConnectBtn, healthKitLoading && styles.healthConnectBtnDisabled]}
                >
                  <Text style={styles.healthConnectBtnText}>{healthKitLoading ? 'Connecting...' : 'Connect Apple Health'}</Text>
                </TouchableOpacity>
              ) : null}
              {healthKitLastError ? <Text style={styles.healthErrorText}>{healthKitLastError}</Text> : null}
              <View style={styles.insightsStarredGalleryWrap}>
                {dashboardQuickMetrics.length === 0 ? (
                  <Text style={styles.insightsStarredGalleryEmptyText}>
                    Star metrics with ☆ below — your favorites appear here as swipeable charts.
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
                        suppressStarredGalleryLayoutScrollRef.current = true;
                        starredGallerySuppressAutoUntilRef.current = Date.now() + 12000;
                      }}
                      pagingEnabled
                      scrollEventThrottle={16}
                      showsHorizontalScrollIndicator={false}
                    >
                      {insightsGalleryScrollPages.map(({ metric, pageKey }) => {
                        const content = insightContentByTab[metric];
                        const w = starredGalleryPageWidth;
                        if (!content || w <= 0) {
                          return <View key={pageKey} style={{ width: w }} />;
                        }
                        return (
                          <View key={pageKey} style={{ width: w }}>
                            <InsightsFavoriteSparkPage
                              content={content}
                              iconGlyph={QUICK_ACTION_ICON_BY_TAB[metric]}
                              metric={metric}
                              pageWidth={w}
                              theme={QUICK_ACTION_THEME_COLOR_BY_TAB[metric]}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.insightsStarredGalleryDots}>
                      {dashboardQuickMetrics.map((m, idx) => (
                        <TouchableOpacity
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
                        />
                      ))}
                    </View>
                  </>
                )}
              </View>
              <Text style={styles.insightsSectionLabel}>Dashboard quick actions</Text>
              <View style={styles.insightsSearchPanel}>
                <TextInput
                  onChangeText={setQuickMetricSearchQuery}
                  placeholder="Search metrics to star…"
                  placeholderTextColor="#64748b"
                  style={styles.quickMetricSearchInput}
                  value={quickMetricSearchQuery}
                />
                <View style={styles.quickMetricSearchResults}>
                  {filteredQuickMetricOptions.slice(0, 6).map((metric, chipIndex) => {
                    const isSelected = dashboardQuickMetrics.includes(metric);
                    return (
                      <TouchableOpacity
                        key={`search-${metric}`}
                        onPress={() => toggleDashboardQuickMetric(metric)}
                        style={[
                          styles.quickMetricOptionChip,
                          chipIndex > 0 && styles.quickMetricOptionChipSpacing,
                          isSelected && styles.quickMetricOptionChipActive,
                        ]}
                      >
                        <Text
                          ellipsizeMode="tail"
                          numberOfLines={1}
                          style={[styles.quickMetricOptionText, isSelected && styles.quickMetricOptionTextActive]}
                        >
                          {isSelected ? '★' : '☆'} {metric}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.insightsQuickToThemesDivider} />
              <ScrollView
                bounces={false}
                overScrollMode="never"
                showsVerticalScrollIndicator={false}
                style={styles.insightsTabScroll}
              >
                <View style={styles.insightsTabStack}>
                  {INSIGHT_GROUPS.map((group) => {
                    const isExpanded = expandedInsightGroups[group.id] ?? false;
                    return (
                      <View key={group.id} style={styles.insightsGroupCard}>
                        <View style={[styles.insightsGroupBand, { backgroundColor: group.color }]} />
                        <TouchableOpacity
                          onPress={() =>
                            setExpandedInsightGroups((prev) => ({
                              ...prev,
                              [group.id]: !isExpanded,
                            }))}
                          style={styles.insightsGroupHeader}
                        >
                          <View style={styles.insightsGroupHeaderText}>
                            <Text style={styles.insightsGroupTitle}>{group.title}</Text>
                            <Text style={styles.insightsGroupSubtitle}>{group.subtitle}</Text>
                          </View>
                          <Text style={styles.insightsGroupChevron}>{isExpanded ? '−' : '+'}</Text>
                        </TouchableOpacity>
                        {isExpanded ? (
                          <View style={styles.insightsGroupBody}>
                            {group.tabs.map((tab) => (
                              <View key={`${group.id}-${tab}`} style={styles.insightsTab}>
                                <View style={[styles.insightsSubTabBand, { backgroundColor: group.color }]} />
                                <TouchableOpacity onPress={() => setActiveInsightTab(tab)} style={styles.insightsTabMainPress}>
                                  <Text style={styles.insightsTabText}>{tab}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => toggleDashboardQuickMetric(tab)}
                                  style={[
                                    styles.insightsTabStarBtn,
                                    dashboardQuickMetrics.includes(tab) && styles.insightsTabStarBtnActive,
                                  ]}
                                >
                                  <Text style={styles.insightsTabStarText}>{dashboardQuickMetrics.includes(tab) ? '★' : '☆'}</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          ) : (
            <View style={styles.insightsDetailScreen}>
              <View style={styles.insightsDetailHeader}>
                <TouchableOpacity onPress={() => setActiveInsightTab(null)} style={styles.insightsBackBtn}>
                  <Text style={styles.insightsBackText}>{'<'}</Text>
                </TouchableOpacity>
                <View style={styles.insightsDetailHeaderText}>
                  <Text style={styles.insightsTitle}>{activeInsightTab}</Text>
                  <Text style={styles.insightsDetailSubtitle}>Dedicated insight view</Text>
                </View>
              </View>
              {selectedInsightContent ? (
                <ScrollView
                  bounces={false}
                  contentContainerStyle={styles.insightsDetailScrollContent}
                  overScrollMode="never"
                  showsVerticalScrollIndicator={false}
                  style={styles.insightsDetailScroll}
                >
                  <View style={styles.insightsCard}>
                    <Text style={styles.insightsCardEyebrow}>Overview</Text>
                    <Text style={styles.insightsCardTitle}>{selectedInsightContent.title}</Text>
                    <Text style={styles.insightsCardSummary}>{selectedInsightContent.summary}</Text>
                    <View style={styles.insightsTrendPill}>
                      <Text style={styles.insightsCardTrend}>{selectedInsightContent.trend}</Text>
                    </View>
                  </View>
                  <View style={styles.insightsCard}>
                    <View style={styles.insightsChartHeader}>
                      <Text style={styles.insightsCardSection}>7-day trend</Text>
                      <Text style={styles.insightsChartUnit}>Unit: {selectedInsightContent.trendUnit}</Text>
                    </View>
                    <View style={styles.insightsLineChartWrap}>
                      {(() => {
                        const points = selectedInsightContent.trendPoints ?? [0, 0, 0, 0, 0, 0, 0];
                        const labels = selectedInsightContent.trendLabels ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                        const chartWidth = 320;
                        const chartHeight = 120;
                        const graphPaddingX = 16;
                        const graphPaddingY = 14;
                        const max = Math.max(...points, 1);
                        const usableWidth = chartWidth - graphPaddingX * 2;
                        const usableHeight = chartHeight - graphPaddingY * 2;
                        const stepX = points.length > 1 ? usableWidth / (points.length - 1) : usableWidth;
                        const coords = points.map((value, idx) => {
                          const x = graphPaddingX + idx * stepX;
                          const y = graphPaddingY + (1 - value / max) * usableHeight;
                          return { x, y, value };
                        });
                        const pathD = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
                        const midY = graphPaddingY + usableHeight / 2;

                        return (
                          <>
                            <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%">
                              <Path d={`M ${graphPaddingX} ${chartHeight - graphPaddingY} L ${chartWidth - graphPaddingX} ${chartHeight - graphPaddingY}`} stroke="rgba(148,163,184,0.22)" strokeWidth={1} />
                              <Path d={`M ${graphPaddingX} ${midY} L ${chartWidth - graphPaddingX} ${midY}`} stroke="rgba(148,163,184,0.12)" strokeDasharray="4 6" strokeWidth={1} />
                              <Path d={pathD} fill="none" stroke="#38bdf8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} />
                              {coords.map((pt, idx) => (
                                <Circle
                                  key={`${selectedInsightContent.title}-dot-${idx}`}
                                  cx={pt.x}
                                  cy={pt.y}
                                  fill="#0f172a"
                                  r={3.8}
                                  stroke="#38bdf8"
                                  strokeWidth={2}
                                />
                              ))}
                            </Svg>
                            <View style={styles.insightsLineLabelsRow}>
                              {labels.map((label, idx) => (
                                <View key={`${selectedInsightContent.title}-label-${idx}`} style={styles.insightsLineLabelItem}>
                                  <Text style={styles.insightsChartValue}>{points[idx] > 0 ? points[idx].toFixed(1).replace('.0', '') : '0'}</Text>
                                  <Text style={styles.insightsChartLabel}>{label}</Text>
                                </View>
                              ))}
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                  <View style={styles.insightsCard}>
                    <Text style={styles.insightsCardEyebrow}>Next steps</Text>
                    <Text style={styles.insightsCardSummary}>{selectedInsightContent.recommendation}</Text>
                  </View>
                </ScrollView>
              ) : null}
            </View>
          )}
        </View>
  );
}
