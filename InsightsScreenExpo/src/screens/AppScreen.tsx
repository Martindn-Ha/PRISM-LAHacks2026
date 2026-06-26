import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Linking,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  InteractionManager,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import * as Contacts from 'expo-contacts';
import { BottomNavBar } from '../components/navigation/BottomNavBar';
import { AppHeader } from '../components/navigation/AppHeader';
import { APP_DISPLAY_NAME } from '../constants/appBranding';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { useTypography } from '../context/TypographyContext';
import { getAppCanvasBackground, mergePaletteLayer, withAlpha } from '../theme/demoPaletteTheme';
import {
  type NavItemLabel,
} from '../constants/appNavigation';
import {
  DASHBOARD_GALLERY_METRICS,
  DASHBOARD_METRIC_INSIGHT_TAB,
  DASHBOARD_QUICK_ACTION_SLOTS,
  insightTabLabel,
  INSIGHTS_TAB_CONTENT,
  INSIGHT_UNITS,
  QUICK_ACTION_ICON_BY_TAB,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
  resolveInsightDetailTab,
  type InsightContent,
  type InsightHeartRateChartData,
  type InsightSleepChartData,
  type InsightTab,
} from '../constants/insights';
import {
  DASHBOARD_QUICK_ACTION_FALLBACKS,
  isDashboardQuickActionMedications,
  normalizeDashboardQuickActions,
  type DashboardQuickAction,
} from '../constants/dashboardQuickActions';
import { buildHeartRateChartData } from '../lib/heartRateChartData';
import {
  buildSleepChartData,
  formatSleepTrendHours,
  resolveLastRecordedSleepNight,
  type SleepSegmentInput,
} from '../lib/sleepChartData';
import { formatInsightDayLabels, resolveLastRecordedTrendDay } from '../lib/insightTrendDisplay';
import { DashboardQuickActionMetricsRow } from '../components/dashboard/DashboardQuickMetrics';
import { DashboardQuickMetricsPicker } from '../components/dashboard/DashboardQuickMetricsPicker';
import { CreateGoalModal } from '../components/goals/CreateGoalModal';
import { DashboardMetricCard } from '../components/dashboard/DashboardMetricCard';
import { InsightsStarredGallery } from '../components/insights/InsightsStarredGallery';
import { Notifications } from '../lib/expoNotifications';
import { buildInsightsHealthKitReadPermissions, healthKit, type HealthKitWorkoutSample } from '../lib/appleHealthKit';
import { loadDashboardQuickMetrics, saveDashboardQuickMetrics } from '../lib/dashboardQuickMetricsStorage';
import type { MetricGoal } from '../constants/goals';
import { isGoalMetricAvailable } from '../constants/goals';
import { createGoal, loadActiveGoals, softDeleteGoal } from '../lib/goalsStorage';
import {
  calculateGlucoseScore,
  calculateHeartRateScore,
  calculateOverallHealthScore,
  calculateSleepScore,
  filterReadingsToDay,
  mapHealthKitSamplesToReadings,
} from '../lib/healthScoreFromMetrics';
import { getHealthKitLinked, getHealthKitLastSyncedAtMs, setHealthKitLastSyncedAtMs, setHealthKitLinked } from '../lib/healthKitConnection';
import { loadGlucoseData } from '../lib/glucoseProvider';
import { loadHealthEvents, toAlertLogEvents } from '../lib/healthEventStorage';
import { processGlucoseEventsIfEnabled } from '../lib/processGlucoseEvents';
import { refreshHealthEventMonitoring, stopHealthEventMonitoring } from '../lib/healthEventMonitoring';
import {
  disableLocationCorrelation,
  enableLocationCorrelation,
  isLocationCorrelationEnabled,
} from '../lib/locationCorrelationSettings';
import { clearTrail } from '../lib/locationTrail';
import {
  areEventNotificationsMuted,
  setEventNotificationsMuted,
} from '../lib/eventNotificationSettings';
import { toErrorText } from '../utils/format';
import { getScorePresentation } from '../services/scoringService';
import { useAppChrome } from '../hooks/useAppChrome';
import GoalsScreen from './GoalsScreen';
import InsightsScreen from './InsightsScreen';
import LogsScreen from './LogsScreen';
import SwipesScreen from './SwipesScreen';
import PersonalityQuestionnaireScreen from './PersonalityQuestionnaireScreen';
import ProfileShowcaseScreen from './ProfileShowcaseScreen';
import type {
  AlertLogEvent,
} from '../types/experience';

