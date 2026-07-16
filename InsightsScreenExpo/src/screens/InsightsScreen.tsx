// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, Platform, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getInsightHubConfig,
  INSIGHT_GROUPS,
  insightTabLabel,
} from '../constants/insights';
import { InsightMetricHubDetail } from '../components/insights/InsightMetricHubDetail';
import { InsightGlucoseDetail } from '../components/insights/InsightGlucoseDetail';
import { InsightHeartRateDetail } from '../components/insights/InsightHeartRateDetail';
import { InsightSleepDetail } from '../components/insights/InsightSleepDetail';
import { InsightMetricSection } from '../components/insights/InsightMetricSection';
import { InsightMedicationsSection } from '../components/insights/InsightMedicationsSection';
import { InsightMedicationsDetail } from '../components/insights/InsightMedicationsDetail';
import type { MedicationSchedule } from '../constants/medications';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { formatLastSyncedLabel } from '../lib/insightMetricFreshness';
import {
  createMedicationSchedule,
  loadActiveMedicationSchedules,
  softDeleteMedicationSchedule,
  toggleMedicationScheduleTaken,
  updateMedicationSchedule,
} from '../lib/medicationsStorage';
import { syncAllMedicationNotifications } from '../lib/medicationNotifications';
import { mergePaletteLayer } from '../theme/demoPaletteTheme';
import { TrackedTouchableOpacity } from '../components/TrackedTouchableOpacity';

type Props = any;

