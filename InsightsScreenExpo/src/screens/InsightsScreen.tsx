// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  INSIGHT_GROUPS,
  INSIGHT_TREND_WINDOW_CHIP,
  INSIGHT_TREND_WINDOW_ORDER,
  QUICK_ACTION_ICON_BY_TAB,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
  type InsightContent,
  type InsightTab,
} from '../constants/insights';
import { InsightsFavoriteSparkPage } from '../components/insights/InsightsFavoriteSparkPage';
import { buildDenseAxisTickIndices, formatTrendPointValue } from '../lib/insightChartAxis';
import { generateInsightAnalysisBody } from '../lib/zeticClient';
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
    starredGalleryUserDraggingRef,
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
    insightTrendWindow,
    onInsightTrendWindowChange,
  } = props;

  const [insightLlmText, setInsightLlmText] = useState<string | null>(null);
  const [insightLlmBusy, setInsightLlmBusy] = useState(false);
  const [insightLlmErr, setInsightLlmErr] = useState<string | null>(null);

  useEffect(() => {
    setInsightLlmText(null);
    setInsightLlmErr(null);
    setInsightLlmBusy(false);
  }, [activeInsightTab]);

  const runInsightLlm = useCallback(async () => {
    if (!activeInsightTab || !selectedInsightContent) {
      return;
    }
    setInsightLlmBusy(true);
    setInsightLlmErr(null);
    try {
      const r = await generateInsightAnalysisBody({
        trendWindow: insightTrendWindow,
        tab: activeInsightTab,
        title: selectedInsightContent.title,
        summary: selectedInsightContent.summary,
        trend: selectedInsightContent.trend,
        recommendation: selectedInsightContent.recommendation,
        trendUnit: selectedInsightContent.trendUnit,
        trendPoints: selectedInsightContent.trendPoints ?? [],
      });
      setInsightLlmText(r.analysis);
    } catch (e) {
      setInsightLlmErr(e?.message ? String(e.message) : String(e));
    } finally {
      setInsightLlmBusy(false);
    }
  }, [activeInsightTab, insightTrendWindow, selectedInsightContent]);

  const trendWindowPicker =
    Platform.OS === 'ios' ? (
      <View style={styles.insightsTrendWindowRow}>
        <Text style={styles.insightsTrendWindowLabel}>Trend window</Text>
        <View style={styles.insightsTrendWindowChips}>
          {INSIGHT_TREND_WINDOW_ORDER.map((w) => {
            const active = insightTrendWindow === w;
            return (
              <TouchableOpacity
                key={w}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: healthKitLoading }}
                disabled={healthKitLoading}
                onPress={() => onInsightTrendWindowChange(w)}
                style={[styles.insightsTrendWindowChip, active && styles.insightsTrendWindowChipActive]}
              >
                <Text style={[styles.insightsTrendWindowChipText, active && styles.insightsTrendWindowChipTextActive]}>
                  {INSIGHT_TREND_WINDOW_CHIP[w]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    ) : null;

  return (
        <View style={styles.insightsScreen}>
          {activeInsightTab == null ? (
            <ScrollView
              bounces={false}
              contentContainerStyle={{ paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              style={styles.insightsHubScroll}
            >
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
                    void initHealthKitAsync(insightTrendWindow);
                  }}
                  style={[styles.healthConnectBtn, healthKitLoading && styles.healthConnectBtnDisabled]}
                >
                  <Text style={styles.healthConnectBtnText}>{healthKitLoading ? 'Connecting...' : 'Connect Apple Health'}</Text>
                </TouchableOpacity>
              ) : null}
              {healthKitLastError ? <Text style={styles.healthErrorText}>{healthKitLastError}</Text> : null}
              {trendWindowPicker}
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
                        starredGalleryUserDraggingRef.current = true;
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
              <View style={[styles.insightsTabStack, styles.insightsTabScroll]}>
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
          ) : (
            <View style={styles.insightsDetailScreen}>
              {selectedInsightContent ? (
                <ScrollView
                  bounces={false}
                  contentContainerStyle={styles.insightsDetailScrollContent}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  overScrollMode="never"
                  showsVerticalScrollIndicator={false}
                  style={styles.insightsDetailScroll}
                >
                  <View style={styles.insightsDetailHeader}>
                    <TouchableOpacity onPress={() => setActiveInsightTab(null)} style={styles.insightsBackBtn}>
                      <Ionicons name="chevron-back" size={20} color="#f8fafc" />
                    </TouchableOpacity>
                    <View style={styles.insightsDetailHeaderText}>
                      <Text style={styles.insightsTitle}>{activeInsightTab}</Text>
                      <Text style={styles.insightsDetailSubtitle}>Dedicated insight view</Text>
                    </View>
                  </View>
                  <View style={styles.insightsDetailOverview}>
                    <Text style={styles.insightsCardEyebrow}>Overview</Text>
                    <Text style={styles.insightsDetailOverviewTitle}>{selectedInsightContent.title}</Text>
                    <Text style={styles.insightsDetailOverviewSummary}>{selectedInsightContent.summary}</Text>
                  </View>
                  {trendWindowPicker}
                  <View style={styles.insightsCard}>
                    <View style={styles.insightsChartHeader}>
                      <Text style={styles.insightsCardSection}>{INSIGHT_TREND_WINDOW_CHIP[insightTrendWindow]} trend</Text>
                      <Text style={styles.insightsChartUnit}>Unit: {selectedInsightContent.trendUnit}</Text>
                    </View>
                    <View style={styles.insightsLineChartWrap}>
                      {(() => {
                        const points = selectedInsightContent.trendPoints ?? [0, 0, 0, 0, 0, 0, 0];
                        const labels = selectedInsightContent.trendLabels ?? ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                        const n = points.length;
                        const graphPaddingX = 16;
                        const graphPaddingY = 14;
                        const minOuter = 320;
                        const innerMin = minOuter - graphPaddingX * 2;
                        const gaps = Math.max(n - 1, 1);
                        const naturalStep = innerMin / gaps;
                        const pxBetween =
                          n > 50 ? Math.max(3.25, naturalStep) : n > 14 ? Math.max(5.5, naturalStep) : naturalStep;
                        const chartWidth = Math.round(graphPaddingX * 2 + pxBetween * gaps);
                        const chartHeight = n > 50 ? 138 : n > 14 ? 128 : 120;
                        const dense = n > 14;
                        const showDots = n <= 12;
                        const strokeW = n > 50 ? 1.7 : n > 24 ? 2 : 2.5;
                        const max = Math.max(...points, 1);
                        const usableWidth = chartWidth - graphPaddingX * 2;
                        const usableHeight = chartHeight - graphPaddingY * 2;
                        const stepX = gaps > 0 ? usableWidth / gaps : usableWidth;
                        const coords = points.map((value, idx) => {
                          const x = graphPaddingX + idx * stepX;
                          const y = graphPaddingY + (1 - value / max) * usableHeight;
                          return { x, y, value };
                        });
                        const pathD = coords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
                        const midY = graphPaddingY + usableHeight / 2;
                        const dataMin = Math.min(...points);
                        const dataMax = Math.max(...points);
                        const tickXs = coords.map((c) => c.x);
                        const axisTickIndices = dense
                          ? buildDenseAxisTickIndices(labels, n, tickXs, {
                              minGapPx: n > 85 ? 50 : 56,
                              maxTicks: n > 85 ? 8 : 10,
                            })
                          : [];

                        const chartBody = (
                          <View style={{ width: chartWidth }}>
                            <Svg height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={chartWidth}>
                              <Path
                                d={`M ${graphPaddingX} ${chartHeight - graphPaddingY} L ${chartWidth - graphPaddingX} ${chartHeight - graphPaddingY}`}
                                stroke="rgba(148,163,184,0.22)"
                                strokeWidth={1}
                              />
                              <Path
                                d={`M ${graphPaddingX} ${midY} L ${chartWidth - graphPaddingX} ${midY}`}
                                stroke="rgba(148,163,184,0.12)"
                                strokeDasharray="4 6"
                                strokeWidth={1}
                              />
                              <Path
                                d={pathD}
                                fill="none"
                                stroke="#38bdf8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={strokeW}
                              />
                              {showDots
                                ? coords.map((pt, idx) => (
                                    <Circle
                                      key={`${selectedInsightContent.title}-dot-${idx}`}
                                      cx={pt.x}
                                      cy={pt.y}
                                      fill="#0f172a"
                                      r={3.6}
                                      stroke="#38bdf8"
                                      strokeWidth={2}
                                    />
                                  ))
                                : null}
                            </Svg>
                            {dense ? (
                              <>
                                <Text style={styles.insightsLineChartRangeLegend}>
                                  {`Low ${formatTrendPointValue(dataMin)} · High ${formatTrendPointValue(dataMax)} — swipe the chart for dates below`}
                                </Text>
                                <View style={[styles.insightsLineChartAxisStrip, { width: chartWidth }]}>
                                  {axisTickIndices.map((idx) => {
                                    const cx = coords[idx].x;
                                    const labelW = 54;
                                    const left = Math.min(
                                      chartWidth - labelW,
                                      Math.max(0, Math.round(cx - labelW / 2)),
                                    );
                                    return (
                                      <View
                                        key={`${selectedInsightContent.title}-axis-${idx}`}
                                        style={[styles.insightsLineChartAxisTick, { left }]}
                                      >
                                        <Text style={styles.insightsLineChartAxisValue}>
                                          {formatTrendPointValue(points[idx])}
                                        </Text>
                                        <Text style={styles.insightsLineChartAxisDate}>{labels[idx]}</Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              </>
                            ) : (
                              <View style={styles.insightsLineLabelsRow}>
                                {labels.map((label, idx) => {
                                  const v = points[idx];
                                  return (
                                    <View
                                      key={`${selectedInsightContent.title}-label-${idx}`}
                                      style={styles.insightsLineLabelItem}
                                    >
                                      <Text numberOfLines={1} style={styles.insightsChartValue}>
                                        {formatTrendPointValue(v)}
                                      </Text>
                                      <Text numberOfLines={1} style={styles.insightsChartLabel}>
                                        {label}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );

                        return dense ? (
                          <ScrollView
                            horizontal
                            nestedScrollEnabled
                            showsHorizontalScrollIndicator
                            style={styles.insightsLineChartHScroll}
                            contentContainerStyle={styles.insightsLineChartHScrollContent}
                          >
                            {chartBody}
                          </ScrollView>
                        ) : (
                          chartBody
                        );
                      })()}
                    </View>
                  </View>
                  <View style={styles.insightsDetailLlmSection}>
                    <Text style={styles.insightsCardEyebrow}>On-edge (GEMMA-4-E2B-IT)</Text>
                    {Platform.OS !== 'ios' ? (
                      <Text style={styles.insightsHealthTagline}>Runs on iOS with the Zetic on-edge model (GEMMA-4-E2B-IT).</Text>
                    ) : null}
                    {Platform.OS === 'ios' && insightLlmBusy ? (
                      <View style={styles.insightsStatusRow}>
                        <ActivityIndicator accessibilityLabel="Generating insight analysis" color="#93c5fd" size="small" />
                        <Text style={styles.insightsHealthTagline}>Synthesizing this view…</Text>
                      </View>
                    ) : null}
                    {insightLlmErr ? <Text style={styles.healthErrorText}>{insightLlmErr}</Text> : null}
                    {insightLlmText ? (
                      <>
                        <Text style={styles.insightsDetailOverviewSummary}>{insightLlmText}</Text>
                        <TouchableOpacity
                          disabled={insightLlmBusy}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          onPress={runInsightLlm}
                          style={styles.insightsLlmRegenerateWrap}
                        >
                          <Text style={styles.insightsLlmRegenerateText}>Regenerate</Text>
                        </TouchableOpacity>
                      </>
                    ) : Platform.OS === 'ios' && !insightLlmBusy ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={runInsightLlm}
                        style={[styles.healthConnectBtn, styles.insightsLlmPrimaryBtn]}
                      >
                        <Text style={styles.healthConnectBtnText}>Analyze this metric</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.insightsDetailHeader}>
                  <TouchableOpacity onPress={() => setActiveInsightTab(null)} style={styles.insightsBackBtn}>
                    <Ionicons name="chevron-back" size={20} color="#f8fafc" />
                  </TouchableOpacity>
                  <View style={styles.insightsDetailHeaderText}>
                    <Text style={styles.insightsTitle}>{activeInsightTab}</Text>
                    <Text style={styles.insightsDetailSubtitle}>Dedicated insight view</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
  );
}