type DemoHighAlert = {
  id: string;
  title: string;
  detail: string;
  severity: 'High';
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

/** True for actual sleep stages from Apple Health (not INBED / AWAKE). */
function isAppleHealthAsleepSegment(value: string | undefined): boolean {
  const v = (value ?? '').toUpperCase();
  if (!v || v === 'INBED' || v === 'AWAKE') {
    return false;
  }
  return v === 'ASLEEP' || v === 'CORE' || v === 'DEEP' || v === 'REM';
}

function healthKitSampleAtMs(sample: { startDate?: string; endDate?: string }): number {
  const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
  const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
  return Math.max(start, end);
}

function sleepSampleMinutes(sample: { startDate?: string; endDate?: string; value?: string }): number {
  if (!isAppleHealthAsleepSegment(sample.value)) {
    return 0;
  }
  const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
  const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
  if (!start || !end || end <= start) {
    return 0;
  }
  return (end - start) / (1000 * 60);
}

type SleepStageKey = 'DEEP' | 'REM' | 'CORE';

function sleepStageMinutes(
  sample: { startDate?: string; endDate?: string; value?: string },
  stage: SleepStageKey,
): number {
  const v = (sample.value ?? '').toUpperCase();
  const matches =
    stage === 'DEEP' ? v === 'DEEP' : stage === 'REM' ? v === 'REM' : v === 'CORE' || v === 'ASLEEP';
  if (!matches) {
    return 0;
  }
  const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
  const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
  if (!start || !end || end <= start) {
    return 0;
  }
  return (end - start) / (1000 * 60);
}

/** Calendar day in local timezone — avoids UTC drift when bucketing HealthKit samples. */
function toLocalDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildSleepStageTrendPoints(
  samples: Array<{ startDate?: string; endDate?: string; value?: string }>,
  bucketDates: Date[],
  stage: SleepStageKey,
  toDayKey: (value: Date) => string,
): number[] {
  const byDay = new Map<string, number>();
  samples.forEach((sample) => {
    const minutes = sleepStageMinutes(sample, stage);
    if (minutes <= 0) {
      return;
    }
    const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
    if (!end) {
      return;
    }
    const key = toDayKey(new Date(end));
    byDay.set(key, (byDay.get(key) ?? 0) + minutes);
  });
  return bucketDates.map((d) => Number(((byDay.get(toDayKey(d)) ?? 0) / 60).toFixed(1)));
}

export default function App() {
  const { styles, ts, ss } = useTypography();
  const { bottomNavHeight, insets } = useAppChrome();
  const tabStackInset = useMemo(() => ({ bottom: bottomNavHeight }), [bottomNavHeight]);
  const { width: windowWidth } = useWindowDimensions();
  const starredGalleryPageWidth = Math.max(0, windowWidth - 32);
  const starredGalleryScrollRef = useRef<ScrollView | null>(null);
  const starredGalleryNextScrollAnimatedRef = useRef(false);
  const starredGallerySuppressAutoUntilRef = useRef(0);
  /** When true, skip programmatic gallery scrollTo so user-driven scroll can update dots without fighting layout. */
  const suppressStarredGalleryLayoutScrollRef = useRef(false);
  /** When false, ignore onScroll-driven index updates (avoids fighting auto-rotate during programmatic scrollTo). */
  const starredGalleryUserDraggingRef = useRef(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [alertEventLog, setAlertEventLog] = useState<AlertLogEvent[]>([]);
  const [glucoseValue, setGlucoseValue] = useState(0);
  const [glucoseTrendArrow, setGlucoseTrendArrow] = useState<string | undefined>(undefined);
  const [heartRateCardValue, setHeartRateCardValue] = useState(0);
  const [activitySteps, setActivitySteps] = useState(0);
  const [activitySleepMinutes, setActivitySleepMinutes] = useState<number | null>(null);
  const { layers, theme, colorScheme, setColorScheme } = useDemoPalette();
  /** ScrollView + tab stack need an explicit fill; RN often defaults that chrome to white. */
  const canvasBg = getAppCanvasBackground(theme);
  const gaugeTickMajor = useMemo(() => (theme ? withAlpha(theme.textPrimary, 0.82) : 'rgba(255,255,255,0.75)'), [theme]);
  const gaugeTickMinor = useMemo(() => (theme ? withAlpha(theme.textMuted, 0.55) : 'rgba(255,255,255,0.4)'), [theme]);
  const gaugeScaleLabelFill = useMemo(() => (theme ? withAlpha(theme.textPrimary, 0.94) : '#f8fafc'), [theme]);
  const gaugeNeedleFill = theme?.isLight ? theme.textPrimary : '#ffffff';
  const inputPlaceholderColor = theme?.textMuted ?? '#64748b';
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab | null>(null);
  /** When set, Insights detail back returns to this main tab (e.g. Dashboard) instead of the Insights hub. */
  const [insightDetailReturnTab, setInsightDetailReturnTab] = useState<string | null>(null);
  const [dashboardQuickMetrics, setDashboardQuickMetrics] = useState<DashboardQuickAction[]>(() =>
    normalizeDashboardQuickActions(DASHBOARD_QUICK_ACTION_FALLBACKS.slice(0, DASHBOARD_QUICK_ACTION_SLOTS)),
  );
  const [medicationsOpenRequest, setMedicationsOpenRequest] = useState(0);
  const [showQuickMetricsPicker, setShowQuickMetricsPicker] = useState(false);
  const [starredGalleryIndex, setStarredGalleryIndex] = useState(0);

  const insightsGalleryScrollPages = useMemo(() => {
    const m = DASHBOARD_GALLERY_METRICS;
    const n = m.length;
    if (n === 0) {
      return [] as { metric: InsightTab; pageKey: string }[];
    }
    if (n === 1) {
      return [{ metric: m[0]!, pageKey: 'gallery-solo' }];
    }
    return [
      { metric: m[n - 1]!, pageKey: 'gallery-clone-before' },
      ...m.map((metric) => ({ metric, pageKey: `gallery-slot-${metric}` })),
      { metric: m[0]!, pageKey: 'gallery-clone-after' },
    ];
  }, []);

  const onInsightsGalleryScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!starredGalleryUserDraggingRef.current) {
        return;
      }
      const w = starredGalleryPageWidth;
      if (w <= 0) {
        return;
      }
      const n = DASHBOARD_GALLERY_METRICS.length;
      if (n <= 1) {
        setStarredGalleryIndex(0);
        return;
      }
      const rel = e.nativeEvent.contentOffset.x / w;
      let k = Math.round(rel) - 1;
      if (k < 0) {
        k = n - 1;
      } else if (k >= n) {
        k = 0;
      }
      setStarredGalleryIndex((prev) => (prev === k ? prev : k));
    },
    [starredGalleryPageWidth],
  );

  const onInsightsGalleryMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      starredGalleryUserDraggingRef.current = false;
      suppressStarredGalleryLayoutScrollRef.current = false;
      const w = starredGalleryPageWidth;
      if (w <= 0) {
        return;
      }
      const n = DASHBOARD_GALLERY_METRICS.length;
      if (n <= 1) {
        setStarredGalleryIndex(0);
        return;
      }
      const p = Math.round(e.nativeEvent.contentOffset.x / w);
      if (p === 0) {
        suppressStarredGalleryLayoutScrollRef.current = true;
        setStarredGalleryIndex(n - 1);
        requestAnimationFrame(() => {
          starredGalleryScrollRef.current?.scrollTo({ x: n * w, animated: false });
          suppressStarredGalleryLayoutScrollRef.current = false;
        });
        return;
      }
      if (p === n + 1) {
        suppressStarredGalleryLayoutScrollRef.current = true;
        setStarredGalleryIndex(0);
        requestAnimationFrame(() => {
          starredGalleryScrollRef.current?.scrollTo({ x: w, animated: false });
          suppressStarredGalleryLayoutScrollRef.current = false;
        });
        return;
      }
      setStarredGalleryIndex(p - 1);
    },
    [starredGalleryPageWidth],
  );

  const advanceStarredGalleryAuto = useCallback(() => {
    const n = DASHBOARD_GALLERY_METRICS.length;
    const w = starredGalleryPageWidth;
    if (n <= 1 || w <= 0) {
      return;
    }

    starredGalleryNextScrollAnimatedRef.current = true;
    suppressStarredGalleryLayoutScrollRef.current = false;

    setStarredGalleryIndex((current) => {
      if (current < n - 1) {
        return current + 1;
      }

      // Scroll forward onto the trailing clone; momentum end snaps to the first real page.
      requestAnimationFrame(() => {
        starredGalleryScrollRef.current?.scrollTo({ x: (n + 1) * w, animated: true });
      });
      return current;
    });
  }, [starredGalleryPageWidth]);

  const [insightContentByTab, setInsightContentByTab] = useState<Record<InsightTab, InsightContent>>(INSIGHTS_TAB_CONTENT);
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [healthKitLoading, setHealthKitLoading] = useState(false);
  const [healthKitLastError, setHealthKitLastError] = useState<string | null>(null);
  const [healthKitLastSyncedAtMs, setHealthKitLastSyncedAtMsState] = useState<number | null>(null);
  const healthKitConnectInFlightRef = useRef(false);
  const initHealthKitAsyncRef = useRef<() => Promise<void>>(async () => {});
  const appStateRef = useRef(AppState.currentState);
  const [metricGoals, setMetricGoals] = useState<MetricGoal[]>([]);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [showAlertsScreen, setShowAlertsScreen] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [eventNotificationsMuted, setEventNotificationsMutedState] = useState(false);
  const [locationCorrelationEnabled, setLocationCorrelationEnabled] = useState(false);
  const [locationToggleBusy, setLocationToggleBusy] = useState(false);
  const [startupPermissionsRequested, setStartupPermissionsRequested] = useState(false);
  const heartPulseAnim = useRef(new Animated.Value(0)).current;
  const alertBadgeBounceAnim = useRef(new Animated.Value(0)).current;
  const hasHealthScore = healthScore != null;
  const displayScore = hasHealthScore ? healthScore.toFixed(1) : '—';
  const scorePresentation = useMemo(
    () => (hasHealthScore ? getScorePresentation(Math.round(healthScore)) : null),
    [hasHealthScore, healthScore],
  );
  const metricNoDataColor = theme?.textMuted ?? '#64748b';
  const glucoseNow = Math.round(glucoseValue);
  const heartRateNow = Math.round(heartRateCardValue);
  const highAlertCandidates: Array<DemoHighAlert | null> = [
    glucoseNow >= 170
      ? { id: 'a1', title: 'Abnormal Glucose', detail: `Glucose measured at ${glucoseNow} mg/dL.`, severity: 'High' }
      : null,
    heartRateNow >= 95
      ? { id: 'a3', title: 'Abnormal Heart Rate', detail: `Resting heart rate at ${heartRateNow} bpm.`, severity: 'High' }
      : null,
  ];
  const alertItems = highAlertCandidates.filter(isDefined);
  const alertCount = alertItems.length;

  const appendAlertLog = useCallback((partial: Pick<AlertLogEvent, 'level' | 'source' | 'message'> & { id?: string }) => {
    setAlertEventLog((prev) => {
      const id = partial.id ?? `ae-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const row: AlertLogEvent = {
        id,
        at: new Date().toISOString(),
        level: partial.level,
        source: partial.source,
        message: partial.message,
      };
      return [row, ...prev].slice(0, 250);
    });
  }, []);

  const refreshPersistedGlucoseEvents = useCallback(async () => {
    const events = await loadHealthEvents();
    const glucoseRows = toAlertLogEvents(events);
    setAlertEventLog((prev) => {
      const nonGlucose = prev.filter((row) => row.source !== 'alert:glucose');
      return [...glucoseRows, ...nonGlucose]
        .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
        .slice(0, 250);
    });
  }, []);

  const toggleEventNotificationsMuted = useCallback(() => {
    setEventNotificationsMutedState((prev) => {
      const next = !prev;
      void setEventNotificationsMuted(next);
      return next;
    });
  }, []);

  const handleLocationCorrelationToggle = useCallback(async (next: boolean) => {
    if (locationToggleBusy) {
      return;
    }
    setLocationToggleBusy(true);
    try {
      if (next) {
        const result = await enableLocationCorrelation();
        if (!result.ok) {
          Alert.alert('Location access needed', result.reason ?? 'Could not enable location correlation.');
          setLocationCorrelationEnabled(false);
          return;
        }
        await refreshHealthEventMonitoring();
        setLocationCorrelationEnabled(true);
      } else {
        await disableLocationCorrelation(clearTrail);
        await stopHealthEventMonitoring();
        setLocationCorrelationEnabled(false);
      }
    } finally {
      setLocationToggleBusy(false);
    }
  }, [locationToggleBusy]);

  const prevHeartRateHighRef = useRef(false);

  useEffect(() => {
    const hHigh = heartRateNow >= 95;

    if (hHigh && !prevHeartRateHighRef.current) {
      appendAlertLog({
        level: 'warn',
        source: 'alert:heart-rate',
        message: `Abnormal Heart Rate: Resting heart rate at ${heartRateNow} bpm (threshold ≥95).`,
      });
    } else if (!hHigh && prevHeartRateHighRef.current) {
      appendAlertLog({
        level: 'info',
        source: 'alert:heart-rate',
        message: `Heart rate returned below high threshold (${heartRateNow} bpm).`,
      });
    }
    prevHeartRateHighRef.current = hHigh;
  }, [appendAlertLog, heartRateNow]);
  const openInsightFromDashboard = useCallback((tab: InsightTab) => {
    setInsightDetailReturnTab('Dashboard');
    setActiveTab('Insights');
    setActiveInsightTab(resolveInsightDetailTab(tab));
  }, []);

  const openQuickActionFromDashboard = useCallback(
    (action: DashboardQuickAction) => {
      if (isDashboardQuickActionMedications(action)) {
        setInsightDetailReturnTab('Dashboard');
        setActiveTab('Insights');
        setActiveInsightTab(null);
        setMedicationsOpenRequest((count) => count + 1);
        return;
      }
      openInsightFromDashboard(action);
    },
    [openInsightFromDashboard],
  );

  const openInsightFromInsightsHub = useCallback((tab: InsightTab) => {
    setInsightDetailReturnTab(null);
    setActiveInsightTab(resolveInsightDetailTab(tab));
  }, []);

  const handleInsightDetailBack = useCallback(() => {
    if (insightDetailReturnTab) {
      const returnTab = insightDetailReturnTab;
      setActiveInsightTab(null);
      setInsightDetailReturnTab(null);
      setActiveTab(returnTab);
      return;
    }
    setActiveInsightTab(null);
  }, [insightDetailReturnTab]);

  const handleMedicationsDetailBack = useCallback(() => {
    if (insightDetailReturnTab) {
      const returnTab = insightDetailReturnTab;
      setInsightDetailReturnTab(null);
      setActiveTab(returnTab);
    }
  }, [insightDetailReturnTab]);

  const handleMainNavPress = useCallback(
    (label: NavItemLabel) => {
      if (label === 'Insights') {
        setActiveInsightTab(null);
        setInsightDetailReturnTab(null);
      } else {
        setActiveInsightTab(null);
        setInsightDetailReturnTab(null);
      }
      setActiveTab(label);
    },
    [],
  );

  const sleepNightHours = activitySleepMinutes != null ? activitySleepMinutes / 60 : null;

  const dashboardMetrics = [
    {
      label: 'GLUCOSE' as const,
      insightTab: DASHBOARD_METRIC_INSIGHT_TAB.GLUCOSE,
      value:
        glucoseValue > 0
          ? `${Math.round(glucoseValue)}${glucoseTrendArrow ? ` ${glucoseTrendArrow}` : ''}`
          : '—',
      unit: 'MG/DL',
    },
    {
      label: 'SLEEP' as const,
      insightTab: DASHBOARD_METRIC_INSIGHT_TAB.SLEEP,
      value: sleepNightHours != null ? sleepNightHours.toFixed(1) : '—',
      unit: 'HRS',
    },
    {
      label: 'HEART RATE' as const,
      insightTab: DASHBOARD_METRIC_INSIGHT_TAB['HEART RATE'],
      value: heartRateCardValue > 0 ? Math.round(heartRateCardValue).toString() : '—',
      unit: 'BPM',
    },
  ];

  const centerX = 160;
  const centerY = 174;
  const startDeg = 205;
  const endDeg = -25;
  const startAngle = (startDeg * Math.PI) / 180;
  const endAngle = (endDeg * Math.PI) / 180;
  const angleForPct = (pct: number) => startAngle - (pct / 100) * (startAngle - endAngle);
  const pointOnArc = (radius: number, pct: number) => {
    const a = angleForPct(pct);
    return { x: centerX + Math.cos(a) * radius, y: centerY - Math.sin(a) * radius };
  };
  const arcPath = (radius: number, startPct: number, endPct: number, largeArc = 0) => {
    const p1 = pointOnArc(radius, startPct);
    const p2 = pointOnArc(radius, endPct);
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
  };

  const needleRadians = angleForPct(healthScore ?? 0);
  const tipRadius = 96;
  const tipX = centerX + Math.cos(needleRadians) * tipRadius;
  const tipY = centerY - Math.sin(needleRadians) * tipRadius;
  const arrowLength = 10;
  const arrowHalfWidth = 4;
  const dirX = Math.cos(needleRadians);
  const dirY = -Math.sin(needleRadians);
  const baseCenterX = tipX - dirX * arrowLength;
  const baseCenterY = tipY - dirY * arrowLength;
  const perpX = -dirY;
  const perpY = dirX;
  const leftX = baseCenterX + perpX * arrowHalfWidth;
  const leftY = baseCenterY + perpY * arrowHalfWidth;
  const rightX = baseCenterX - perpX * arrowHalfWidth;
  const rightY = baseCenterY - perpY * arrowHalfWidth;

  const applyDashboardQuickMetrics = useCallback(
    (metrics: DashboardQuickAction[] | ((prev: DashboardQuickAction[]) => DashboardQuickAction[])) => {
      setDashboardQuickMetrics((prev) => {
        const next = normalizeDashboardQuickActions(typeof metrics === 'function' ? metrics(prev) : metrics);
        void saveDashboardQuickMetrics(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    void loadDashboardQuickMetrics().then((stored) => {
      if (stored) {
        setDashboardQuickMetrics(stored);
      }
    });
    void loadActiveGoals().then(setMetricGoals);
  }, []);

  const selectedInsightContent = activeInsightTab ? insightContentByTab[activeInsightTab] : null;
  const healthKitReady = healthKitStatus === 'ready';

  const visibleGoals = useMemo(
    () =>
      metricGoals.filter((goal) =>
        isGoalMetricAvailable(goal.metric, insightContentByTab[goal.metric], healthKitReady),
      ),
    [metricGoals, insightContentByTab, healthKitReady],
  );

  useEffect(() => {
    const unavailableGoals = metricGoals.filter(
      (goal) => !isGoalMetricAvailable(goal.metric, insightContentByTab[goal.metric], healthKitReady),
    );
    if (unavailableGoals.length === 0) {
      return;
    }
    void Promise.all(unavailableGoals.map((goal) => softDeleteGoal(goal.id))).then(() => {
      setMetricGoals((prev) => prev.filter((goal) => !unavailableGoals.some((unavailable) => unavailable.id === goal.id)));
    });
  }, [metricGoals, insightContentByTab, healthKitReady]);

  const handleCreateGoal = useCallback(async (input: Parameters<typeof createGoal>[0]) => {
    if (!isGoalMetricAvailable(input.metric, insightContentByTab[input.metric], healthKitReady)) {
      Alert.alert('Metric unavailable', 'This metric has no Apple Health data yet. Choose a metric that is active in Insights.');
      return;
    }
    const goal = await createGoal(input);
    setMetricGoals((prev) => [goal, ...prev]);
  }, [healthKitReady, insightContentByTab]);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    await softDeleteGoal(goalId);
    setMetricGoals((prev) => prev.filter((goal) => goal.id !== goalId));
  }, []);

  const initHealthKitAsync = async () => {
    if (healthKitLoading) {
      return;
    }
    setHealthKitLoading(true);
    setHealthKitLastError(null);
    try {
      if (Platform.OS !== 'ios') {
        setHealthKitStatus('unsupported');
        setHealthKitLastError('HealthKit is only available on iOS devices.');
        return;
      }
      if (!healthKit.initHealthKit || !healthKit.Constants?.Permissions) {
        setHealthKitStatus('unsupported');
        setHealthKitLastError('Native HealthKit module unavailable in current build.');
        return;
      }

      const readPermissions = healthKit.Constants.Permissions as Record<string, string>;
      const read = buildInsightsHealthKitReadPermissions(readPermissions);
      if (read.length === 0) {
        setHealthKitStatus('unsupported');
        setHealthKitLastError('Could not resolve HealthKit read types for Insights.');
        return;
      }
      const permissions = {
        permissions: {
          read,
          write: [],
        },
      };

      /** Authorization dialog + `initHealthKit` only on first connect — not on every trend-window change. */
      const alreadyAuthorized = healthKitStatus === 'ready';
      if (!alreadyAuthorized) {
        let initErrorMessage: unknown = null;
        const initialized = await new Promise<boolean>((resolve) => {
          try {
            healthKit.initHealthKit?.(permissions, (error?: unknown) => {
              initErrorMessage = error ?? null;
              resolve(!error);
            });
          } catch (e) {
            initErrorMessage = e;
            resolve(false);
          }
        });

        if (!initialized) {
          const readableError = toErrorText(initErrorMessage ?? 'HealthKit authorization failed.');
          await setHealthKitLinked(false);
          setHealthKitStatus('denied');
          setHealthKitLastError(readableError);
          Alert.alert('Apple Health connection failed', readableError);
          return;
        }
        await setHealthKitLinked(true);
      }

      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(dayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const formatTrend = (current: number, previous: number, suffix: string) => {
        if (current <= 0 && previous <= 0) {
          return 'Trend: collecting baseline data';
        }
        if (previous <= 0) {
          return `Trend: +${current.toFixed(1)}${suffix} vs baseline`;
        }
        const deltaPct = ((current - previous) / previous) * 100;
        const sign = deltaPct >= 0 ? '+' : '';
        return `Trend: ${sign}${deltaPct.toFixed(1)}% vs previous period`;
      };
      const getLastNDaysFrom = (anchor: Date, n: number) =>
        Array.from({ length: n }, (_, index) => {
          const d = new Date(anchor);
          d.setHours(0, 0, 0, 0);
          d.setDate(anchor.getDate() - (n - 1 - index));
          return d;
        });
      const dayLabelShort = (value: Date) => value.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

      const bucketDates = getLastNDaysFrom(dayStart, 7);
      const bucketLabels = bucketDates.map(dayLabelShort);
      const extendedSampleStart = new Date(bucketDates[0]);
      extendedSampleStart.setDate(extendedSampleStart.getDate() - 14);

      const toDayKey = toLocalDayKey;
      const todayBucketIndex = bucketDates.length - 1;
      const zeroSeries = () => new Array(bucketDates.length).fill(0);
      const latest = (series: number[]) => series[series.length - 1] ?? 0;
      const previous = (series: number[]) => series[series.length - 2] ?? 0;
      const loadSeriesFromSamples = async (
        getter: ((options: unknown, callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void) => void) | undefined,
        options: Record<string, unknown>,
        mode: 'sum' | 'avg' = 'sum',
        valueMapper?: (value: number) => number,
      ) => {
        if (!getter) {
          return zeroSeries();
        }
        return new Promise<number[]>((resolve) => {
          getter(options, (_error, result) => {
            const samples = result ?? [];
            const byDay = new Map<string, { sum: number; count: number }>();
            samples.forEach((sample) => {
              const raw = sample.value ?? 0;
              const mapped = valueMapper ? valueMapper(raw) : raw;
              if (!Number.isFinite(mapped)) {
                return;
              }
              const ts = sample.startDate
                ? new Date(sample.startDate).getTime()
                : sample.endDate
                  ? new Date(sample.endDate).getTime()
                  : 0;
              if (!ts || ts < bucketDates[0].getTime()) {
                return;
              }
              const key = toDayKey(new Date(ts));
              const prevVal = byDay.get(key) ?? { sum: 0, count: 0 };
              prevVal.sum += mapped;
              prevVal.count += 1;
              byDay.set(key, prevVal);
            });
            const series = bucketDates.map((d) => {
              const day = byDay.get(toDayKey(d));
              if (!day || day.count === 0) {
                return 0;
              }
              const value = mode === 'avg' ? day.sum / day.count : day.sum;
              return Number(value.toFixed(1));
            });
            resolve(series);
          });
        });
      };

      let heartRateValue = 0;
      let heartRateLatestAtMs = 0;
      let heartRateTodayLatest = 0;
      let heartRatePrevious = 0;
      let stepCountValue = 0;
      let stepCountPrevious = 0;
      let sleepHours = 0;
      let sleepHoursPrevious = 0;
      let activeEnergyKcal = 0;
      let activeEnergyPrevious = 0;
      let workoutCountToday = 0;
      let workoutMinutesToday = 0;
      const bucketLen = bucketDates.length;
      let heartRateTrendPoints = new Array(bucketLen).fill(0);
      let heartRateChartData: InsightHeartRateChartData = buildHeartRateChartData([], now);
      let sleepTotalChartData: InsightSleepChartData = buildSleepChartData([], now, 'total');
      let deepSleepChartData: InsightSleepChartData = buildSleepChartData([], now, 'deep');
      let remSleepChartData: InsightSleepChartData = buildSleepChartData([], now, 'rem');
      let coreSleepChartData: InsightSleepChartData = buildSleepChartData([], now, 'core');
      let restingHeartRateChartData: InsightHeartRateChartData = buildHeartRateChartData([], now);
      let stepTrendPoints = new Array(bucketLen).fill(0);
      let sleepTrendPoints = new Array(bucketLen).fill(0);
      let sleepRecordedTrendPoints = new Array(bucketLen).fill(false);
      let deepSleepTrendPoints = new Array(bucketLen).fill(0);
      let remSleepTrendPoints = new Array(bucketLen).fill(0);
      let coreSleepTrendPoints = new Array(bucketLen).fill(0);
      let activeEnergyTrendPoints = new Array(bucketLen).fill(0);
      let workoutTrendPoints = new Array(bucketLen).fill(0);
      let restingHeartRateTrendPoints: number[];
      let hrvTrendPoints: number[];
      let walkingHeartRateTrendPoints: number[];
      let respiratoryTrendPoints: number[];
      let bloodOxygenTrendPoints: number[];
      let distanceTrendPoints: number[];
      let flightsTrendPoints: number[];
      let basalEnergyTrendPoints: number[];
      let exerciseTimeTrendPoints: number[];
      let standTimeTrendPoints: number[];
      let bodyTemperatureTrendPoints: number[];
      let vo2MaxTrendPoints: number[];

      if (healthKit.getHeartRateSamples) {
        const heartRateFetchStart = new Date(dayStart);
        heartRateFetchStart.setFullYear(heartRateFetchStart.getFullYear() - 1);
        await new Promise<void>((resolve) => {
          healthKit.getHeartRateSamples?.(
            {
              startDate: heartRateFetchStart.toISOString(),
              endDate: now.toISOString(),
              ascending: true,
            },
            (_error, result) => {
              const samples = result ?? [];
              const previousSamples = samples.filter((sample) => {
                const ts = healthKitSampleAtMs(sample);
                return ts >= yesterdayStart.getTime() && ts < dayStart.getTime();
              });
              const vals = previousSamples.map((s) => s.value ?? 0).filter((v) => v > 0);
              if (vals.length > 0) {
                heartRatePrevious = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              }

              const hrSamples: Array<{ value: number; atMs: number }> = [];
              const todayStartTs = dayStart.getTime();
              let heartRateLatestTs = 0;

              samples.forEach((sample) => {
                const ts = healthKitSampleAtMs(sample);
                const sampleValue = sample.value ?? 0;
                if (!ts || !(sampleValue > 0)) {
                  return;
                }
                if (ts >= heartRateLatestTs) {
                  heartRateLatestTs = ts;
                  heartRateValue = Math.round(sampleValue);
                  heartRateLatestAtMs = ts;
                  if (ts >= todayStartTs) {
                    heartRateTodayLatest = Math.round(sampleValue);
                  }
                }
                hrSamples.push({ value: sampleValue, atMs: ts });
              });

              heartRateChartData = buildHeartRateChartData(hrSamples, now);
              heartRateTrendPoints = bucketDates.map((d) => {
                const dayBucket = heartRateChartData.days.find((bucket) => bucket.dayStartMs === d.getTime());
                return dayBucket && dayBucket.max > 0 ? dayBucket.avg : 0;
              });
              resolve();
            },
          );
        });
      }
      if (healthKit.getRestingHeartRateSamples) {
        const restingHeartRateFetchStart = new Date(dayStart);
        restingHeartRateFetchStart.setFullYear(restingHeartRateFetchStart.getFullYear() - 1);
        await new Promise<void>((resolve) => {
          healthKit.getRestingHeartRateSamples?.(
            {
              startDate: restingHeartRateFetchStart.toISOString(),
              endDate: now.toISOString(),
              ascending: true,
            },
            (_error, result) => {
              const rhrSamples: Array<{ value: number; atMs: number }> = [];
              (result ?? []).forEach((sample) => {
                const ts = healthKitSampleAtMs(sample);
                const sampleValue = sample.value ?? 0;
                if (!ts || !(sampleValue > 0)) {
                  return;
                }
                rhrSamples.push({ value: sampleValue, atMs: ts });
              });
              restingHeartRateChartData = buildHeartRateChartData(rhrSamples, now);
              resolve();
            },
          );
        });
      }
      if (healthKit.getStepCount) {
        const stepResults = await Promise.all(
          bucketDates.map(
            (date) =>
              new Promise<number>((resolve) => {
                const rangeStart = new Date(date);
                const rangeEnd = new Date(date);
                rangeEnd.setDate(rangeEnd.getDate() + 1);
                const isToday = toDayKey(date) === toDayKey(dayStart);
                healthKit.getStepCount?.(
                  {
                    date: date.toISOString(),
                    startDate: rangeStart.toISOString(),
                    endDate: isToday ? now.toISOString() : rangeEnd.toISOString(),
                  },
                  (_error, result) => {
                    resolve(Math.round(result?.value ?? 0));
                  },
                );
              }),
          ),
        );
        stepTrendPoints = stepResults;
        stepCountValue = stepResults[stepResults.length - 1] ?? 0;
        stepCountPrevious = stepResults[stepResults.length - 2] ?? 0;
      }
      if (healthKit.getSleepSamples) {
        const sleepChartFetchStart = new Date(dayStart);
        sleepChartFetchStart.setFullYear(sleepChartFetchStart.getFullYear() - 1);
        await new Promise<void>((resolve) => {
          healthKit.getSleepSamples?.(
            {
              startDate: sleepChartFetchStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const sleepSegments: SleepSegmentInput[] = [];
              const sleepByDay = new Map<string, number>();
              const sleepRecordedByDay = new Map<string, boolean>();
              samples.forEach((sample) => {
                const endMs = sample.endDate ? new Date(sample.endDate).getTime() : 0;
                if (endMs) {
                  sleepRecordedByDay.set(toDayKey(new Date(endMs)), true);
                }
                const minutes = sleepSampleMinutes(sample);
                if (minutes <= 0) {
                  return;
                }
                const startMs = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!startMs || !endMs) {
                  return;
                }
                sleepSegments.push({
                  startMs,
                  endMs,
                  stage: sample.value ?? '',
                });
                const key = toDayKey(new Date(endMs));
                sleepByDay.set(key, (sleepByDay.get(key) ?? 0) + minutes);
              });
              sleepTrendPoints = bucketDates.map((d) => Number(((sleepByDay.get(toDayKey(d)) ?? 0) / 60).toFixed(1)));
              sleepRecordedTrendPoints = bucketDates.map((d) => sleepRecordedByDay.has(toDayKey(d)));
              deepSleepTrendPoints = buildSleepStageTrendPoints(samples, bucketDates, 'DEEP', toDayKey);
              remSleepTrendPoints = buildSleepStageTrendPoints(samples, bucketDates, 'REM', toDayKey);
              coreSleepTrendPoints = buildSleepStageTrendPoints(samples, bucketDates, 'CORE', toDayKey);

              sleepTotalChartData = buildSleepChartData(sleepSegments, now, 'total');
              deepSleepChartData = buildSleepChartData(sleepSegments, now, 'deep');
              remSleepChartData = buildSleepChartData(sleepSegments, now, 'rem');
              coreSleepChartData = buildSleepChartData(sleepSegments, now, 'core');

              const midpoint = new Date(dayStart);
              midpoint.setDate(midpoint.getDate() - 7);
              const currentMinutes = samples.reduce((acc, sample) => {
                const minutes = sleepSampleMinutes(sample);
                if (minutes <= 0) {
                  return acc;
                }
                const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
                if (end < midpoint.getTime()) {
                  return acc;
                }
                return acc + minutes;
              }, 0);
              const totalMinutes = samples.reduce((acc, sample) => acc + sleepSampleMinutes(sample), 0);
              const previousMinutes = totalMinutes - currentMinutes;

              sleepHours = Number((currentMinutes / 60 / 7).toFixed(1));
              sleepHoursPrevious = Number((previousMinutes / 60 / 7).toFixed(1));

              const yesterdayForSleep = new Date(dayStart);
              yesterdayForSleep.setDate(yesterdayForSleep.getDate() - 1);
              const todayKey = toDayKey(now);
              const yesterdayKey = toDayKey(yesterdayForSleep);
              const recentNightRecorded = sleepRecordedByDay.has(todayKey) || sleepRecordedByDay.has(yesterdayKey);
              const recentNightMinutes = Math.max(
                sleepByDay.get(todayKey) ?? 0,
                sleepByDay.get(yesterdayKey) ?? 0,
              );
              if (recentNightRecorded) {
                setActivitySleepMinutes(Math.round(Math.min(recentNightMinutes, 9 * 60 + 59)));
              } else {
                setActivitySleepMinutes(null);
              }
              resolve();
            },
          );
        });
      }
      if (healthKit.getActiveEnergyBurned) {
        await new Promise<void>((resolve) => {
          healthKit.getActiveEnergyBurned?.(
            {
              unit: healthKit.Constants?.Units?.kcal ?? 'kcal',
              startDate: yesterdayStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const byDay = new Map<string, number>();
              samples.forEach((sample) => {
                const dt = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!dt) {
                  return;
                }
                const key = toDayKey(new Date(dt));
                byDay.set(key, (byDay.get(key) ?? 0) + (sample.value ?? 0));
              });
              activeEnergyTrendPoints = bucketDates.map((d) => Math.round(byDay.get(toDayKey(d)) ?? 0));
              const split = dayStart.getTime();
              activeEnergyKcal = Math.round(
                samples
                  .filter((sample) => {
                    const dt = sample.startDate ? new Date(sample.startDate).getTime() : split;
                    return dt >= split;
                  })
                  .reduce((acc, sample) => acc + (sample.value ?? 0), 0),
              );
              activeEnergyPrevious = Math.round(
                samples
                  .filter((sample) => {
                    const dt = sample.startDate ? new Date(sample.startDate).getTime() : split - 1;
                    return dt < split;
                  })
                  .reduce((acc, sample) => acc + (sample.value ?? 0), 0),
              );
              resolve();
            },
          );
        });
      }
      if (healthKit.getAnchoredWorkouts) {
        await new Promise<void>((resolve) => {
          healthKit.getAnchoredWorkouts?.(
            {
              startDate: bucketDates[0].toISOString(),
              endDate: now.toISOString(),
              type: 'Workout',
            },
            (_error, results) => {
              const workouts = (results?.data ?? []).filter((workout: HealthKitWorkoutSample) => workout.tracked !== false);
              const byDay = new Map<string, number>();
              workouts.forEach((workout) => {
                const startTs = workout.start ? new Date(workout.start).getTime() : 0;
                if (!startTs) {
                  return;
                }
                const dayKey = toDayKey(new Date(startTs));
                byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + 1);
                if (dayKey === toDayKey(dayStart)) {
                  workoutCountToday += 1;
                  workoutMinutesToday += (workout.duration ?? 0) / 60;
                }
              });
              workoutTrendPoints = bucketDates.map((d) => byDay.get(toDayKey(d)) ?? 0);
              resolve();
            },
          );
        });
      }

      const loadRawSamples = async (
        getter:
          | ((
              options: unknown,
              callback: (error?: string, result?: Array<{ value?: number; startDate?: string; endDate?: string }>) => void,
            ) => void)
          | undefined,
        options: Record<string, unknown>,
      ) => {
        if (!getter) {
          return [] as Array<{ value?: number; startDate?: string; endDate?: string }>;
        }
        return new Promise<Array<{ value?: number; startDate?: string; endDate?: string }>>((resolve) => {
          getter(options, (_error, result) => {
            resolve(result ?? []);
          });
        });
      };

      const baseRange = {
        startDate: bucketDates[0].toISOString(),
        endDate: now.toISOString(),
      };

      [
        restingHeartRateTrendPoints,
        hrvTrendPoints,
        walkingHeartRateTrendPoints,
        respiratoryTrendPoints,
        bloodOxygenTrendPoints,
        distanceTrendPoints,
        flightsTrendPoints,
        basalEnergyTrendPoints,
        exerciseTimeTrendPoints,
        standTimeTrendPoints,
        bodyTemperatureTrendPoints,
        vo2MaxTrendPoints,
      ] = await Promise.all([
        loadSeriesFromSamples(healthKit.getRestingHeartRateSamples, baseRange, 'avg'),
        loadSeriesFromSamples(healthKit.getHeartRateVariabilitySamples, baseRange, 'avg'),
        loadSeriesFromSamples(
          healthKit.getWalkingHeartRateAverage,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.bpm ?? 'bpm',
          },
          'avg',
        ),
        loadSeriesFromSamples(healthKit.getRespiratoryRateSamples, baseRange, 'avg'),
        loadSeriesFromSamples(
          healthKit.getOxygenSaturationSamples,
          baseRange,
          'avg',
          (v) => (v <= 1 ? v * 100 : v),
        ),
        loadSeriesFromSamples(
          healthKit.getDailyDistanceWalkingRunningSamples,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.mile ?? 'mile',
          },
          'sum',
        ),
        loadSeriesFromSamples(healthKit.getDailyFlightsClimbedSamples, baseRange, 'sum'),
        loadSeriesFromSamples(
          healthKit.getBasalEnergyBurned,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.kcal ?? 'kcal',
          },
          'sum',
        ),
        loadSeriesFromSamples(
          healthKit.getAppleExerciseTime,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.minute ?? 'minute',
          },
          'sum',
        ),
        loadSeriesFromSamples(
          healthKit.getAppleStandTime,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.minute ?? 'minute',
          },
          'sum',
        ),
        loadSeriesFromSamples(
          healthKit.getBodyTemperatureSamples,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.fahrenheit ?? 'fahrenheit',
          },
          'avg',
        ),
        loadSeriesFromSamples(healthKit.getVo2MaxSamples, baseRange, 'avg'),
      ]);

      const [glucoseResult, restingHrSamplesRaw] = await Promise.all([
        loadGlucoseData({ bucketDates, now, toDayKey, healthKit }),
        loadRawSamples(healthKit.getRestingHeartRateSamples, baseRange),
      ]);
      const bloodGlucoseTrendPoints = glucoseResult.trendPoints;
      const glucoseChartData = buildHeartRateChartData(
        glucoseResult.rawReadings
          .filter((reading) => reading.value > 0)
          .map((reading) => ({ value: reading.value, atMs: reading.startMs })),
        now,
      );

      const insightDayLabels = formatInsightDayLabels(bucketDates);
      const lastSleepNight = resolveLastRecordedSleepNight(
        sleepTrendPoints,
        deepSleepTrendPoints,
        remSleepTrendPoints,
        coreSleepTrendPoints,
        insightDayLabels,
        sleepRecordedTrendPoints,
      );
      const priorSleepNightDeep =
        lastSleepNight && lastSleepNight.index > 0 ? deepSleepTrendPoints[lastSleepNight.index - 1] ?? 0 : 0;
      const priorSleepNightRem =
        lastSleepNight && lastSleepNight.index > 0 ? remSleepTrendPoints[lastSleepNight.index - 1] ?? 0 : 0;
      const priorSleepNightCore =
        lastSleepNight && lastSleepNight.index > 0 ? coreSleepTrendPoints[lastSleepNight.index - 1] ?? 0 : 0;

      const todayRestingHr = latest(restingHeartRateTrendPoints);
      const todayHrv = latest(hrvTrendPoints);
      const todayWalkingHr = latest(walkingHeartRateTrendPoints);
      const todayRespiratory = latest(respiratoryTrendPoints);
      const todayBloodOxygen = latest(bloodOxygenTrendPoints);
      const todayDistance = latest(distanceTrendPoints);
      const todayFlights = latest(flightsTrendPoints);
      const todayBasalEnergy = latest(basalEnergyTrendPoints);
      const todayExercise = latest(exerciseTimeTrendPoints);
      const todayStand = latest(standTimeTrendPoints);
      const todayWorkouts = latest(workoutTrendPoints);
      const todayBodyTemp = latest(bodyTemperatureTrendPoints);
      const todayVo2 = latest(vo2MaxTrendPoints);
      const todayGlucoseAvg = latest(bloodGlucoseTrendPoints);
      const lastBodyTempDay = resolveLastRecordedTrendDay(bodyTemperatureTrendPoints, insightDayLabels);
      const lastVo2Day = resolveLastRecordedTrendDay(vo2MaxTrendPoints, insightDayLabels);
      const bodyTempHubValue = todayBodyTemp > 0 ? todayBodyTemp : lastBodyTempDay?.value ?? 0;
      const vo2HubValue = todayVo2 > 0 ? todayVo2 : lastVo2Day?.value ?? 0;
      const glucoseHubValue =
        glucoseResult.currentValue > 0 ? glucoseResult.currentValue : todayGlucoseAvg;

      setInsightContentByTab({
        'Heart Rate': {
          title: 'Latest Heart Rate',
          summary: heartRateValue > 0 ? `${heartRateValue} bpm latest reading` : 'No heart rate sample found today.',
          trend: formatTrend(heartRateValue, heartRatePrevious, ' bpm'),
          recommendation: 'Track heart rate daily for stronger baseline trends.',
          trendPoints: heartRateTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'bpm',
          hubValue: heartRateValue,
          freshness: heartRateLatestAtMs > 0 ? { kind: 'point-in-time', atMs: heartRateLatestAtMs } : undefined,
          heartRateChart: heartRateChartData,
        },
        'Resting Heart Rate': {
          title: 'Resting Heart Rate',
          summary:
            todayRestingHr > 0
              ? `${todayRestingHr} bpm today avg`
              : 'No resting heart-rate samples today.',
          trend: formatTrend(todayRestingHr, previous(restingHeartRateTrendPoints), ' bpm'),
          recommendation: 'A lower, stable resting heart rate often reflects good recovery.',
          trendPoints: restingHeartRateTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'bpm',
          hubValue: todayRestingHr,
          freshness: todayRestingHr > 0 ? { kind: 'today-avg' } : undefined,
          heartRateChart: restingHeartRateChartData,
        },
        'Heart Rate Variability': {
          title: 'Heart Rate Variability',
          summary: todayHrv > 0 ? `${todayHrv} ms today avg` : 'No HRV samples today.',
          trend: formatTrend(todayHrv, previous(hrvTrendPoints), ' ms'),
          recommendation: 'Consistent sleep and recovery habits can improve HRV over time.',
          trendPoints: hrvTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'ms',
          hubValue: todayHrv,
          freshness: todayHrv > 0 ? { kind: 'today-avg' } : undefined,
        },
        'Walking Heart Rate': {
          title: 'Walking Heart Rate',
          summary:
            todayWalkingHr > 0
              ? `${todayWalkingHr} bpm today avg`
              : 'No walking heart-rate samples today.',
          trend: formatTrend(todayWalkingHr, previous(walkingHeartRateTrendPoints), ' bpm'),
          recommendation: 'Walking heart rate reflects cardio load during daily movement.',
          trendPoints: walkingHeartRateTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'bpm',
          hubValue: todayWalkingHr,
          freshness: todayWalkingHr > 0 ? { kind: 'today-avg' } : undefined,
        },
        'Respiratory Rate': {
          title: 'Respiratory Rate',
          summary:
            todayRespiratory > 0
              ? `${todayRespiratory} breaths/min today avg`
              : 'No respiratory-rate samples today.',
          trend: formatTrend(todayRespiratory, previous(respiratoryTrendPoints), ' br/min'),
          recommendation: 'Watch for sustained shifts and pair with recovery signals.',
          trendPoints: respiratoryTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'br/min',
          hubValue: todayRespiratory,
          freshness: todayRespiratory > 0 ? { kind: 'today-avg' } : undefined,
        },
        'Blood Oxygen': {
          title: 'Blood Oxygen',
          summary: todayBloodOxygen > 0 ? `${todayBloodOxygen}% today avg` : 'No blood-oxygen samples today.',
          trend: formatTrend(todayBloodOxygen, previous(bloodOxygenTrendPoints), '%'),
          recommendation: 'Regular sleep and cardio activity can support oxygen efficiency.',
          trendPoints: bloodOxygenTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: '%',
          hubValue: todayBloodOxygen,
          freshness: todayBloodOxygen > 0 ? { kind: 'today-avg' } : undefined,
        },
        Steps: {
          title: 'Today Steps',
          summary: `${stepCountValue.toLocaleString()} steps today`,
          trend: formatTrend(stepCountValue, stepCountPrevious, ' steps'),
          recommendation: 'Aim for short walking breaks to increase daily steps.',
          trendPoints: stepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'steps',
          hubValue: stepCountValue,
          freshness: stepCountValue > 0 ? { kind: 'today-total' } : undefined,
        },
        'Walking + Running Distance': {
          title: insightTabLabel('Walking + Running Distance'),
          summary: `${todayDistance.toFixed(2)} mi today`,
          trend: formatTrend(todayDistance, previous(distanceTrendPoints), ' mi'),
          recommendation: 'Steady distance growth usually follows small daily consistency.',
          trendPoints: distanceTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'mi',
          hubValue: todayDistance,
          freshness: todayDistance > 0 ? { kind: 'today-total' } : undefined,
        },
        'Flights Climbed': {
          title: 'Flights Climbed',
          summary: `${todayFlights.toFixed(0)} floors climbed today`,
          trend: formatTrend(todayFlights, previous(flightsTrendPoints), ' floors'),
          recommendation: 'Short stair sessions are an easy way to increase intensity.',
          trendPoints: flightsTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'floors',
          hubValue: todayFlights,
          freshness: todayFlights > 0 ? { kind: 'today-total' } : undefined,
        },
        Sleep: {
          title: 'Sleep Duration',
          summary: lastSleepNight
            ? `${formatSleepTrendHours(lastSleepNight.totalHours)} h total · last night · ${lastSleepNight.wakeDayLabel}`
            : 'No sleep samples found for the selected period.',
          trend: formatTrend(sleepHours, sleepHoursPrevious, 'h'),
          recommendation: 'Maintain consistent wind-down to improve sleep duration.',
          trendPoints: sleepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'h',
          hubValue: lastSleepNight?.totalHours,
          freshness: lastSleepNight
            ? { kind: 'last-night', wakeDayLabel: lastSleepNight.wakeDayLabel }
            : undefined,
          sleepChart: sleepTotalChartData,
        },
        'Deep Sleep': {
          title: 'Deep Sleep',
          summary: lastSleepNight
            ? `${formatSleepTrendHours(lastSleepNight.deepHours)} h deep · last night · ${lastSleepNight.wakeDayLabel}`
            : 'No deep sleep stage data found.',
          trend: formatTrend(lastSleepNight?.deepHours ?? 0, priorSleepNightDeep, 'h'),
          recommendation: 'Deep sleep supports physical recovery and restoration.',
          trendPoints: deepSleepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'h',
          hubValue: lastSleepNight?.deepHours,
          freshness: lastSleepNight
            ? { kind: 'last-night', wakeDayLabel: lastSleepNight.wakeDayLabel }
            : undefined,
          sleepChart: deepSleepChartData,
        },
        'REM Sleep': {
          title: 'REM Sleep',
          summary: lastSleepNight
            ? `${formatSleepTrendHours(lastSleepNight.remHours)} h REM · last night · ${lastSleepNight.wakeDayLabel}`
            : 'No REM sleep stage data found.',
          trend: formatTrend(lastSleepNight?.remHours ?? 0, priorSleepNightRem, 'h'),
          recommendation: 'REM sleep is linked to memory and cognitive recovery.',
          trendPoints: remSleepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'h',
          hubValue: lastSleepNight?.remHours,
          freshness: lastSleepNight
            ? { kind: 'last-night', wakeDayLabel: lastSleepNight.wakeDayLabel }
            : undefined,
          sleepChart: remSleepChartData,
        },
        'Core Sleep': {
          title: 'Core Sleep',
          summary: lastSleepNight
            ? `${formatSleepTrendHours(lastSleepNight.coreHours)} h core · last night · ${lastSleepNight.wakeDayLabel}`
            : 'No core sleep stage data found.',
          trend: formatTrend(lastSleepNight?.coreHours ?? 0, priorSleepNightCore, 'h'),
          recommendation: 'Core sleep makes up much of total sleep on Apple Watch.',
          trendPoints: coreSleepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'h',
          hubValue: lastSleepNight?.coreHours,
          freshness: lastSleepNight
            ? { kind: 'last-night', wakeDayLabel: lastSleepNight.wakeDayLabel }
            : undefined,
          sleepChart: coreSleepChartData,
        },
        'Active Energy': {
          title: 'Active Energy',
          summary: `${activeEnergyKcal} kcal burned today`,
          trend: formatTrend(activeEnergyKcal, activeEnergyPrevious, ' kcal'),
          recommendation: 'Add brief activity intervals to increase active energy burn.',
          trendPoints: activeEnergyTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'kcal',
          hubValue: activeEnergyKcal,
          freshness: activeEnergyKcal > 0 ? { kind: 'today-total' } : undefined,
        },
        'Resting Energy': {
          title: 'Resting Energy',
          summary:
            todayBasalEnergy > 0
              ? `${todayBasalEnergy.toFixed(0)} kcal today`
              : 'No resting energy samples today.',
          trend: formatTrend(todayBasalEnergy, previous(basalEnergyTrendPoints), ' kcal'),
          recommendation: 'Resting energy reflects foundational metabolism and body needs.',
          trendPoints: basalEnergyTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'kcal',
          hubValue: todayBasalEnergy,
          freshness: todayBasalEnergy > 0 ? { kind: 'today-total' } : undefined,
        },
        'Exercise Minutes': {
          title: 'Exercise Minutes',
          summary: `${todayExercise.toFixed(0)} exercise minutes today`,
          trend: formatTrend(todayExercise, previous(exerciseTimeTrendPoints), ' min'),
          recommendation: 'Short exercise blocks compound well over a week.',
          trendPoints: exerciseTimeTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'min',
          hubValue: todayExercise,
          freshness: todayExercise > 0 ? { kind: 'today-total' } : undefined,
        },
        'Stand Minutes': {
          title: 'Stand Minutes',
          summary: `${todayStand.toFixed(0)} stand minutes today`,
          trend: formatTrend(todayStand, previous(standTimeTrendPoints), ' min'),
          recommendation: 'Break up sitting every hour to improve stand trends.',
          trendPoints: standTimeTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'min',
          hubValue: todayStand,
          freshness: todayStand > 0 ? { kind: 'today-total' } : undefined,
        },
        Workouts: {
          title: 'Workouts',
          summary:
            workoutCountToday > 0
              ? `${workoutCountToday} workout${workoutCountToday === 1 ? '' : 's'} today (${Math.round(workoutMinutesToday)} min)`
              : 'No workouts recorded today.',
          trend: formatTrend(todayWorkouts, previous(workoutTrendPoints), ' sessions'),
          recommendation: 'Auto-detected and Watch workouts appear here from Apple Health.',
          trendPoints: workoutTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'sessions',
          hubValue: workoutCountToday,
          freshness: workoutCountToday > 0 ? { kind: 'today-total' } : undefined,
        },
        'Body Temperature': {
          title: 'Body Temperature',
          summary:
            todayBodyTemp > 0
              ? `${todayBodyTemp} degF today avg`
              : lastBodyTempDay
                ? `${lastBodyTempDay.value} degF · ${lastBodyTempDay.dayLabel}`
                : 'No body-temperature samples found.',
          trend: formatTrend(
            todayBodyTemp > 0 ? todayBodyTemp : lastBodyTempDay?.value ?? 0,
            lastBodyTempDay && lastBodyTempDay.index > 0
              ? bodyTemperatureTrendPoints[lastBodyTempDay.index - 1] ?? 0
              : 0,
            ' degF',
          ),
          recommendation: 'Use trends, not single points, to interpret temperature changes.',
          trendPoints: bodyTemperatureTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'degF',
          hubValue: bodyTempHubValue,
          freshness:
            todayBodyTemp > 0
              ? { kind: 'today-avg' }
              : lastBodyTempDay
                ? { kind: 'last-recorded-day', dayLabel: lastBodyTempDay.dayLabel }
                : undefined,
        },
        'Cardio Fitness': {
          title: 'Cardio Fitness',
          summary:
            todayVo2 > 0
              ? `${todayVo2} mL/kg/min today estimate`
              : lastVo2Day
                ? `${lastVo2Day.value} mL/kg/min · ${lastVo2Day.dayLabel}`
                : 'No cardio fitness samples found.',
          trend: formatTrend(
            todayVo2 > 0 ? todayVo2 : lastVo2Day?.value ?? 0,
            lastVo2Day && lastVo2Day.index > 0 ? vo2MaxTrendPoints[lastVo2Day.index - 1] ?? 0 : 0,
            ' mL/kg/min',
          ),
          recommendation: 'Outdoor walks and runs help Apple Watch estimate cardio fitness.',
          trendPoints: vo2MaxTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'mL/kg/min',
          hubValue: vo2HubValue,
          freshness:
            todayVo2 > 0
              ? { kind: 'today-avg' }
              : lastVo2Day
                ? { kind: 'last-recorded-day', dayLabel: lastVo2Day.dayLabel }
                : undefined,
        },
        'Blood Glucose': {
          title: 'Blood Glucose',
          summary:
            glucoseResult.currentValue > 0
              ? `${Math.round(glucoseResult.currentValue)} mg/dL latest · ${glucoseResult.sourceLabel}`
              : todayGlucoseAvg > 0
                ? `${todayGlucoseAvg} mg/dL today avg · ${glucoseResult.sourceLabel}`
                : 'No blood-glucose samples found.',
          trend: formatTrend(todayGlucoseAvg, previous(bloodGlucoseTrendPoints), ' mg/dL'),
          recommendation:
            glucoseResult.source === 'dexcom'
              ? 'Live Dexcom Share data with Apple Health as fallback.'
              : glucoseResult.source === 'healthkit'
                ? 'Using Apple Health glucose.'
                : 'Enable CGM sync to Apple Health.',
          trendPoints: bloodGlucoseTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'mg/dL',
          glucoseChart: glucoseChartData,
          hubValue: glucoseHubValue,
          freshness:
            glucoseResult.currentValue > 0
              ? { kind: 'glucose-latest', source: glucoseResult.source, atMs: glucoseResult.latestTimestampMs }
              : todayGlucoseAvg > 0
                ? { kind: 'glucose-today-avg', source: glucoseResult.source }
                : undefined,
        },
      });

      const todaySteps = stepTrendPoints[todayBucketIndex] ?? 0;

      setHeartRateCardValue(heartRateValue > 0 ? heartRateValue : heartRateTodayLatest);
      setActivitySteps(todaySteps);
      setGlucoseValue(Math.round(glucoseResult.currentValue));
      setGlucoseTrendArrow(glucoseResult.trendArrow);

      const sleepHoursForScore = lastSleepNight != null ? lastSleepNight.totalHours : null;
      const todayGlucoseReadings = filterReadingsToDay(glucoseResult.rawReadings, dayStart);
      const allRestingHrReadings = mapHealthKitSamplesToReadings(restingHrSamplesRaw);
      const todayRestingHrReadings = filterReadingsToDay(allRestingHrReadings, dayStart);
      const pastRestingHrReadings = allRestingHrReadings.filter((reading) => reading.startMs < dayStart.getTime());

      const glucoseScore = calculateGlucoseScore(todayGlucoseReadings, 'general');
      const sleepScore = calculateSleepScore(sleepHoursForScore);
      const heartRateScore = calculateHeartRateScore(todayRestingHrReadings, pastRestingHrReadings);
      const healthResult = calculateOverallHealthScore(glucoseScore, sleepScore, heartRateScore);

      setHealthScore(healthResult.score);

      await setHealthKitLinked(true);
      const syncedAtMs = Date.now();
      setHealthKitLastSyncedAtMsState(syncedAtMs);
      void setHealthKitLastSyncedAtMs(syncedAtMs);
      setHealthKitStatus('ready');
    } catch (error) {
      const errorMessage = toErrorText(error);
      await setHealthKitLinked(false);
      setHealthKitStatus('denied');
      setHealthKitLastError(errorMessage);
      Alert.alert('Apple Health connection failed', errorMessage);
    } finally {
      setHealthKitLoading(false);
    }
  };

  initHealthKitAsyncRef.current = initHealthKitAsync;

  const refreshHealthKitAsync = useCallback(async () => {
    if (Platform.OS !== 'ios' || healthKitLoading || healthKitStatus === 'unsupported') {
      return;
    }
    await initHealthKitAsyncRef.current();
  }, [healthKitLoading, healthKitStatus]);

  const refreshGlucoseAsync = useCallback(async () => {
    if (Platform.OS !== 'ios' || healthKitStatus !== 'ready') {
      return;
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const bucketDates = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(dayStart);
      d.setDate(dayStart.getDate() - (6 - index));
      return d;
    });

    const glucoseResult = await loadGlucoseData({ bucketDates, now, toDayKey: toLocalDayKey, healthKit });
    const todayGlucoseAvg = glucoseResult.trendPoints[glucoseResult.trendPoints.length - 1] ?? 0;
    const glucoseHubValue =
      glucoseResult.currentValue > 0 ? glucoseResult.currentValue : todayGlucoseAvg;
    const glucoseChartData = buildHeartRateChartData(
      glucoseResult.rawReadings
        .filter((reading) => reading.value > 0)
        .map((reading) => ({ value: reading.value, atMs: reading.startMs })),
      now,
    );

    setGlucoseValue(Math.round(glucoseResult.currentValue));
    setGlucoseTrendArrow(glucoseResult.trendArrow);
    setInsightContentByTab((prev) => ({
      ...prev,
      'Blood Glucose': {
        ...prev['Blood Glucose'],
        summary:
          glucoseResult.currentValue > 0
            ? `${Math.round(glucoseResult.currentValue)} mg/dL latest · ${glucoseResult.sourceLabel}`
            : todayGlucoseAvg > 0
              ? `${todayGlucoseAvg} mg/dL today avg · ${glucoseResult.sourceLabel}`
              : 'No blood-glucose samples found.',
        recommendation:
          glucoseResult.source === 'dexcom'
            ? 'Live Dexcom Share data with Apple Health as fallback.'
            : glucoseResult.source === 'healthkit'
              ? 'Using Apple Health glucose.'
              : 'Enable CGM sync to Apple Health.',
        trendPoints: glucoseResult.trendPoints,
        glucoseChart: glucoseChartData,
        hubValue: glucoseHubValue,
        freshness:
          glucoseResult.currentValue > 0
            ? { kind: 'glucose-latest', source: glucoseResult.source, atMs: glucoseResult.latestTimestampMs }
            : todayGlucoseAvg > 0
              ? { kind: 'glucose-today-avg', source: glucoseResult.source }
              : undefined,
      },
    }));

    if (await isLocationCorrelationEnabled()) {
      await processGlucoseEventsIfEnabled(healthKit);
      await refreshPersistedGlucoseEvents();
    }
  }, [healthKitStatus, refreshPersistedGlucoseEvents]);

  /** Poll glucose every 2 minutes while Dashboard or Insights is visible (Dexcom live + Stelo Health sync). */
  useEffect(() => {
    if (activeTab !== 'Dashboard' && activeTab !== 'Insights') {
      return;
    }
    if (healthKitStatus !== 'ready') {
      return;
    }

    void refreshGlucoseAsync();
    const interval = setInterval(() => {
      void refreshGlucoseAsync();
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTab, healthKitStatus, refreshGlucoseAsync]);

  /** Re-read Apple Health when the app returns to the foreground. */
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (
        nextState === 'active' &&
        (previousState === 'background' || previousState === 'inactive') &&
        healthKitStatus === 'ready' &&
        !healthKitLoading
      ) {
        void refreshHealthKitAsync();
        void (async () => {
          if (await isLocationCorrelationEnabled()) {
            await refreshHealthEventMonitoring();
            await processGlucoseEventsIfEnabled(healthKit);
            await refreshPersistedGlucoseEvents();
          }
        })();
      }
    });
    return () => subscription.remove();
  }, [healthKitLoading, healthKitStatus, refreshHealthKitAsync, refreshPersistedGlucoseEvents]);

  useEffect(() => {
    void areEventNotificationsMuted().then(setEventNotificationsMutedState);
    void isLocationCorrelationEnabled().then(setLocationCorrelationEnabled);
  }, []);

  useEffect(() => {
    void refreshPersistedGlucoseEvents();
    void (async () => {
      if (await isLocationCorrelationEnabled()) {
        await refreshHealthEventMonitoring();
      }
    })();
  }, [refreshPersistedGlucoseEvents]);

  useEffect(() => {
    if (startupPermissionsRequested) {
      return;
    }
    async function requestStartupPermissions() {
      setStartupPermissionsRequested(true);
      if (Notifications?.requestPermissionsAsync) {
        try {
          await Notifications.requestPermissionsAsync();
        } catch {
          // Ignore startup permission failures; user can retry in feature flows.
        }
      }
      /** Apple Health is requested when the user opens Dashboard or Insights (see HealthKit auto-connect effect). */
    }
    void requestStartupPermissions();
  }, [startupPermissionsRequested]);

  /** iOS: request HealthKit when Dashboard or Insights is shown; reconnect silently on return visits. */
  useEffect(() => {
    void getHealthKitLastSyncedAtMs().then((syncedAtMs) => {
      if (syncedAtMs) {
        setHealthKitLastSyncedAtMsState(syncedAtMs);
      }
    });
  }, []);

  useEffect(() => {
    if ((activeTab !== 'Insights' && activeTab !== 'Dashboard') || Platform.OS !== 'ios') {
      return;
    }
    if (healthKitStatus === 'ready' || healthKitStatus === 'denied' || healthKitStatus === 'unsupported') {
      return;
    }
    if (healthKitLoading || healthKitConnectInFlightRef.current) {
      return;
    }

    let cancelled = false;
    const interaction = InteractionManager.runAfterInteractions(() => {
      if (cancelled || healthKitConnectInFlightRef.current) {
        return;
      }
      healthKitConnectInFlightRef.current = true;
      void (async () => {
        try {
          const previouslyLinked = await getHealthKitLinked();
          if (cancelled) {
            return;
          }
          if (previouslyLinked) {
            setHealthKitLastError(null);
          }
          await initHealthKitAsync();
        } finally {
          healthKitConnectInFlightRef.current = false;
        }
      })();
    });

    return () => {
      cancelled = true;
      interaction.cancel();
    };
  }, [activeTab, healthKitStatus, healthKitLoading]);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(heartPulseAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [heartPulseAnim]);

  useEffect(() => {
    if (alertCount <= 0) {
      alertBadgeBounceAnim.setValue(0);
      return;
    }
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(alertBadgeBounceAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(alertBadgeBounceAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.delay(560),
      ]),
    );
    bounceLoop.start();
    return () => bounceLoop.stop();
  }, [alertCount, alertBadgeBounceAnim]);

  useEffect(() => {
    suppressStarredGalleryLayoutScrollRef.current = false;
    setStarredGalleryIndex((i) => Math.min(i, DASHBOARD_GALLERY_METRICS.length - 1));
  }, []);

  useLayoutEffect(() => {
    if (DASHBOARD_GALLERY_METRICS.length === 0 || starredGalleryPageWidth <= 0) {
      return;
    }
    if (suppressStarredGalleryLayoutScrollRef.current) {
      return;
    }
    const n = DASHBOARD_GALLERY_METRICS.length;
    const w = starredGalleryPageWidth;
    const loop = n > 1;
    const x = loop ? (starredGalleryIndex + 1) * w : starredGalleryIndex * w;
    const animated = starredGalleryNextScrollAnimatedRef.current;
    starredGalleryNextScrollAnimatedRef.current = false;
    starredGalleryScrollRef.current?.scrollTo({ x, animated });
  }, [starredGalleryIndex, starredGalleryPageWidth]);

  useEffect(() => {
    if (activeTab !== 'Dashboard' || DASHBOARD_GALLERY_METRICS.length <= 1) {
      return;
    }
    const intervalMs = 9000;
    const id = setInterval(() => {
      if (Date.now() < starredGallerySuppressAutoUntilRef.current) {
        return;
      }
      advanceStarredGalleryAuto();
    }, intervalMs);
    return () => clearInterval(id);
  }, [activeTab, advanceStarredGalleryAuto]);

  useEffect(() => {
    if (activeTab !== 'Dashboard') {
      starredGalleryUserDraggingRef.current = false;
    }
  }, [activeTab]);

  return (
    <View style={mergePaletteLayer(layers, 'container', styles.container)}>
      <View style={mergePaletteLayer(layers, 'gridOverlay', styles.gridOverlay)} />
      <StatusBar style={theme?.isLight ? 'dark' : 'light'} />
      <View style={{ flex: 1, backgroundColor: canvasBg, overflow: 'visible' }}>
        <AppHeader
          activeTab={activeTab}
          alertBadgeBounceAnim={alertBadgeBounceAnim}
          alertCount={alertCount}
          onAlertsPress={() => setShowAlertsScreen(true)}
          onMenuPress={() => setSidebarOpen(true)}
        />
        <View style={{ flex: 1 }}>
        {/* Dashboard stays mounted so scroll position and gauge state persist across tab switches. */}
                      <View
          collapsable={false}
          pointerEvents={activeTab === 'Dashboard' ? 'auto' : 'none'}
                                      style={[
            mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer),
            tabStackInset,
            {
              opacity: activeTab === 'Dashboard' ? 1 : 0,
              zIndex: activeTab === 'Dashboard' ? 2 : 0,
            },
          ]}
        >
        <>
        <ScrollView
          bounces={Platform.OS === 'ios'}
          contentContainerStyle={mergePaletteLayer(layers, 'content', styles.content)}
          overScrollMode="never"
          refreshControl={
            Platform.OS === 'ios' ? (
              <RefreshControl
                onRefresh={() => {
                  void refreshHealthKitAsync();
                }}
                refreshing={healthKitLoading && healthKitStatus === 'ready'}
                tintColor={healthKitLoading && healthKitStatus === 'ready' ? '#eab308' : (theme?.textMuted ?? '#94a3b8')}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: canvasBg }}
        >
        <View style={styles.scoreCard}>
          <View style={styles.gaugeWrap}>
            <Svg height={ss(236)} viewBox="0 0 320 236" width="100%">
              <Defs>
                <LinearGradient id="healthGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                  <Stop offset="0%" stopColor="#ef4444" />
                  <Stop offset="50%" stopColor="#eab308" />
                  <Stop offset="100%" stopColor="#22c55e" />
                </LinearGradient>
                <LinearGradient id="outerGradA" x1="0%" x2="100%" y1="0%" y2="0%">
                  <Stop offset="0%" stopColor="#ef4444" stopOpacity="0.36" />
                  <Stop offset="50%" stopColor="#eab308" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.36" />
                </LinearGradient>
              </Defs>
                  <Path d={arcPath(138, -4, 104, 1)} fill="none" stroke="url(#outerGradA)" strokeLinecap="round" strokeWidth={1.6} />
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((startPct, idx) => {
                const endPct = startPct + 9;
                    const colors = ['#ef4444', '#f4511e', '#fb6200', '#f98b00', '#f2b000', '#eab308', '#d0c400', '#a4d400', '#6edf00', '#22c55e'];
                    return <Path key={`seg-${startPct}`} d={arcPath(126, startPct, endPct)} fill="none" stroke={colors[idx]} strokeLinecap="butt" strokeWidth={12} />;
              })}
              {Array.from({ length: 41 }, (_, i) => i * 2.5).map((mark) => {
                const angle = angleForPct(mark);
                if (mark <= 7.5 || mark >= 92.5) {
                  return null;
                }
                const major = mark % 10 === 0;
                const x1 = centerX + Math.cos(angle) * 106;
                const y1 = centerY - Math.sin(angle) * 106;
                const tickLength = major ? 12 : 6;
                const x2 = centerX + Math.cos(angle) * (106 + tickLength);
                const y2 = centerY - Math.sin(angle) * (106 + tickLength);
                    return (
                      <Path
                        key={`tick-${mark}`}
                        d={`M ${x1} ${y1} L ${x2} ${y2}`}
                        fill="none"
                        stroke={major ? gaugeTickMajor : gaugeTickMinor}
                        strokeLinecap="round"
                        strokeWidth={major ? 2.6 : 1.15}
                      />
                    );
              })}
              <Path d={`M ${tipX} ${tipY} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`} fill={gaugeNeedleFill} />
                  <SvgText fill={gaugeScaleLabelFill} fontSize={String(ts(13))} fontWeight="700" x={pointOnArc(118, 0).x + ss(8)} y={pointOnArc(118, 0).y - ss(10)}>
                    0
                  </SvgText>
                  <SvgText fill={gaugeScaleLabelFill} fontSize={String(ts(13))} fontWeight="700" textAnchor="end" x={pointOnArc(118, 100).x - ss(8)} y={pointOnArc(118, 100).y - ss(10)}>
                    100
                  </SvgText>
                </Svg>
              </View>
              <View style={styles.scoreCenterStack}>
                <Animated.Text style={[styles.scoreHeart, { opacity: heartPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }), transform: [{ scale: heartPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] }) }] }]}>♥</Animated.Text>
                <Text style={mergePaletteLayer(layers, 'scoreLabel', styles.scoreLabel)}>HEALTH SCORE</Text>
                <View style={styles.scoreRow}>
                  {hasHealthScore ? (
                    <>
                      <Text style={mergePaletteLayer(layers, 'score', styles.score)}>{displayScore}</Text>
                      <Text style={mergePaletteLayer(layers, 'scoreUnit', styles.scoreUnit)}>/100</Text>
                    </>
                  ) : (
                    <Text style={mergePaletteLayer(layers, 'score', styles.score)}>—</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.scoreState,
                    hasHealthScore && scorePresentation?.band === 'good'
                      ? styles.scoreStateGood
                      : hasHealthScore && scorePresentation?.band === 'poor'
                        ? styles.scoreStatePoor
                        : null,
                    !hasHealthScore && { color: metricNoDataColor },
                  ]}
                >
                  {hasHealthScore ? scorePresentation?.label : 'NO DATA'}
                </Text>
              </View>
            </View>
            <View style={styles.grid}>
              {dashboardMetrics.map((item) => (
                <DashboardMetricCard
                  key={item.label}
                  accessibilityHint={`Opens ${insightTabLabel(item.insightTab)} in Insights`}
                  accessibilityLabel={`${item.label}, ${item.value} ${item.unit}`}
                  label={item.label}
                  unit={item.unit}
                  value={item.value}
                  onPress={() => openInsightFromDashboard(item.insightTab)}
                />
              ))}
            </View>
            <InsightsStarredGallery
              galleryMetrics={DASHBOARD_GALLERY_METRICS}
              insightContentByTab={insightContentByTab}
              insightsGalleryScrollPages={insightsGalleryScrollPages}
              onInsightsGalleryMomentumEnd={onInsightsGalleryMomentumEnd}
              onInsightsGalleryScroll={onInsightsGalleryScroll}
              setStarredGalleryIndex={setStarredGalleryIndex}
              starredGalleryIndex={starredGalleryIndex}
              starredGalleryPageWidth={starredGalleryPageWidth}
              starredGalleryScrollRef={starredGalleryScrollRef}
              starredGallerySuppressAutoUntilRef={starredGallerySuppressAutoUntilRef}
              starredGalleryUserDraggingRef={starredGalleryUserDraggingRef}
              suppressStarredGalleryLayoutScrollRef={suppressStarredGalleryLayoutScrollRef}
            />
            <View style={styles.quickActionsSection}>
              <View style={styles.quickActionsHeaderRow}>
                <Text style={mergePaletteLayer(layers, 'sectionLabel', styles.sectionLabel)}>QUICK ACTIONS</Text>
                <TouchableOpacity
                  accessibilityLabel="Customize quick actions"
                  accessibilityRole="button"
                  onPress={() => setShowQuickMetricsPicker(true)}
                  style={mergePaletteLayer(layers, 'quickActionsCustomizeBtn', styles.quickActionsCustomizeBtn)}
                >
                  <Ionicons color={theme?.textMuted ?? '#94a3b8'} name="options-outline" size={13} />
                  <Text style={mergePaletteLayer(layers, 'quickActionsCustomizeText', styles.quickActionsCustomizeText)}>
                    Customize
                  </Text>
                </TouchableOpacity>
              </View>
              <DashboardQuickActionMetricsRow
                metrics={dashboardQuickMetrics}
                onMetricPress={openQuickActionFromDashboard}
                onReorder={applyDashboardQuickMetrics}
              />
            </View>
          </ScrollView>
        </>
        </View>
        {activeTab === 'Insights' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), tabStackInset, { zIndex: 2 }]}>
            <InsightsScreen
              activeInsightTab={activeInsightTab}
              healthKitLastError={healthKitLastError}
              healthKitLastSyncedAtMs={healthKitLastSyncedAtMs}
              healthKitLoading={healthKitLoading}
              healthKitStatus={healthKitStatus}
              initHealthKitAsync={initHealthKitAsync}
              insightContentByTab={insightContentByTab}
              medicationsOpenRequest={medicationsOpenRequest}
              refreshHealthKitAsync={refreshHealthKitAsync}
              selectedInsightContent={selectedInsightContent}
              onInsightDetailBack={handleInsightDetailBack}
              onMedicationsDetailBack={handleMedicationsDetailBack}
              onOpenInsightTab={openInsightFromInsightsHub}
              setHealthKitStatus={setHealthKitStatus}
            />
                </View>
        ) : null}
        {activeTab === 'Goals' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), tabStackInset, { zIndex: 2 }]}>
            <GoalsScreen
              goals={visibleGoals}
              insightContentByTab={insightContentByTab}
              onCreatePress={() => setShowCreateGoalModal(true)}
              onDeleteGoal={(goalId) => {
                void handleDeleteGoal(goalId);
              }}
            />
              </View>
        ) : null}
        {activeTab === 'Swipes' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), tabStackInset, { zIndex: 2 }]}>
            <SwipesScreen />
          </View>
        ) : null}
        {activeTab === 'Personality' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), tabStackInset, { zIndex: 2 }]}>
            <PersonalityQuestionnaireScreen />
          </View>
        ) : null}
        </View>
      </View>

      <BottomNavBar
        activeTab={activeTab}
        alertBadgeBounceAnim={alertBadgeBounceAnim}
        alertCount={alertCount}
        onTabPress={handleMainNavPress}
      />

      <DashboardQuickMetricsPicker
        onApply={applyDashboardQuickMetrics}
        onClose={() => setShowQuickMetricsPicker(false)}
        selected={dashboardQuickMetrics}
        visible={showQuickMetricsPicker}
      />

      <CreateGoalModal
        healthKitReady={healthKitReady}
        insightContentByTab={insightContentByTab}
        onClose={() => setShowCreateGoalModal(false)}
        onCreate={(input) => {
          void handleCreateGoal(input);
        }}
        visible={showCreateGoalModal}
      />

      <Modal
        animationType="slide"
        transparent
        visible={showAlertsScreen}
        onRequestClose={() => setShowAlertsScreen(false)}
      >
        <View
          style={[
            mergePaletteLayer(layers, 'alertsModalBackdrop', styles.alertsModalBackdrop),
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
          ]}
        >
          <View style={mergePaletteLayer(layers, 'alertsModalCard', styles.alertsModalCard)}>
            <View style={styles.alertsModalHeader}>
              <View style={styles.alertsHeaderTextWrap}>
                <Text style={mergePaletteLayer(layers, 'alertsTitle', styles.alertsTitle)}>Event Logs</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close event logs"
                onPress={() => setShowAlertsScreen(false)}
                style={mergePaletteLayer(layers, 'alertsBackBtn', styles.alertsBackBtn)}
              >
                <Ionicons name="close" size={22} color={theme?.textPrimary ?? '#f8fafc'} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityLabel={eventNotificationsMuted ? 'Unmute event notifications' : 'Mute event notifications'}
              accessibilityRole="button"
              accessibilityState={{ selected: eventNotificationsMuted }}
              onPress={toggleEventNotificationsMuted}
              style={mergePaletteLayer(layers, 'alertsMuteBtn', styles.alertsMuteBtn)}
            >
              <Ionicons
                color={eventNotificationsMuted ? (theme?.textMuted ?? '#94a3b8') : (theme?.accent ?? '#38bdf8')}
                name={eventNotificationsMuted ? 'notifications-off-outline' : 'volume-high-outline'}
                size={18}
              />
              <Text style={mergePaletteLayer(layers, 'alertsMuteBtnText', styles.alertsMuteBtnText)}>
                {eventNotificationsMuted ? 'Notifications muted' : 'Mute notifications'}
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1, minHeight: 0 }}>
              <LogsScreen events={alertEventLog} omitHeading />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={showProfileScreen}
        onRequestClose={() => setShowProfileScreen(false)}
      >
        <ProfileShowcaseScreen onClose={() => setShowProfileScreen(false)} />
      </Modal>

      {sidebarOpen ? (
        <View style={styles.sidebarOverlay}>
          <View style={mergePaletteLayer(layers, 'sidebarPanel', styles.sidebarPanel)}>
            <View style={styles.sidebarHeader}>
              <Text style={mergePaletteLayer(layers, 'sidebarTitle', styles.sidebarTitle)}>Menu</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <Text style={mergePaletteLayer(layers, 'sidebarClose', styles.sidebarClose)}>×</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => {
                setSidebarOpen(false);
                setShowProfileScreen(true);
              }}
            >
              <Text style={mergePaletteLayer(layers, 'sidebarItemText', styles.sidebarItemText)}>Export Data</Text>
            </TouchableOpacity>
            <View style={styles.demoToggleRow}>
              <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Log location</Text>
              <Switch
                disabled={locationToggleBusy}
                onValueChange={(value) => {
                  void handleLocationCorrelationToggle(value);
                }}
                value={locationCorrelationEnabled}
              />
            </View>
            <TouchableOpacity
              onPress={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
              style={styles.demoToggleRow}
            >
              <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Light mode</Text>
              <View
                style={[
                  mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                  colorScheme === 'light' && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                ]}
              >
                <Text
                  style={[
                    mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                    colorScheme === 'light' && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                  ]}
                >
                  {colorScheme === 'light' ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSidebarOpen(false)} style={styles.sidebarScrim} />
        </View>
      ) : null}
    </View>
  );
}