export default function InsightsScreen(props: Props) {
  const { styles } = useTypography();
  const { layers, theme } = useDemoPalette();
  const windowWidth = useWindowDimensions().width;
  const insets = useSafeAreaInsets();
  const horizontalInset = Math.max(20, insets.left, insets.right);
  const detailContentWidth = windowWidth - horizontalInset * 2;
  const {
    activeInsightTab,
    healthKitLoading,
    healthKitStatus,
    healthKitLastError,
    healthKitLastSyncedAtMs,
    setHealthKitStatus,
    initHealthKitAsync,
    insightContentByTab,
    onOpenInsightTab,
    onInsightDetailBack,
    onMedicationsDetailBack,
    medicationsOpenRequest = 0,
    refreshHealthKitAsync,
  } = props;

  /** `healthKitLoading` is true for chart refresh too; only the first Apple permission/link is “connecting”. */
  const healthKitAwaitingAuthorization = healthKitLoading && healthKitStatus !== 'ready';
  const healthKitRefreshingCharts = healthKitLoading && healthKitStatus === 'ready';
  const healthKitSyncColor = '#eab308';
  const activeHub = activeInsightTab ? getInsightHubConfig(activeInsightTab) : undefined;
  const [syncLabelNowMs, setSyncLabelNowMs] = useState(() => Date.now());
  const [medicationsDetailOpen, setMedicationsDetailOpen] = useState(false);
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);

  const refreshMedications = useCallback(async () => {
    const rows = await loadActiveMedicationSchedules();
    setSchedules(rows);
    void syncAllMedicationNotifications(rows);
  }, []);

  useEffect(() => {
    void refreshMedications();
  }, [refreshMedications]);

  useEffect(() => {
    if (medicationsOpenRequest > 0) {
      setMedicationsDetailOpen(true);
    }
  }, [medicationsOpenRequest]);

  const handleMedicationsDetailBack = useCallback(() => {
    setMedicationsDetailOpen(false);
    onMedicationsDetailBack?.();
  }, [onMedicationsDetailBack]);

  const hubOverlayOpen = activeInsightTab != null || medicationsDetailOpen;

  const handleOpenMetric = (tab) => {
    setMedicationsDetailOpen(false);
    onOpenInsightTab(tab);
  };

  useEffect(() => {
    if (!healthKitLastSyncedAtMs || healthKitRefreshingCharts) {
      return;
    }
    const interval = setInterval(() => setSyncLabelNowMs(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [healthKitLastSyncedAtMs, healthKitRefreshingCharts]);

  const lastSyncedLabel =
    healthKitStatus === 'ready' && healthKitLastSyncedAtMs
      ? healthKitRefreshingCharts
        ? 'Syncing now…'
        : formatLastSyncedLabel(healthKitLastSyncedAtMs, syncLabelNowMs)
      : '';

  const healthCapsuleStyle =
    Platform.OS === 'ios' && healthKitRefreshingCharts
      ? mergePaletteLayer(layers, 'insightsHealthCapsuleSyncing', styles.insightsHealthCapsuleSyncing)
      : healthKitStatus === 'ready' && Platform.OS === 'ios'
        ? mergePaletteLayer(layers, 'insightsHealthCapsuleConnected', styles.insightsHealthCapsuleConnected)
        : mergePaletteLayer(layers, 'insightsHealthCapsuleDisconnected', styles.insightsHealthCapsuleDisconnected);

  const healthCapsuleTextStyle =
    Platform.OS === 'ios' && healthKitRefreshingCharts
      ? mergePaletteLayer(layers, 'insightsHealthCapsuleTextSyncing', styles.insightsHealthCapsuleTextSyncing)
      : healthKitStatus === 'ready' && Platform.OS === 'ios'
        ? mergePaletteLayer(layers, 'insightsHealthCapsuleTextConnected', styles.insightsHealthCapsuleTextConnected)
        : mergePaletteLayer(layers, 'insightsHealthCapsuleTextDisconnected', styles.insightsHealthCapsuleTextDisconnected);

  const healthCapsuleLabel =
    Platform.OS !== 'ios'
      ? 'iOS only'
      : healthKitAwaitingAuthorization
        ? 'Connecting…'
        : healthKitRefreshingCharts
          ? 'Syncing…'
          : healthKitStatus === 'ready'
            ? 'Apple Health'
            : 'Not synced';

  return (
        <View style={mergePaletteLayer(layers, 'insightsScreen', styles.insightsScreen)}>
            <ScrollView
              bounces={Platform.OS === 'ios'}
              contentContainerStyle={[
                styles.insightsHubScrollContent,
                { paddingHorizontal: horizontalInset, paddingBottom: 12 },
              ]}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              overScrollMode="never"
              refreshControl={
                Platform.OS === 'ios' && !hubOverlayOpen ? (
                  <RefreshControl
                    onRefresh={() => {
                      void refreshHealthKitAsync?.();
                    }}
                    refreshing={healthKitRefreshingCharts}
                    tintColor={healthKitRefreshingCharts ? healthKitSyncColor : (theme?.textMuted ?? '#94a3b8')}
                  />
                ) : undefined
              }
              scrollEnabled={!hubOverlayOpen}
              showsVerticalScrollIndicator={false}
              style={mergePaletteLayer(layers, 'insightsHubScroll', styles.insightsHubScroll)}
            >
              <View style={styles.insightsTitleRow}>
                <Text style={mergePaletteLayer(layers, 'insightsTitle', styles.insightsTitle)}>Insights</Text>
                <View style={styles.insightsHealthStatusStack}>
                  <View
                    accessibilityLabel={
                      Platform.OS !== 'ios'
                        ? 'Apple Health is available on iOS only'
                        : healthKitAwaitingAuthorization
                          ? 'Connecting to Apple Health'
                          : healthKitRefreshingCharts
                            ? 'Updating Apple Health data'
                            : healthKitStatus === 'ready'
                              ? 'Connected to Apple Health'
                              : 'Not synced with Apple Health'
                    }
                    style={[styles.insightsHealthCapsule, healthCapsuleStyle]}
                  >
                    {Platform.OS === 'ios' && (healthKitAwaitingAuthorization || healthKitRefreshingCharts) ? (
                      <ActivityIndicator
                        color={healthKitRefreshingCharts ? healthKitSyncColor : '#f87171'}
                        size={10}
                        style={styles.insightsHealthCapsuleSpinner}
                      />
                    ) : (
                      <View
                        style={[
                          styles.insightsHealthCapsuleDot,
                          healthKitStatus === 'ready' && Platform.OS === 'ios'
                            ? styles.insightsHealthCapsuleDotConnected
                            : styles.insightsHealthCapsuleDotDisconnected,
                        ]}
                      />
                    )}
                    <Text style={[styles.insightsHealthCapsuleText, healthCapsuleTextStyle]}>
                      {healthCapsuleLabel}
                    </Text>
                  </View>
                  {lastSyncedLabel ? (
                    <Text
                      style={mergePaletteLayer(layers, 'insightsHealthSyncMeta', styles.insightsHealthSyncMeta)}
                      numberOfLines={1}
                    >
                      {lastSyncedLabel}
                    </Text>
                  ) : null}
                </View>
              </View>
              {Platform.OS === 'ios' && healthKitStatus === 'denied' ? (
                <TrackedTouchableOpacity
                  disabled={healthKitLoading}
                  onPress={() => {
                    setHealthKitStatus('idle');
                    InteractionManager.runAfterInteractions(() => {
                      void initHealthKitAsync();
                    });
                  }}
                  style={[
                    mergePaletteLayer(layers, 'healthConnectBtn', styles.healthConnectBtn),
                    healthKitLoading && styles.healthConnectBtnDisabled,
                  ]}
                  trackId="insights.connectAppleHealth"
                >
                  <Text style={mergePaletteLayer(layers, 'healthConnectBtnText', styles.healthConnectBtnText)}>
                    {healthKitLoading ? 'Connecting...' : 'Connect Apple Health'}
                  </Text>
                </TrackedTouchableOpacity>
              ) : null}
              {healthKitLastError ? <Text style={mergePaletteLayer(layers, 'healthErrorText', styles.healthErrorText)}>{healthKitLastError}</Text> : null}
              <View style={styles.insightsMetricSectionsStack}>
                <InsightMedicationsSection onPress={() => setMedicationsDetailOpen(true)} schedules={schedules} />
                {INSIGHT_GROUPS.map((group) => (
                  <InsightMetricSection
                    key={group.id}
                    group={group}
                    healthKitReady={healthKitStatus === 'ready'}
                    insightContentByTab={insightContentByTab}
                    onOpenMetric={handleOpenMetric}
                  />
                ))}
              </View>
            </ScrollView>
          {medicationsDetailOpen ? (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                mergePaletteLayer(layers, 'insightsDetailScreen', styles.insightsDetailOverlay),
              ]}
            >
              <View style={[styles.insightsDetailHeader, { paddingHorizontal: horizontalInset }]}>
                <TrackedTouchableOpacity onPress={handleMedicationsDetailBack} style={styles.insightsBackBtn} trackId="insights.medications.back">
                  <Ionicons name="chevron-back" size={20} color={theme?.textPrimary ?? '#f8fafc'} />
                </TrackedTouchableOpacity>
                <View style={styles.insightsDetailHeaderText}>
                  <Text style={mergePaletteLayer(layers, 'insightsTitle', styles.insightsTitle)}>Medications</Text>
                </View>
              </View>
              <View style={{ flex: 1, paddingHorizontal: horizontalInset }}>
                <InsightMedicationsDetail
                  onAddSchedule={async (dayKey, draft) => {
                    await createMedicationSchedule({ dayKey, ...draft });
                    await refreshMedications();
                  }}
                  onUpdateSchedule={async (id, dayKey, draft) => {
                    await updateMedicationSchedule({ id, dayKey, ...draft });
                    await refreshMedications();
                  }}
                  onDeleteSchedule={async (id) => {
                    await softDeleteMedicationSchedule(id);
                    await refreshMedications();
                  }}
                  onToggleTaken={async (id, taken) => {
                    await toggleMedicationScheduleTaken(id, taken);
                    await refreshMedications();
                  }}
                  schedules={schedules}
                />
              </View>
            </View>
          ) : null}
          {activeInsightTab != null && !medicationsDetailOpen ? (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                mergePaletteLayer(layers, 'insightsDetailScreen', styles.insightsDetailOverlay),
              ]}
            >
              <ScrollView
                bounces={Platform.OS === 'ios'}
                contentContainerStyle={[
                  mergePaletteLayer(layers, 'insightsDetailScrollContent', styles.insightsDetailScrollContent),
                  { paddingHorizontal: horizontalInset },
                ]}
                directionalLockEnabled
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                overScrollMode="never"
                refreshControl={
                  Platform.OS === 'ios' ? (
                    <RefreshControl
                      onRefresh={() => {
                        void refreshHealthKitAsync?.();
                      }}
                      refreshing={healthKitRefreshingCharts}
                      tintColor={healthKitRefreshingCharts ? healthKitSyncColor : (theme?.textMuted ?? '#94a3b8')}
                    />
                  ) : undefined
                }
                showsVerticalScrollIndicator={false}
                style={mergePaletteLayer(layers, 'insightsDetailScroll', styles.insightsDetailScroll)}
              >
                  <View style={styles.insightsDetailHeader}>
                    <TrackedTouchableOpacity onPress={onInsightDetailBack} style={styles.insightsBackBtn} trackId="insights.detail.back">
                      <Ionicons name="chevron-back" size={20} color={theme?.textPrimary ?? '#f8fafc'} />
                    </TrackedTouchableOpacity>
                    <View style={styles.insightsDetailHeaderText}>
                      <Text style={mergePaletteLayer(layers, 'insightsTitle', styles.insightsTitle)}>{insightTabLabel(activeInsightTab)}</Text>
                    </View>
                  </View>
                  {activeInsightTab === 'Blood Glucose' && insightContentByTab?.['Blood Glucose'] ? (
                    <InsightGlucoseDetail
                      content={insightContentByTab['Blood Glucose']}
                      healthKitReady={healthKitStatus === 'ready'}
                    />
                  ) : activeHub?.rootTab === 'Heart Rate' && insightContentByTab ? (
                    <InsightHeartRateDetail
                      contentWidth={detailContentWidth}
                      healthKitReady={healthKitStatus === 'ready'}
                      hub={activeHub}
                      insightContentByTab={insightContentByTab}
                    />
                  ) : activeHub?.rootTab === 'Sleep' && insightContentByTab ? (
                    <InsightSleepDetail
                      contentWidth={detailContentWidth}
                      healthKitReady={healthKitStatus === 'ready'}
                      hub={activeHub}
                      insightContentByTab={insightContentByTab}
                    />
                  ) : activeHub && insightContentByTab ? (
                    <InsightMetricHubDetail
                      healthKitReady={healthKitStatus === 'ready'}
                      hub={activeHub}
                      insightContentByTab={insightContentByTab}
                    />
                  ) : activeInsightTab && insightContentByTab?.[activeInsightTab] ? (
                    <InsightMetricHubDetail
                      healthKitReady={healthKitStatus === 'ready'}
                      hub={{
                        rootTab: activeInsightTab,
                        nestedTabs: [],
                        sections: [{ rows: [{ label: 'Latest', tab: activeInsightTab }] }],
                      }}
                      insightContentByTab={insightContentByTab}
                    />
                  ) : null}
                </ScrollView>
            </View>
          ) : null}
        </View>
  );
}
