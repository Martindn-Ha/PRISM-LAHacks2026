import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import MapView from 'react-native-maps';
import { addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getScorePresentation } from '../services/scoringService';
import WeatherIcon from '../components/WeatherIcon';
import { fetchCurrentWeather } from '../services/weatherService';
import { APP_DISPLAY_NAME } from '../constants/appBranding';
import { useDemoPalette } from '../context/DemoPaletteContext';
import { DEMO_PALETTE_CHOICES, getAppCanvasBackground, mergePaletteLayer, mixHex, withAlpha } from '../theme/demoPaletteTheme';
import { styles } from '../styles/appStyles';
import {
  CHALLENGE_FILTERS,
  type ChallengeFilter,
  GOALS_CHALLENGES,
  GOALS_TABS,
  type GoalsTab,
  type GoalChallenge,
  type MapLayerFilter,
  NAV_ITEMS,
} from '../constants/appNavigation';
import {
  COMMUNITY_ACTIONS,
  COMMUNITY_DISCOVERY,
  COMMUNITY_OVERVIEW_DESCRIPTION,
  COMMUNITY_PAST_EVENTS,
  COMMUNITY_PROGRESS_POSTS,
  COMMUNITY_UPCOMING_EVENTS,
} from '../constants/community';
import {
  DASHBOARD_METRIC_INSIGHT_TAB,
  DASHBOARD_QUICK_ACTION_SLOTS,
  insightTabLabel,
  INSIGHT_GROUPS,
  INSIGHTS_TAB_CONTENT,
  INSIGHT_UNITS,
  METRICS,
  QUICK_ACTIONS,
  QUICK_ACTION_ICON_BY_TAB,
  QUICK_ACTION_METRIC_OPTIONS,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
  type InsightContent,
  type InsightTab,
  type InsightTrendWindow,
} from '../constants/insights';
import { ARISTA_COMMUNITY_EVENTS_URL, COMMUNITY_SPOTLIGHT_IMAGE_URL, hasFirebaseConfig } from '../config/publicEnv';
import { DashboardQuickActionMetricsRow } from '../components/dashboard/DashboardQuickMetrics';
import { InsightsFavoriteSparkPage } from '../components/insights/InsightsFavoriteSparkPage';
import { InsightsBulbIcon } from '../components/icons/WellnessIcons';
import { fetchAristaCommunityEvents, fetchAristaContext } from '../lib/aristaClient';
import { buildProgressPostHeuristics, generateAdvisorSuggestionBody } from '../lib/heuristicContent';
import { Notifications } from '../lib/expoNotifications';
import { getFirestoreInstance } from '../lib/firestoreClient';
import { buildInsightsHealthKitReadPermissions, healthKit } from '../lib/appleHealthKit';
import { getHealthKitLinked, setHealthKitLinked } from '../lib/healthKitConnection';
import { buildProgressPostDisplayCaption, formatEventSourceName, toErrorText, toShareSlug } from '../utils/format';
import GoalsScreen from './GoalsScreen';
import InsightsScreen from './InsightsScreen';
import MapScreen from './MapScreen';
import LogsScreen from './LogsScreen';
import SwipesScreen from './SwipesScreen';
import ProfileShowcaseScreen from './ProfileShowcaseScreen';
import type {
  AlertLogEvent,
  CommunityEventItem,
  DashboardValueDriftToggles,
  InviteContact,
  MapScreenPin,
  ProgressBoardPost,
} from '../types/experience';

type DemoDriftModel = {
  phase: number;
  stressBias: number;
  glucoseBias: number;
  recoveryBias: number;
  hydrationBias: number;
  adherenceBias: number;
};

type DemoHighAlert = {
  id: string;
  title: string;
  detail: string;
  severity: 'High';
};

type AdvisorAlertSlideKey = 'glucose' | 'stress' | 'heartRate';

type AdvisorSlide = {
  key: AdvisorAlertSlideKey | 'steady';
  message: string;
};

const ADVISOR_ALERT_LABEL: Record<AdvisorAlertSlideKey, string> = {
  glucose: 'Glucose',
  stress: 'Stress',
  heartRate: 'Heart rate',
};

const SUGGESTION_CARD_BY_METRIC: Record<AdvisorAlertSlideKey, { badge: string; cta: string }> = {
  stress: {
    badge: 'STRESS MANAGEMENT',
    cta: 'View More',
  },
  glucose: {
    badge: 'HEALTHIER FOODS',
    cta: 'View More',
  },
  heartRate: {
    badge: 'BREATHING EXERCISES',
    cta: 'View More',
  },
};

/** Where “View More” sends the user (Insights detail for that signal). */
const ADVISOR_VIEW_OPTIONS_INSIGHT_TAB: Record<AdvisorAlertSlideKey, InsightTab> = {
  stress: DASHBOARD_METRIC_INSIGHT_TAB['STRESS LEVEL'],
  glucose: DASHBOARD_METRIC_INSIGHT_TAB.GLUCOSE,
  heartRate: DASHBOARD_METRIC_INSIGHT_TAB['HEART RATE'],
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalize = (value: number, min: number, max: number) => clamp((value - min) / (max - min), 0, 1);
const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

/** True for actual sleep stages from Apple Health (not INBED / AWAKE). */
function isAppleHealthAsleepSegment(value: string | undefined): boolean {
  const v = (value ?? '').toUpperCase();
  if (!v || v === 'INBED' || v === 'AWAKE') {
    return false;
  }
  return v === 'ASLEEP' || v === 'CORE' || v === 'DEEP' || v === 'REM';
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

function buildInitialDriftModel(args: {
  stressValue: number;
  glucoseValue: number;
  activitySleepMinutes: number;
  activityWaterGlasses: number;
  activityMedsTaken: number;
}): DemoDriftModel {
  return {
    phase: 0,
    stressBias: normalize(args.stressValue, 0, 100) - 0.5,
    glucoseBias: normalize(args.glucoseValue, 70, 240) - 0.5,
    recoveryBias: normalize(args.activitySleepMinutes, 180, 9 * 60 + 59) - 0.5,
    hydrationBias: normalize(args.activityWaterGlasses, 0, 12) - 0.5,
    adherenceBias: normalize(args.activityMedsTaken, 0, 2) - 0.5,
  };
}

function getNextDriftSnapshot(model: DemoDriftModel, fastMode: boolean) {
  const phaseStep = fastMode ? 0.34 : 0.16;
  model.phase += phaseStep;
  const dayRhythm = Math.sin(model.phase * 0.5);
  const stressWave = Math.sin(model.phase * 1.1 + 0.8);
  const glucoseWave = Math.sin(model.phase * 0.85 - 0.35);
  const activityWave = Math.sin(model.phase * 1.45 + 0.25);

  const stressNorm = clamp(0.5 + model.stressBias * 0.5 + stressWave * 0.22 - dayRhythm * 0.08, 0.08, 0.97);
  const hydrationNorm = clamp(0.58 + model.hydrationBias * 0.55 - stressNorm * 0.14 + dayRhythm * 0.2, 0.05, 0.98);
  const recoveryNorm = clamp(
    0.52 + model.recoveryBias * 0.5 + dayRhythm * 0.22 - stressNorm * 0.22 + hydrationNorm * 0.1,
    0.06,
    0.98,
  );
  const adherenceNorm = clamp(0.6 + model.adherenceBias * 0.5 - stressNorm * 0.12 + recoveryNorm * 0.08, 0.1, 0.96);
  const metabolicLoad = clamp(
    stressNorm * 0.42 +
      (1 - recoveryNorm) * 0.3 +
      (1 - hydrationNorm) * 0.16 +
      (1 - adherenceNorm) * 0.12,
    0,
    1,
  );
  const glucoseBase = 0.42 + model.glucoseBias * 0.5 + glucoseWave * 0.17 + stressNorm * 0.2 - hydrationNorm * 0.12 - adherenceNorm * 0.1;
  const glucoseFloor = clamp((metabolicLoad - 0.45) * 1.25, 0, 0.62);
  const glucoseNorm = clamp(Math.max(glucoseBase, glucoseFloor), 0.05, 0.99);

  const cardiacLoad = clamp(stressNorm * 0.54 + metabolicLoad * 0.28 + activityWave * 0.08 - recoveryNorm * 0.08, 0, 1);
  const hrBase = 0.31 + stressNorm * 0.4 + activityWave * 0.12 - recoveryNorm * 0.14;
  const hrFloor = clamp((cardiacLoad - 0.4) * 1.15, 0, 0.6);
  const hrNorm = clamp(Math.max(hrBase, hrFloor), 0.06, 0.98);

  let glucose = clamp(Math.round(82 + glucoseNorm * 120), 70, 240);
  const stress = clamp(Math.round(stressNorm * 100), 0, 100);
  let heartRate = clamp(Math.round(52 + hrNorm * 56), 45, 130);
  const sleepMinutes = clamp(Math.round(320 + recoveryNorm * 235), 180, 9 * 60 + 59);

  // Progressively rise through the "day", with occasional faster windows from activity.
  const stepDelta = clamp(Math.round(45 + (0.25 + activityWave * 0.35 + dayRhythm * 0.45) * 230), 15, 320);
  const water = clamp(Math.round(hydrationNorm * 12), 0, 12);
  const meds = adherenceNorm >= 0.72 ? 2 : adherenceNorm >= 0.4 ? 1 : 0;

  const score = clamp(
    Math.round(
      100 -
        (glucoseNorm * 26 +
          stressNorm * 26 +
          hrNorm * 20 +
          (1 - recoveryNorm) * 14 +
          (1 - hydrationNorm) * 6 +
          (1 - adherenceNorm) * 4 +
          metabolicLoad * 8),
    ),
    38,
    92,
  );

  // Keep score and card vitals consistent for demos:
  // when score is very low, glucose and heart rate should visibly trend high.
  if (score <= 50) {
    const severity = normalize(50 - score, 0, 12); // 50 -> 0, 38 -> 1
    const glucoseFloor = Math.round(170 + severity * 20); // 170..190
    const hrFloor = Math.round(95 + severity * 13); // 95..108
    glucose = Math.max(glucose, glucoseFloor);
    heartRate = Math.max(heartRate, hrFloor);
  } else if (score <= 60) {
    const severity = normalize(60 - score, 0, 10); // 60 -> 0, 50 -> 1
    const glucoseFloor = Math.round(150 + severity * 20); // 150..170
    const hrFloor = Math.round(88 + severity * 7); // 88..95
    glucose = Math.max(glucose, glucoseFloor);
    heartRate = Math.max(heartRate, hrFloor);
  }

  return {
    score,
    glucose,
    stress,
    heartRate,
    sleepMinutes,
    stepDelta,
    water,
    meds,
  };
}

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const starredGalleryPageWidth = Math.max(0, windowWidth - 32);
  /** Matches `styles.content` paddingHorizontal 16 + 16; header row lives inside that width. */
  const dashboardContentInnerWidth = Math.max(0, windowWidth - 32);
  /**
   * Cap the left header cluster so “Good morning” cannot run under the fixed centered alert
   * (`alertBlock` width 92, centered — do not change alert layout).
   */
  const dashboardHeaderLeftMaxWidth = useMemo(() => {
    const half = dashboardContentInnerWidth / 2;
    const alertHalfWidth = 46;
    const gapFromAlert = 10;
    return Math.max(88, Math.floor(half - alertHalfWidth - gapFromAlert));
  }, [dashboardContentInnerWidth]);
  /** Date stack type scale on narrow phones (header; centered alert unchanged). */
  const dashboardHeaderDateTypography = useMemo(() => {
    if (windowWidth <= 360) {
      return {
        datePrimaryFontSize: 12,
        datePrimaryLineHeight: 16,
        dateSecondaryFontSize: 11,
        dateSecondaryLineHeight: 14,
      };
    }
    if (windowWidth <= 390) {
      return {
        datePrimaryFontSize: 14,
        datePrimaryLineHeight: 18,
        dateSecondaryFontSize: 12,
        dateSecondaryLineHeight: 15,
      };
    }
    if (windowWidth <= 430) {
      return {
        datePrimaryFontSize: 15,
        datePrimaryLineHeight: 19,
        dateSecondaryFontSize: 14,
        dateSecondaryLineHeight: 17,
      };
    }
    return {
      datePrimaryFontSize: 16,
      datePrimaryLineHeight: 20,
      dateSecondaryFontSize: 15,
      dateSecondaryLineHeight: 19,
    };
  }, [windowWidth]);
  const mapViewRef = useRef<MapView | null>(null);
  const starredGalleryScrollRef = useRef<ScrollView | null>(null);
  const starredGalleryNextScrollAnimatedRef = useRef(false);
  const starredGallerySuppressAutoUntilRef = useRef(0);
  /** When true, skip programmatic gallery scrollTo so user-driven scroll can update dots without fighting layout. */
  const suppressStarredGalleryLayoutScrollRef = useRef(false);
  /** When false, ignore onScroll-driven index updates (avoids fighting auto-rotate during programmatic scrollTo). */
  const starredGalleryUserDraggingRef = useRef(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthScore, setHealthScore] = useState(72);
  const [demoScoreDriftEnabled, setDemoScoreDriftEnabled] = useState(false);
  const [demoFastDriftEnabled, setDemoFastDriftEnabled] = useState(false);
  const [demoAlertEnabled, setDemoAlertEnabled] = useState(false);
  const [alertEventLog, setAlertEventLog] = useState<AlertLogEvent[]>([]);
  const [demoToolsDropdownOpen, setDemoToolsDropdownOpen] = useState(false);
  const [demoDashboardValueDrift, setDemoDashboardValueDrift] = useState<DashboardValueDriftToggles>({
    glucose: false,
    stress: false,
    heartRateCard: false,
    steps: false,
    sleep: false,
    meds: false,
    water: false,
  });
  const [glucoseValue, setGlucoseValue] = useState(142);
  const [stressValue, setStressValue] = useState(78);
  const [heartRateCardValue, setHeartRateCardValue] = useState(68);
  const [activitySteps, setActivitySteps] = useState(6842);
  const [activitySleepMinutes, setActivitySleepMinutes] = useState(435);
  const [activityMedsTaken, setActivityMedsTaken] = useState(2);
  const [activityWaterGlasses, setActivityWaterGlasses] = useState(6);
  const [advisorGallerySlideWidth, setAdvisorGallerySlideWidth] = useState(() => Math.max(200, windowWidth - 32 - 26 - 88 - 10));
  const [advisorGalleryIndex, setAdvisorGalleryIndex] = useState(0);
  const [advisorGalleryShellLayout, setAdvisorGalleryShellLayout] = useState({ w: 0, h: 0 });
  const [advisorGalleryScrollX, setAdvisorGalleryScrollX] = useState(0);
  const advisorGalleryEdgeGid = useMemo(() => `ag-${Math.random().toString(36).slice(2, 10)}`, []);
  const { layers, paletteId, setPaletteId, theme } = useDemoPalette();
  /** ScrollView + tab stack need an explicit fill; RN often defaults that chrome to white. */
  const canvasBg = getAppCanvasBackground(theme);
  const svgNavDividerStroke = theme?.borderGlass ?? 'rgba(255,255,255,0.42)';
  const svgAlertBellStroke = theme?.accent ?? '#eab308';
  const gaugeStrokeDim = useMemo(() => (theme ? withAlpha(theme.textMuted, 0.52) : 'rgba(255,255,255,0.36)'), [theme]);
  const gaugeStrokeFaint = useMemo(() => (theme ? withAlpha(theme.textMuted, 0.34) : 'rgba(255,255,255,0.24)'), [theme]);
  const gaugeTickMajor = useMemo(() => (theme ? withAlpha(theme.textPrimary, 0.82) : 'rgba(255,255,255,0.75)'), [theme]);
  const gaugeTickMinor = useMemo(() => (theme ? withAlpha(theme.textMuted, 0.55) : 'rgba(255,255,255,0.4)'), [theme]);
  const gaugeScaleLabelFill = useMemo(() => (theme ? withAlpha(theme.textPrimary, 0.94) : '#f8fafc'), [theme]);
  const gaugeNeedleFill = theme?.isLight ? theme.textPrimary : '#ffffff';
  const inputPlaceholderColor = theme?.textMuted ?? '#64748b';
  /** Mr. Chan carousel edge fades: must match canvas/card, not hardcoded slate (shows “black sides” on light palettes). */
  const advisorGalleryFadeDark = useMemo(() => {
    if (!theme) {
      return '#020617';
    }
    if (theme.isLight) {
      return mixHex(theme.screenBackground, theme.textPrimary, 0.12);
    }
    return mixHex(theme.screenBackground, '#000000', 0.42);
  }, [theme]);
  const advisorGalleryTopFade = useMemo(() => theme?.screenBackground ?? '#111827', [theme]);
  const advisorGalleryHiStop = useMemo(() => (!theme ? '#f8fafc' : theme.isLight ? '#ffffff' : '#f8fafc'), [theme]);
  const [dismissedAdvisorSlideKeys, setDismissedAdvisorSlideKeys] = useState<Partial<Record<AdvisorAlertSlideKey, true>>>({});
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'off' | 'granted' | 'denied'>('off');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapLocationStatus, setMapLocationStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [activeMapLayer, setActiveMapLayer] = useState<MapLayerFilter | null>('All');
  const [activeInsightTab, setActiveInsightTab] = useState<InsightTab | null>(null);
  /** When set, Insights detail back returns to this main tab (e.g. Dashboard) instead of the Insights hub. */
  const [insightDetailReturnTab, setInsightDetailReturnTab] = useState<string | null>(null);
  const [dashboardQuickMetrics, setDashboardQuickMetrics] = useState<InsightTab[]>(() =>
    QUICK_ACTION_METRIC_OPTIONS.slice(0, DASHBOARD_QUICK_ACTION_SLOTS),
  );
  const [quickMetricSearchQuery, setQuickMetricSearchQuery] = useState('');
  const [starredGalleryIndex, setStarredGalleryIndex] = useState(0);

  const insightsGalleryScrollPages = useMemo(() => {
    const m = dashboardQuickMetrics;
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
  }, [dashboardQuickMetrics]);

  const onInsightsGalleryScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!starredGalleryUserDraggingRef.current) {
        return;
      }
      const w = starredGalleryPageWidth;
      if (w <= 0) {
        return;
      }
      const n = dashboardQuickMetrics.length;
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
    [dashboardQuickMetrics.length, starredGalleryPageWidth],
  );

  const onInsightsGalleryMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      starredGalleryUserDraggingRef.current = false;
      suppressStarredGalleryLayoutScrollRef.current = false;
      const w = starredGalleryPageWidth;
      if (w <= 0) {
        return;
      }
      const n = dashboardQuickMetrics.length;
      if (n <= 1) {
        setStarredGalleryIndex(0);
        return;
      }
      const p = Math.round(e.nativeEvent.contentOffset.x / w);
      if (p === 0) {
        setStarredGalleryIndex(n - 1);
        requestAnimationFrame(() => {
          starredGalleryScrollRef.current?.scrollTo({ x: n * w, animated: false });
        });
        return;
      }
      if (p === n + 1) {
        setStarredGalleryIndex(0);
        requestAnimationFrame(() => {
          starredGalleryScrollRef.current?.scrollTo({ x: w, animated: false });
        });
        return;
      }
      setStarredGalleryIndex(p - 1);
    },
    [dashboardQuickMetrics.length, starredGalleryPageWidth],
  );

  const [expandedInsightGroups, setExpandedInsightGroups] = useState<Record<string, boolean>>(
    () => INSIGHT_GROUPS.reduce((acc, group) => ({ ...acc, [group.id]: false }), {}),
  );
  const [insightContentByTab, setInsightContentByTab] = useState<Record<InsightTab, InsightContent>>(INSIGHTS_TAB_CONTENT);
  const [insightTrendWindow, setInsightTrendWindow] = useState<InsightTrendWindow>('7d');
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [healthKitLoading, setHealthKitLoading] = useState(false);
  const [healthKitLastError, setHealthKitLastError] = useState<string | null>(null);
  const healthKitConnectInFlightRef = useRef(false);
  const [goalsTab, setGoalsTab] = useState<GoalsTab>('Communities');
  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('All');
  const [communitySearchQuery, setCommunitySearchQuery] = useState('');
  const [personalChallenges, setPersonalChallenges] = useState<GoalChallenge[]>([]);
  const [showCreatePersonalChallengeModal, setShowCreatePersonalChallengeModal] = useState(false);
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [newChallengeDetail, setNewChallengeDetail] = useState('');
  const [joinedCommunityNames, setJoinedCommunityNames] = useState<string[]>([]);
  const [selectedJoinedCommunityName, setSelectedJoinedCommunityName] = useState<string | null>(null);
  const [selectedCommunityAction, setSelectedCommunityAction] = useState('Progress Board');
  const [eventsTab, setEventsTab] = useState<'Upcoming' | 'Past'>('Upcoming');
  const [communityEventsByTab, setCommunityEventsByTab] = useState<Record<'Upcoming' | 'Past', CommunityEventItem[]>>({
    Upcoming: [...COMMUNITY_UPCOMING_EVENTS],
    Past: [...COMMUNITY_PAST_EVENTS],
  });
  const [loadingCommunityEvents, setLoadingCommunityEvents] = useState(false);
  const [mapDiscoveryEvents, setMapDiscoveryEvents] = useState<CommunityEventItem[]>([]);
  const [mapDiscoveryEventsLoading, setMapDiscoveryEventsLoading] = useState(false);
  const [isInteractingWithEventsList, setIsInteractingWithEventsList] = useState(false);
  const [showOverviewPopup, setShowOverviewPopup] = useState(false);
  const [showInvitePopup, setShowInvitePopup] = useState(false);
  const [showCreateProgressPostModal, setShowCreateProgressPostModal] = useState(false);
  const [createPostCaption, setCreatePostCaption] = useState('');
  const [createPostImageUri, setCreatePostImageUri] = useState<string | null>(null);
  const [isPublishingProgressPost, setIsPublishingProgressPost] = useState(false);
  const [communityCustomPostsByName, setCommunityCustomPostsByName] = useState<Record<string, ProgressBoardPost[]>>({});
  const [showAlertsScreen, setShowAlertsScreen] = useState(false);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [inviteContacts, setInviteContacts] = useState<InviteContact[]>([]);
  const [loadingInviteContacts, setLoadingInviteContacts] = useState(false);
  const [startupPermissionsRequested, setStartupPermissionsRequested] = useState(false);
  const [weatherF, setWeatherF] = useState(72);
  const [weatherLabel, setWeatherLabel] = useState('Sunny');
  /** WMO code from Open-Meteo; drives header weather SVG. */
  const [weatherCode, setWeatherCode] = useState(0);
  /** Bumps once per minute so the header date/time stay current. */
  const [headerDateClockTick, setHeaderDateClockTick] = useState(0);
  const [foodSuggestionUnlocked, setFoodSuggestionUnlocked] = useState(false);
  const [foodSuggestionKind, setFoodSuggestionKind] = useState<AdvisorAlertSlideKey | null>(null);
  const [foodSuggestionBody, setFoodSuggestionBody] = useState('');
  const [foodSuggestionGenerating, setFoodSuggestionGenerating] = useState(false);
  const advisorSuggestionRequestRef = useRef(0);
  const demoDriftModelRef = useRef<DemoDriftModel>(
    buildInitialDriftModel({
      stressValue,
      glucoseValue,
      activitySleepMinutes,
      activityWaterGlasses,
      activityMedsTaken,
    }),
  );
  const previousAlertDemoEnabledRef = useRef(false);
  const heartPulseAnim = useRef(new Animated.Value(0)).current;
  const alertBadgeBounceAnim = useRef(new Animated.Value(0)).current;
  const displayScore = Math.round(healthScore);
  const glucoseNow = Math.round(glucoseValue);
  const stressNow = Math.round(stressValue);
  const heartRateNow = Math.round(heartRateCardValue);
  const scorePresentation = getScorePresentation(displayScore);
  /** Stacked lines: calendar date (no weekday), then clock. */
  const dashboardHeaderDateLines = useMemo(() => {
    const now = new Date();
    const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    // Keep year on the same line as the date (narrow header was wrapping after the comma).
    const fullDate = `${monthDay},\u00a0${now.getFullYear()}`;
    const timePart = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return { fullDate, timePart };
  }, [headerDateClockTick]);
  const allDemoToolsEnabled =
    demoScoreDriftEnabled && Object.values(demoDashboardValueDrift).every(Boolean);
  const highAlertCandidates: Array<DemoHighAlert | null> = [
    glucoseNow >= 170
      ? { id: 'a1', title: 'Abnormal Glucose', detail: `Glucose measured at ${glucoseNow} mg/dL.`, severity: 'High' }
      : null,
    stressNow >= 70
      ? { id: 'a2', title: 'Elevated Stress', detail: `Stress index at ${stressNow}/100.`, severity: 'High' }
      : null,
    heartRateNow >= 95
      ? { id: 'a3', title: 'Abnormal Heart Rate', detail: `Resting heart rate at ${heartRateNow} bpm.`, severity: 'High' }
      : null,
  ];
  const alertItems = demoAlertEnabled ? highAlertCandidates.filter(isDefined) : [];
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

  const prevGlucoseHighRef = useRef(false);
  const prevStressHighRef = useRef(false);
  const prevHeartRateHighRef = useRef(false);

  useEffect(() => {
    const gHigh = glucoseNow >= 170;
    const sHigh = stressNow >= 70;
    const hHigh = heartRateNow >= 95;

    if (gHigh && !prevGlucoseHighRef.current) {
      appendAlertLog({
        level: 'warn',
        source: 'alert:glucose',
        message: `Abnormal Glucose: Glucose measured at ${glucoseNow} mg/dL (threshold ≥170).`,
      });
    } else if (!gHigh && prevGlucoseHighRef.current) {
      appendAlertLog({
        level: 'info',
        source: 'alert:glucose',
        message: `Glucose returned below high threshold (${glucoseNow} mg/dL).`,
      });
    }
    prevGlucoseHighRef.current = gHigh;

    if (sHigh && !prevStressHighRef.current) {
      appendAlertLog({
        level: 'warn',
        source: 'alert:stress',
        message: `Elevated Stress: Stress index at ${stressNow}/100 (threshold ≥70).`,
      });
    } else if (!sHigh && prevStressHighRef.current) {
      appendAlertLog({
        level: 'info',
        source: 'alert:stress',
        message: `Stress returned below high threshold (${stressNow}/100).`,
      });
    }
    prevStressHighRef.current = sHigh;

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
  }, [appendAlertLog, glucoseNow, heartRateNow, stressNow]);
  const toggleDashboardValueDrift = (key: keyof DashboardValueDriftToggles) => {
    setDemoDashboardValueDrift((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleAllDemoTools = () => {
    const next = !allDemoToolsEnabled;
    setDemoScoreDriftEnabled(next);
    setDemoDashboardValueDrift({
      glucose: next,
      stress: next,
      heartRateCard: next,
      steps: next,
      sleep: next,
      meds: next,
      water: next,
    });
  };
  const openInsightFromDashboard = useCallback((tab: InsightTab) => {
    setInsightDetailReturnTab('Dashboard');
    setActiveTab('Insights');
    setActiveInsightTab(tab);
  }, []);

  const openInsightFromInsightsHub = useCallback((tab: InsightTab) => {
    setInsightDetailReturnTab(null);
    setActiveInsightTab(tab);
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

  const handleMainNavPress = useCallback(
    (label: string) => {
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

  const dashboardMetrics = [
    {
      label: 'GLUCOSE' as const,
      insightTab: DASHBOARD_METRIC_INSIGHT_TAB.GLUCOSE,
      value: Math.round(glucoseValue).toString(),
      unit: 'MG/DL',
      status: glucoseValue >= 170 ? 'HIGH' : glucoseValue <= 85 ? 'LOW' : 'NORMAL',
      statusColor: glucoseValue >= 170 ? '#ef4444' : glucoseValue <= 85 ? '#f59e0b' : '#7CB89B',
    },
    {
      label: 'STRESS LEVEL' as const,
      insightTab: DASHBOARD_METRIC_INSIGHT_TAB['STRESS LEVEL'],
      value: Math.round(stressValue).toString(),
      unit: '/100',
      status: stressValue >= 70 ? 'HIGH' : stressValue <= 35 ? 'LOW' : 'NORMAL',
      statusColor: stressValue >= 70 ? '#f97316' : stressValue <= 35 ? '#7DA2C7' : '#7CB89B',
    },
    {
      label: 'HEART RATE' as const,
      insightTab: DASHBOARD_METRIC_INSIGHT_TAB['HEART RATE'],
      value: Math.round(heartRateCardValue).toString(),
      unit: 'BPM',
      status: heartRateCardValue >= 95 ? 'HIGH' : heartRateCardValue <= 52 ? 'LOW' : 'NORMAL',
      statusColor: heartRateCardValue >= 95 ? '#f59e0b' : heartRateCardValue <= 52 ? '#7DA2C7' : '#7CB89B',
    },
  ];
  /** Same HIGH bands as alert push content: glucose ≥170, stress ≥70, heart rate ≥95. */
  const advisorSlides = useMemo((): AdvisorSlide[] => {
    const slides: AdvisorSlide[] = [];
    if (glucoseNow >= 170 && !dismissedAdvisorSlideKeys.glucose) {
      slides.push({ key: 'glucose', message: 'Glucose is spiking. Need recommendations?' });
    }
    if (stressNow >= 70 && !dismissedAdvisorSlideKeys.stress) {
      slides.push({ key: 'stress', message: 'Stress is spiking. Need recommendations?' });
    }
    if (heartRateNow >= 95 && !dismissedAdvisorSlideKeys.heartRate) {
      slides.push({ key: 'heartRate', message: 'Heart rate is spiking. Need recommendations?' });
    }
    if (slides.length === 0) {
      slides.push({ key: 'steady', message: "You're doing great!" });
    }
    return slides;
  }, [dismissedAdvisorSlideKeys, glucoseNow, heartRateNow, stressNow]);

  const advisorSlideKeySignature = advisorSlides.map((s) => s.key).join('-');

  useEffect(() => {
    setDismissedAdvisorSlideKeys((prev) => {
      const next = { ...prev };
      if (glucoseNow < 170) {
        delete next.glucose;
      }
      if (stressNow < 70) {
        delete next.stress;
      }
      if (heartRateNow < 95) {
        delete next.heartRate;
      }
      const unchanged =
        !!next.glucose === !!prev.glucose && !!next.stress === !!prev.stress && !!next.heartRate === !!prev.heartRate;
      return unchanged ? prev : next;
    });
  }, [glucoseNow, heartRateNow, stressNow]);

  useEffect(() => {
    setAdvisorGalleryIndex(0);
  }, [advisorSlideKeySignature]);

  useEffect(() => {
    setAdvisorGalleryScrollX(0);
  }, [advisorSlideKeySignature, advisorGallerySlideWidth]);

  useEffect(() => {
    if (advisorSlideKeySignature === 'steady') {
      advisorSuggestionRequestRef.current += 1;
      setFoodSuggestionUnlocked(false);
      setFoodSuggestionKind(null);
      setFoodSuggestionBody('');
      setFoodSuggestionGenerating(false);
    }
  }, [advisorSlideKeySignature]);

  const advisorGalleryMaxScrollX = Math.max(0, (advisorSlides.length - 1) * advisorGallerySlideWidth);
  const advisorGalleryScrollNorm =
    advisorGalleryMaxScrollX <= 0 ? 0.5 : Math.min(1, Math.max(0, advisorGalleryScrollX / advisorGalleryMaxScrollX));
  const advisorGalleryLeftEdgeOpacity = 0.4 + 0.35 * (1 - advisorGalleryScrollNorm);
  const advisorGalleryRightEdgeOpacity = 0.4 + 0.35 * advisorGalleryScrollNorm;

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

  const needleRadians = angleForPct(healthScore);
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

  const discoveryPinsFromEvents = (events: CommunityEventItem[]): MapScreenPin[] =>
    events
      .filter(
        (e) =>
          typeof e.latitude === 'number' &&
          typeof e.longitude === 'number' &&
          Number.isFinite(e.latitude) &&
          Number.isFinite(e.longitude) &&
          e.latitude >= -90 &&
          e.latitude <= 90 &&
          e.longitude >= -180 &&
          e.longitude <= 180,
      )
      .map((e) => {
        const locationLine = (e.address ?? e.meta ?? '').trim();
        const venueLine = e.venue?.trim()
          ? locationLine
            ? `${e.venue.trim()} · ${locationLine}`
            : e.venue.trim()
          : locationLine || ' ';
        return {
          id: `evt-${e.id}`,
          latitude: e.latitude as number,
          longitude: e.longitude as number,
          title: (e.title && String(e.title).trim()) || 'Event',
          subtitle: venueLine || ' ',
          pinColor: '#0ea5e9',
          linkedEvent: e,
        };
      });
  const fixedMapPins: MapScreenPin[] = [
    {
      id: 'landmark-pauley-pavilion',
      latitude: 34.0703,
      longitude: -118.4468,
      title: 'Pauley Pavilion',
      subtitle: 'UCLA events and activity hub',
      pinColor: '#22c55e',
    },
  ];

  const mapRecommendations: MapScreenPin[] =
    mapCoords == null || activeMapLayer == null
      ? []
      : [...discoveryPinsFromEvents(mapDiscoveryEvents), ...fixedMapPins];
  const recenterMapToCurrentLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setMapLocationStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoords = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };
      setMapLocationStatus('granted');
      setMapCoords(nextCoords);
      mapViewRef.current?.animateToRegion(
        {
          latitude: nextCoords.lat,
          longitude: nextCoords.lon,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        500,
      );
    } catch {
      setMapLocationStatus('denied');
    }
  };
  const joinedCommunities = COMMUNITY_DISCOVERY.filter((community) => joinedCommunityNames.includes(community.name));
  const selectedJoinedCommunity = selectedJoinedCommunityName
    ? joinedCommunities.find((community) => community.name === selectedJoinedCommunityName) ?? null
    : null;
  const filteredCommunities = COMMUNITY_DISCOVERY.filter((community) => {
    const query = communitySearchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      community.name.toLowerCase().includes(query) ||
      community.city.toLowerCase().includes(query) ||
      community.members.toLowerCase().includes(query)
    );
  });
  const allChallenges = [...personalChallenges, ...GOALS_CHALLENGES];
  const filteredChallenges = allChallenges.filter((challenge) => {
    if (challengeFilter === 'All') {
      return true;
    }
    return challengeFilter === 'Personal' ? challenge.type === 'personal' : challenge.type === 'community';
  });
  const selectedInsightContent = activeInsightTab ? insightContentByTab[activeInsightTab] : null;
  const selectedCommunityShareLink = selectedJoinedCommunity
    ? `https://connectedwellness.app/community/${toShareSlug(selectedJoinedCommunity.name)}?invite=demo2026`
    : null;
  const displayedEvents = communityEventsByTab[eventsTab];
  const progressPostsForSelectedCommunity: ProgressBoardPost[] = selectedJoinedCommunity == null
    ? []
    : [
        ...(communityCustomPostsByName[selectedJoinedCommunity.name] ?? []),
        ...COMMUNITY_PROGRESS_POSTS.map((post) => ({
          id: `seed-${post.id}`,
          author: post.author,
          time: post.time,
          caption: post.caption,
          imageLabel: post.imageLabel,
          imageUrl: post.demoCoverUrl,
          mediaPublicId: null,
          mediaVariants: null,
          mediaType: 'image' as const,
          status: 'ready' as const,
          processingError: null,
        })),
      ];
  const filteredQuickMetricOptions = QUICK_ACTION_METRIC_OPTIONS.filter((metric) => {
    const query = quickMetricSearchQuery.trim().toLowerCase();
    if (!query) {
      return dashboardQuickMetrics.includes(metric);
    }
    return metric.toLowerCase().includes(query);
  });
  const toggleDashboardQuickMetric = (metric: InsightTab) => {
    setDashboardQuickMetrics((prev) => {
      if (prev.includes(metric)) {
        return prev.filter((m) => m !== metric);
      }
      if (prev.length < DASHBOARD_QUICK_ACTION_SLOTS) {
        return [...prev, metric];
      }
      return [...prev.slice(1), metric];
    });
  };

  const openInviteContacts = async () => {
    if (!selectedCommunityShareLink || !selectedJoinedCommunity) {
      return;
    }
    setLoadingInviteContacts(true);
    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      setLoadingInviteContacts(false);
      Alert.alert('Contacts permission required', 'Enable contacts access to invite people directly.');
      return;
    }
    const result = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const mapped: InviteContact[] = result.data.slice(0, 60).map((contact: Contacts.Contact, index: number) => ({
      id: `${contact.name ?? 'contact'}-${index}`,
      name: contact.name ?? 'Unknown Contact',
      phone: contact.phoneNumbers?.[0]?.number ?? null,
    }));
    setInviteContacts(mapped);
    setLoadingInviteContacts(false);
    setShowInvitePopup(true);
  };

  const createPersonalChallenge = () => {
    const title = newChallengeTitle.trim();
    const detail = newChallengeDetail.trim();
    if (!title || !detail) {
      Alert.alert('Missing details', 'Please add a title and details for your personal challenge.');
      return;
    }
    setPersonalChallenges((prev) => [{ title, detail, members: 'Personal', type: 'personal' }, ...prev]);
    setChallengeFilter('Personal');
    setNewChallengeTitle('');
    setNewChallengeDetail('');
    setShowCreatePersonalChallengeModal(false);
  };

  const pickProgressPostImage = async (source: 'library' | 'camera') => {
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            // iOS camera editing can crash on some native stacks; keep capture path stable.
            allowsEditing: false,
            quality: 0.86,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.86,
          });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      setCreatePostImageUri(result.assets[0].uri);
      setCreatePostCaption('');
      setShowCreateProgressPostModal(true);
    } catch (error) {
      Alert.alert('Camera error', toErrorText(error));
    }
  };

  const launchCreatePostFromSource = async (source: 'library' | 'camera') => {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Camera permission required', 'Enable camera access to take a photo for your post.');
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Photos permission required', 'Enable photo library access to add an image post.');
        return;
      }
    }
    // Defer presentation so iOS finishes dismissing the alert first.
    setTimeout(() => {
      pickProgressPostImage(source).catch((error) => {
        Alert.alert('Media picker error', toErrorText(error));
      });
    }, 250);
  };

  const openCreateProgressPostModal = async () => {
    if (!selectedJoinedCommunity) {
      Alert.alert('Select a community', 'Open a joined community before creating a post.');
      return;
    }
    Alert.alert('Create Post', 'Choose how you want to add a photo.', [
      {
        text: 'Take Photo',
        onPress: () => {
          launchCreatePostFromSource('camera').catch((error) => {
            Alert.alert('Camera error', toErrorText(error));
          });
        },
      },
      {
        text: 'Photo Library',
        onPress: () => {
          launchCreatePostFromSource('library').catch((error) => {
            Alert.alert('Photo library error', toErrorText(error));
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const updateCommunityPost = (communityName: string, postId: string, patch: Partial<ProgressBoardPost>) => {
    setCommunityCustomPostsByName((prev) => {
      const posts = prev[communityName] ?? [];
      return {
        ...prev,
        [communityName]: posts.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
      };
    });
  };

  const createProgressPost = async () => {
    if (!selectedJoinedCommunity || !createPostImageUri) {
      return;
    }
    const trimmedCaption = createPostCaption.trim();
    const resolvedCaption = trimmedCaption.length > 0 ? trimmedCaption : 'Shared a progress photo.';
    setIsPublishingProgressPost(true);
    const communityName = selectedJoinedCommunity.name;
    const localPostId = `local-${Date.now()}`;
    const optimisticPost: ProgressBoardPost = {
      id: localPostId,
      author: 'You',
      time: 'Just now',
      caption: resolvedCaption,
      imageLabel: 'Uploading progress photo...',
      imageUrl: createPostImageUri,
      mediaPublicId: null,
      mediaVariants: null,
      mediaType: 'image',
      status: 'processing',
      processingError: null,
    };
    setCommunityCustomPostsByName((prev) => ({
      ...prev,
      [communityName]: [optimisticPost, ...(prev[communityName] ?? [])],
    }));
    try {
      const localImageUri = createPostImageUri;
      const mediaVariants = {
        originalUrl: localImageUri,
        feedUrl: localImageUri,
        thumbUrl: localImageUri,
      };
      const preferredCoords = locationCoords ?? mapCoords;
      const aristaContext = preferredCoords
        ? await fetchAristaContext({
            lat: preferredCoords.lat,
            lon: preferredCoords.lon,
            timestamp: new Date().toISOString(),
            communityId: toShareSlug(communityName),
          })
        : null;
      const imageName =
        localImageUri.split('/').pop() ?? `post-${Date.now()}.jpg`;
      const imageHints = imageName
        .split(/[/_-]+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)
        .slice(0, 6);
      const heuristics = buildProgressPostHeuristics({
        caption: resolvedCaption,
        aristaContext,
        imageHints,
      });
      const postedCaption = buildProgressPostDisplayCaption(heuristics.autoDescription, heuristics.autoTags);
      const db = getFirestoreInstance();
      let firestoreWriteError: string | null = null;
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'progress_posts'), {
          communityId: toShareSlug(communityName),
          communityName,
          authorId: 'demo-user',
          authorName: 'You',
          caption: resolvedCaption,
          mediaUrl: localImageUri,
          mediaPublicId: null,
          mediaVariants,
          mediaType: 'image',
          status: 'processing',
          eventContext: aristaContext?.event ?? null,
          resourceContext: aristaContext?.resources ?? [],
          sourceMeta: aristaContext?.sourceMeta ?? null,
          autoDescription: '',
          autoTags: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
          await updateDoc(docRef, {
            status: 'ready',
            caption: postedCaption,
            autoDescription: heuristics.autoDescription,
            autoTags: heuristics.autoTags,
            eventContext: heuristics.useEventContext ? (aristaContext?.event ?? null) : null,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          firestoreWriteError = toErrorText(error);
        }
      }
      updateCommunityPost(communityName, localPostId, {
        caption: postedCaption,
        imageLabel: firestoreWriteError
          ? 'Saved metadata (image local)'
          : 'Uploaded progress photo',
        imageUrl: mediaVariants.feedUrl,
        mediaPublicId: null,
        mediaVariants,
        status: 'ready',
        processingError: firestoreWriteError,
      });
      setShowCreateProgressPostModal(false);
      setCreatePostCaption('');
      setCreatePostImageUri(null);
      if (!hasFirebaseConfig) {
        Alert.alert(
          'Local-only mode',
          'Photo stays on device. Add EXPO_PUBLIC_FIREBASE_* vars to also write Firestore records.',
        );
      }
    } catch (error) {
      updateCommunityPost(communityName, localPostId, {
        imageLabel: 'Upload failed',
        status: 'failed',
        processingError: toErrorText(error),
      });
      Alert.alert('Post upload failed', toErrorText(error));
    } finally {
      setIsPublishingProgressPost(false);
    }
  };

  const inviteContactBySms = async (contact: InviteContact) => {
    if (!selectedCommunityShareLink || !selectedJoinedCommunity) {
      return;
    }
    if (!contact.phone) {
      Alert.alert('No phone number', `${contact.name} does not have a phone number saved.`);
      return;
    }
    const message = encodeURIComponent(
      `Join me in ${selectedJoinedCommunity.name} on ${APP_DISPLAY_NAME}: ${selectedCommunityShareLink}`,
    );
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${contact.phone}${separator}body=${message}`;
    const canOpen = await Linking.canOpenURL(smsUrl);
    if (!canOpen) {
      Alert.alert('Unable to open messaging app', 'Please try again on a device with SMS support.');
      return;
    }
    await Linking.openURL(smsUrl);
  };

  const openEventLinkPrompt = (event: CommunityEventItem) => {
    if (!event.sourceUrl) {
      Alert.alert('No event link', 'This event does not have an external link yet.');
      return;
    }
    Alert.alert(
      'Open event link?',
      `Do you want to open ${event.title} in your browser?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => {
            void Linking.openURL(event.sourceUrl as string).catch(() => {
              Alert.alert('Unable to open link', 'Please try again in a moment.');
            });
          },
        },
      ],
    );
  };

  useEffect(() => {
    const loadCommunityEvents = async () => {
      if (!selectedJoinedCommunity || selectedCommunityAction !== 'Events') {
        return;
      }
      const preferredCoords = mapCoords ?? locationCoords ?? { lat: 34.0689, lon: -118.4452 };
      setLoadingCommunityEvents(true);
      const fetched = await fetchAristaCommunityEvents({
        lat: preferredCoords.lat,
        lon: preferredCoords.lon,
        communityId: toShareSlug(selectedJoinedCommunity.name),
        tab: eventsTab,
      });
      if (fetched && fetched.length > 0) {
        setCommunityEventsByTab((prev) => ({ ...prev, [eventsTab]: fetched }));
      }
      setLoadingCommunityEvents(false);
    };
    void loadCommunityEvents();
  }, [selectedJoinedCommunity, selectedCommunityAction, eventsTab, mapCoords, locationCoords]);

  useEffect(() => {
    if (activeTab !== 'Map') {
      setMapDiscoveryEvents([]);
      setMapDiscoveryEventsLoading(false);
      return;
    }
    if (mapCoords == null) {
      return;
    }
    if (!ARISTA_COMMUNITY_EVENTS_URL.trim()) {
      setMapDiscoveryEvents([]);
      return;
    }
    let cancelled = false;
    setMapDiscoveryEventsLoading(true);
    void (async () => {
      const fetched = await fetchAristaCommunityEvents({
        lat: mapCoords.lat,
        lon: mapCoords.lon,
        communityId: 'lahacks2026',
        tab: 'Upcoming',
      });
      if (cancelled) {
        return;
      }
      setMapDiscoveryEvents(Array.isArray(fetched) ? fetched : []);
      setMapDiscoveryEventsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, mapCoords]);

  const initHealthKitAsync = async (trendWindow: InsightTrendWindow = '7d') => {
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
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
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
      const mdLabel = (value: Date) => `${value.getMonth() + 1}/${value.getDate()}`;

      let bucketDates: Date[];
      let bucketLabels: string[];
      let extendedSampleStart: Date;
      if (trendWindow === '7d') {
        bucketDates = getLastNDaysFrom(dayStart, 7);
        bucketLabels = bucketDates.map(dayLabelShort);
        extendedSampleStart = new Date(bucketDates[0]);
        extendedSampleStart.setDate(extendedSampleStart.getDate() - 14);
      } else if (trendWindow === '30d') {
        bucketDates = getLastNDaysFrom(dayStart, 30);
        bucketLabels = bucketDates.map((d, i) => (i % 5 === 0 || i === bucketDates.length - 1 ? mdLabel(d) : '·'));
        extendedSampleStart = new Date(bucketDates[0]);
        extendedSampleStart.setDate(extendedSampleStart.getDate() - 5);
      } else {
        const yearStart = new Date(dayStart.getFullYear(), 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        bucketDates = [];
        const walk = new Date(yearStart);
        while (walk.getTime() <= dayStart.getTime()) {
          bucketDates.push(new Date(walk.getFullYear(), walk.getMonth(), walk.getDate()));
          walk.setDate(walk.getDate() + 1);
        }
        const labelStep = Math.max(1, Math.ceil(bucketDates.length / 14));
        bucketLabels = bucketDates.map((d, i) => (i % labelStep === 0 || i === bucketDates.length - 1 ? mdLabel(d) : '·'));
        extendedSampleStart = new Date(yearStart);
        extendedSampleStart.setDate(yearStart.getDate() - 10);
      }

      const toDayKey = (value: Date) => value.toISOString().slice(0, 10);
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
      let heartRatePrevious = 0;
      let stepCountValue = 0;
      let stepCountPrevious = 0;
      let sleepHours = 0;
      let sleepHoursPrevious = 0;
      let activeEnergyKcal = 0;
      let activeEnergyPrevious = 0;
      let mindfulSessions = 0;
      let mindfulSessionsPrevious = 0;
      const bucketLen = bucketDates.length;
      let heartRateTrendPoints = new Array(bucketLen).fill(0);
      let stepTrendPoints = new Array(bucketLen).fill(0);
      let sleepTrendPoints = new Array(bucketLen).fill(0);
      let activeEnergyTrendPoints = new Array(bucketLen).fill(0);
      let mindfulnessTrendPoints = new Array(bucketLen).fill(0);
      let restingHeartRateTrendPoints: number[];
      let hrvTrendPoints: number[];
      let respiratoryTrendPoints: number[];
      let bloodOxygenTrendPoints: number[];
      let distanceTrendPoints: number[];
      let flightsTrendPoints: number[];
      let basalEnergyTrendPoints: number[];
      let exerciseTimeTrendPoints: number[];
      let standTimeTrendPoints: number[];
      let bodyTemperatureTrendPoints: number[];
      let weightTrendPoints: number[];
      let vo2MaxTrendPoints: number[];
      let bloodGlucoseTrendPoints: number[];

      if (healthKit.getLatestHeartRate) {
        await new Promise<void>((resolve) => {
          healthKit.getLatestHeartRate?.({}, (_error, result) => {
            heartRateValue = Math.round(result?.value ?? 0);
            resolve();
          });
        });
      }
      if (healthKit.getHeartRateSamples) {
        await new Promise<void>((resolve) => {
          healthKit.getHeartRateSamples?.(
            {
              startDate: extendedSampleStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const previousSamples = samples.filter((sample) => {
                const ts = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                return ts >= yesterdayStart.getTime() && ts < dayStart.getTime();
              });
              const vals = previousSamples.map((s) => s.value ?? 0).filter((v) => v > 0);
              if (vals.length > 0) {
                heartRatePrevious = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
              }
              const byDay = new Map<string, number[]>();
              samples.forEach((sample) => {
                const ts = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!ts || ts < bucketDates[0].getTime()) {
                  return;
                }
                const key = toDayKey(new Date(ts));
                const prev = byDay.get(key) ?? [];
                if ((sample.value ?? 0) > 0) {
                  prev.push(sample.value ?? 0);
                  byDay.set(key, prev);
                }
              });
              heartRateTrendPoints = bucketDates.map((d) => {
                const valsForDay = byDay.get(toDayKey(d)) ?? [];
                if (valsForDay.length === 0) {
                  return 0;
                }
                const avg = valsForDay.reduce((a, b) => a + b, 0) / valsForDay.length;
                return Math.round(avg);
              });
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
        await new Promise<void>((resolve) => {
          healthKit.getSleepSamples?.(
            {
              startDate: extendedSampleStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const samples = result ?? [];
              const sleepByDay = new Map<string, number>();
              samples.forEach((sample) => {
                const minutes = sleepSampleMinutes(sample);
                if (minutes <= 0) {
                  return;
                }
                const end = sample.endDate ? new Date(sample.endDate).getTime() : 0;
                const key = toDayKey(new Date(end));
                sleepByDay.set(key, (sleepByDay.get(key) ?? 0) + minutes);
              });
              sleepTrendPoints = bucketDates.map((d) => Number(((sleepByDay.get(toDayKey(d)) ?? 0) / 60).toFixed(1)));

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
              const recentNightMinutes = Math.max(
                sleepByDay.get(toDayKey(now)) ?? 0,
                sleepByDay.get(toDayKey(yesterdayForSleep)) ?? 0,
              );
              if (recentNightMinutes > 0) {
                setActivitySleepMinutes(Math.round(Math.min(recentNightMinutes, 9 * 60 + 59)));
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
      if (healthKit.getMindfulSession) {
        await new Promise<void>((resolve) => {
          healthKit.getMindfulSession?.(
            {
              startDate: extendedSampleStart.toISOString(),
              endDate: now.toISOString(),
            },
            (_error, result) => {
              const sessions = result ?? [];
              const byDay = new Map<string, number>();
              sessions.forEach((sample) => {
                const ts = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                if (!ts) {
                  return;
                }
                const key = toDayKey(new Date(ts));
                byDay.set(key, (byDay.get(key) ?? 0) + 1);
              });
              mindfulnessTrendPoints = bucketDates.map((d) => byDay.get(toDayKey(d)) ?? 0);
              mindfulSessions = sessions.filter((sample) => {
                const start = sample.startDate ? new Date(sample.startDate).getTime() : 0;
                return start >= weekStart.getTime();
              }).length;
              mindfulSessionsPrevious = sessions.length - mindfulSessions;
              resolve();
            },
          );
        });
      }

      const baseRange = {
        startDate: bucketDates[0].toISOString(),
        endDate: now.toISOString(),
      };

      [
        restingHeartRateTrendPoints,
        hrvTrendPoints,
        respiratoryTrendPoints,
        bloodOxygenTrendPoints,
        distanceTrendPoints,
        flightsTrendPoints,
        basalEnergyTrendPoints,
        exerciseTimeTrendPoints,
        standTimeTrendPoints,
        bodyTemperatureTrendPoints,
        weightTrendPoints,
        vo2MaxTrendPoints,
        bloodGlucoseTrendPoints,
      ] = await Promise.all([
        loadSeriesFromSamples(healthKit.getRestingHeartRateSamples, baseRange, 'avg'),
        loadSeriesFromSamples(healthKit.getHeartRateVariabilitySamples, baseRange, 'avg'),
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
        loadSeriesFromSamples(
          healthKit.getWeightSamples,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.pound ?? 'pound',
          },
          'avg',
        ),
        loadSeriesFromSamples(healthKit.getVo2MaxSamples, baseRange, 'avg'),
        loadSeriesFromSamples(
          healthKit.getBloodGlucoseSamples,
          {
            ...baseRange,
            unit: healthKit.Constants?.Units?.mgPerdL ?? 'mgPerdL',
          },
          'avg',
        ),
      ]);

      setInsightContentByTab({
        'Heart Rate': {
          title: 'Latest Heart Rate',
          summary: heartRateValue > 0 ? `${heartRateValue} bpm (latest sample from Apple Health)` : 'No recent heart rate sample found.',
          trend: formatTrend(heartRateValue, heartRatePrevious, ' bpm'),
          recommendation: 'Track heart rate daily for stronger baseline trends.',
          trendPoints: heartRateTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'bpm',
        },
        'Resting Heart Rate': {
          title: 'Resting Heart Rate',
          summary: latest(restingHeartRateTrendPoints) > 0
            ? `${latest(restingHeartRateTrendPoints)} bpm most recent day`
            : 'No resting heart-rate samples found.',
          trend: formatTrend(latest(restingHeartRateTrendPoints), previous(restingHeartRateTrendPoints), ' bpm'),
          recommendation: 'A lower, stable resting heart rate often reflects good recovery.',
          trendPoints: restingHeartRateTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'bpm',
        },
        'Heart Rate Variability': {
          title: 'Heart Rate Variability',
          summary: latest(hrvTrendPoints) > 0 ? `${latest(hrvTrendPoints)} ms recent average` : 'No HRV samples found.',
          trend: formatTrend(latest(hrvTrendPoints), previous(hrvTrendPoints), ' ms'),
          recommendation: 'Consistent sleep and stress management can improve HRV over time.',
          trendPoints: hrvTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'ms',
        },
        'Respiratory Rate': {
          title: 'Respiratory Rate',
          summary: latest(respiratoryTrendPoints) > 0
            ? `${latest(respiratoryTrendPoints)} breaths/min recent average`
            : 'No respiratory-rate samples found.',
          trend: formatTrend(latest(respiratoryTrendPoints), previous(respiratoryTrendPoints), ' br/min'),
          recommendation: 'Watch for sustained shifts and pair with recovery signals.',
          trendPoints: respiratoryTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'br/min',
        },
        'Blood Oxygen': {
          title: 'Blood Oxygen',
          summary: latest(bloodOxygenTrendPoints) > 0 ? `${latest(bloodOxygenTrendPoints)}% recent average` : 'No blood-oxygen samples found.',
          trend: formatTrend(latest(bloodOxygenTrendPoints), previous(bloodOxygenTrendPoints), '%'),
          recommendation: 'Regular sleep and cardio activity can support oxygen efficiency.',
          trendPoints: bloodOxygenTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: '%',
        },
        Steps: {
          title: 'Today Steps',
          summary: `${stepCountValue.toLocaleString()} steps today from Apple Health`,
          trend: formatTrend(stepCountValue, stepCountPrevious, ' steps'),
          recommendation: 'Aim for short walking breaks to increase daily steps.',
          trendPoints: stepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'steps',
        },
        'Walking + Running Distance': {
          title: insightTabLabel('Walking + Running Distance'),
          summary: `${latest(distanceTrendPoints).toFixed(2)} mi today`,
          trend: formatTrend(latest(distanceTrendPoints), previous(distanceTrendPoints), ' mi'),
          recommendation: 'Steady distance growth usually follows small daily consistency.',
          trendPoints: distanceTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'mi',
        },
        'Flights Climbed': {
          title: 'Flights Climbed',
          summary: `${latest(flightsTrendPoints).toFixed(0)} floors climbed today`,
          trend: formatTrend(latest(flightsTrendPoints), previous(flightsTrendPoints), ' floors'),
          recommendation: 'Short stair sessions are an easy way to increase intensity.',
          trendPoints: flightsTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'floors',
        },
        Sleep: {
          title: 'Sleep Duration',
          summary: sleepHours > 0 ? `${sleepHours} avg hours/night over last 7 days` : 'No sleep samples found for the selected period.',
          trend: formatTrend(sleepHours, sleepHoursPrevious, 'h'),
          recommendation: 'Maintain consistent wind-down to improve sleep duration.',
          trendPoints: sleepTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'h',
        },
        'Active Energy': {
          title: 'Active Energy',
          summary: `${activeEnergyKcal} kcal burned today`,
          trend: formatTrend(activeEnergyKcal, activeEnergyPrevious, ' kcal'),
          recommendation: 'Add brief activity intervals to increase active energy burn.',
          trendPoints: activeEnergyTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'kcal',
        },
        'Basal Energy': {
          title: 'Basal Energy',
          summary: `${latest(basalEnergyTrendPoints).toFixed(0)} kcal most recent day`,
          trend: formatTrend(latest(basalEnergyTrendPoints), previous(basalEnergyTrendPoints), ' kcal'),
          recommendation: 'Basal energy reflects foundational metabolism and body needs.',
          trendPoints: basalEnergyTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'kcal',
        },
        'Exercise Time': {
          title: 'Exercise Time',
          summary: `${latest(exerciseTimeTrendPoints).toFixed(0)} active minutes today`,
          trend: formatTrend(latest(exerciseTimeTrendPoints), previous(exerciseTimeTrendPoints), ' min'),
          recommendation: 'Short exercise blocks compound well over a week.',
          trendPoints: exerciseTimeTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'min',
        },
        'Stand Time': {
          title: 'Stand Time',
          summary: `${latest(standTimeTrendPoints).toFixed(0)} stand minutes today`,
          trend: formatTrend(latest(standTimeTrendPoints), previous(standTimeTrendPoints), ' min'),
          recommendation: 'Break up sitting every hour to improve stand trends.',
          trendPoints: standTimeTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'min',
        },
        Mindfulness: {
          title: 'Mindful Sessions',
          summary: `${mindfulSessions} mindful session${mindfulSessions === 1 ? '' : 's'} in last 7 days`,
          trend: formatTrend(mindfulSessions, mindfulSessionsPrevious, ' sessions'),
          recommendation: 'A short daily mindful session can support stress recovery.',
          trendPoints: mindfulnessTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'sessions',
        },
        'Body Temperature': {
          title: 'Body Temperature',
          summary: latest(bodyTemperatureTrendPoints) > 0
            ? `${latest(bodyTemperatureTrendPoints)} degF recent average`
            : 'No body-temperature samples found.',
          trend: formatTrend(latest(bodyTemperatureTrendPoints), previous(bodyTemperatureTrendPoints), ' degF'),
          recommendation: 'Use trends, not single points, to interpret temperature changes.',
          trendPoints: bodyTemperatureTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'degF',
        },
        Weight: {
          title: 'Weight',
          summary: latest(weightTrendPoints) > 0 ? `${latest(weightTrendPoints)} lb recent value` : 'No weight samples found.',
          trend: formatTrend(latest(weightTrendPoints), previous(weightTrendPoints), ' lb'),
          recommendation: 'Weekly averages are more meaningful than daily fluctuations.',
          trendPoints: weightTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'lb',
        },
        'VO2 Max': {
          title: 'VO2 Max',
          summary: latest(vo2MaxTrendPoints) > 0 ? `${latest(vo2MaxTrendPoints)} mL/kg/min recent estimate` : 'No VO2 max samples found.',
          trend: formatTrend(latest(vo2MaxTrendPoints), previous(vo2MaxTrendPoints), ' mL/kg/min'),
          recommendation: 'Cardio consistency is key for meaningful VO2 max improvements.',
          trendPoints: vo2MaxTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'mL/kg/min',
        },
        'Blood Glucose': {
          title: 'Blood Glucose',
          summary: latest(bloodGlucoseTrendPoints) > 0 ? `${latest(bloodGlucoseTrendPoints)} mg/dL recent average` : 'No blood-glucose samples found.',
          trend: formatTrend(latest(bloodGlucoseTrendPoints), previous(bloodGlucoseTrendPoints), ' mg/dL'),
          recommendation: 'Pair glucose trends with meals and activity for context.',
          trendPoints: bloodGlucoseTrendPoints,
          trendLabels: bucketLabels,
          trendUnit: 'mg/dL',
        },
      });
      await setHealthKitLinked(true);
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

  useEffect(() => {
    if (startupPermissionsRequested) {
      return;
    }
    let cancelled = false;
    async function requestStartupPermissions() {
      setStartupPermissionsRequested(true);
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch {
        // Ignore startup permission failures; user can retry in feature flows.
      }
      try {
        await Contacts.requestPermissionsAsync();
      } catch {
        // Ignore startup permission failures; user can retry in feature flows.
      }
      if (Notifications?.requestPermissionsAsync) {
        try {
          await Notifications.requestPermissionsAsync();
        } catch {
          // Ignore startup permission failures; user can retry in feature flows.
        }
      }
      /** Apple Health is requested when the user opens Insights (see HealthKit auto-connect effect). */
    }
    void requestStartupPermissions();
    return () => {
      cancelled = true;
    };
  }, [startupPermissionsRequested]);

  /** iOS: request HealthKit in context (Insights tab), once per OS grant; reconnect silently on return visits. */
  useEffect(() => {
    if (activeTab !== 'Insights' || Platform.OS !== 'ios') {
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
          await initHealthKitAsync(insightTrendWindow);
        } finally {
          healthKitConnectInFlightRef.current = false;
        }
      })();
    });

    return () => {
      cancelled = true;
      interaction.cancel();
    };
  }, [activeTab, healthKitStatus, healthKitLoading, insightTrendWindow]);

  useEffect(() => {
    if (!useDeviceLocation) {
      setLocationStatus('off');
      setLocationCoords(null);
      return;
    }

    let cancelled = false;
    async function resolveDeviceLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (!cancelled) {
            setLocationStatus('denied');
            setLocationCoords(null);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setLocationStatus('granted');
          setLocationCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) {
          setLocationStatus('denied');
          setLocationCoords(null);
        }
      }
    }

    void resolveDeviceLocation();
    return () => {
      cancelled = true;
    };
  }, [useDeviceLocation]);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        const fallbackCoords = { lat: 34.0689, lon: -118.4452 };
        const coords = useDeviceLocation && locationCoords ? locationCoords : fallbackCoords;
        const snapshot = await fetchCurrentWeather(coords.lat, coords.lon);
        if (!cancelled) {
          setWeatherF(snapshot.temperatureF);
          setWeatherLabel(snapshot.conditionLabel);
          setWeatherCode(snapshot.weatherCode);
        }
      } catch {
        // Keep existing fallback values on failure.
      }
    }
    void loadWeather();
    const refresh = setInterval(loadWeather, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, [useDeviceLocation, locationCoords]);

  useEffect(() => {
    const id = setInterval(() => {
      setHeaderDateClockTick((n) => n + 1);
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const anyDashboardDriftEnabled = Object.values(demoDashboardValueDrift).some(Boolean);
    const anyDemoDriftEnabled = demoScoreDriftEnabled || anyDashboardDriftEnabled;
    if (!anyDemoDriftEnabled) {
      return;
    }

    const intervalMs = demoFastDriftEnabled ? 380 : 760;
    const interval = setInterval(() => {
      const snapshot = getNextDriftSnapshot(demoDriftModelRef.current, demoFastDriftEnabled);

      if (demoScoreDriftEnabled) {
        setHealthScore(snapshot.score);
      }
      if (demoDashboardValueDrift.glucose) {
        setGlucoseValue(snapshot.glucose);
      }
      if (demoDashboardValueDrift.stress) {
        setStressValue(snapshot.stress);
      }
      if (demoDashboardValueDrift.heartRateCard) {
        setHeartRateCardValue(snapshot.heartRate);
      }
      if (demoDashboardValueDrift.steps) {
        setActivitySteps((prev) => clamp(prev + snapshot.stepDelta, 0, 25000));
      }
      if (demoDashboardValueDrift.sleep) {
        setActivitySleepMinutes(snapshot.sleepMinutes);
      }
      if (demoDashboardValueDrift.meds) {
        setActivityMedsTaken(snapshot.meds);
      }
      if (demoDashboardValueDrift.water) {
        setActivityWaterGlasses(snapshot.water);
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [demoScoreDriftEnabled, demoDashboardValueDrift, demoFastDriftEnabled]);

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
    const wasEnabled = previousAlertDemoEnabledRef.current;
    previousAlertDemoEnabledRef.current = demoAlertEnabled;
    if (!demoAlertEnabled || wasEnabled) {
      return;
    }
    async function sendAlertDemoNotifications() {
      if (
        !Notifications?.getPermissionsAsync ||
        !Notifications?.requestPermissionsAsync ||
        !Notifications?.scheduleNotificationAsync ||
        !Notifications?.SchedulableTriggerInputTypes
      ) {
        return;
      }
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) {
          const asked = await Notifications.requestPermissionsAsync();
          if (!asked.granted) {
            return;
          }
        }
        const pushAlerts = highAlertCandidates.filter(isDefined);
        if (pushAlerts.length === 0) {
          appendAlertLog({
            level: 'info',
            source: 'demo-alerts',
            message: 'Demo alerts enabled: no active high alerts to schedule as local notifications.',
          });
        } else {
          appendAlertLog({
            level: 'info',
            source: 'demo-alerts',
            message: `Demo alerts enabled: scheduling ${pushAlerts.length} local notification(s).`,
          });
        }
        for (let i = 0; i < pushAlerts.length; i += 1) {
          const alert = pushAlerts[i];
          await Notifications.scheduleNotificationAsync({
            content: {
              title: alert.title,
              body: alert.detail,
              sound: 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: i + 1,
              repeats: false,
            },
          });
          appendAlertLog({
            level: 'info',
            source: 'demo-push',
            message: `Scheduled push: ${alert.title} — ${alert.detail}`,
          });
        }
      } catch {
        // Ignore notification failures in demo mode.
      }
    }
    void sendAlertDemoNotifications();
  }, [appendAlertLog, demoAlertEnabled, highAlertCandidates]);

  useEffect(() => {
    if (activeTab !== 'Map') {
      return;
    }
    let cancelled = false;
    async function loadMapLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (!cancelled) {
            setMapLocationStatus('denied');
            setMapCoords(null);
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setMapLocationStatus('granted');
          setMapCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        }
      } catch {
        if (!cancelled) {
          setMapLocationStatus('denied');
          setMapCoords(null);
        }
      }
    }
    void loadMapLocation();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Goals') {
      setGoalsTab('Communities');
    }
  }, [activeTab]);

  useEffect(() => {
    if (goalsTab !== 'Active') {
      setSelectedJoinedCommunityName(null);
    }
  }, [goalsTab]);

  useEffect(() => {
    if (selectedJoinedCommunityName == null) {
      setSelectedCommunityAction('Progress Board');
      setEventsTab('Upcoming');
      setIsInteractingWithEventsList(false);
      setShowOverviewPopup(false);
      setShowInvitePopup(false);
    }
  }, [selectedJoinedCommunityName]);

  useEffect(() => {
    suppressStarredGalleryLayoutScrollRef.current = false;
    if (dashboardQuickMetrics.length === 0) {
      setStarredGalleryIndex(0);
      return;
    }
    setStarredGalleryIndex((i) => Math.min(i, dashboardQuickMetrics.length - 1));
  }, [dashboardQuickMetrics]);

  useLayoutEffect(() => {
    if (dashboardQuickMetrics.length === 0 || starredGalleryPageWidth <= 0) {
      return;
    }
    if (suppressStarredGalleryLayoutScrollRef.current) {
      return;
    }
    const n = dashboardQuickMetrics.length;
    const w = starredGalleryPageWidth;
    const loop = n > 1;
    const x = loop ? (starredGalleryIndex + 1) * w : starredGalleryIndex * w;
    const animated = starredGalleryNextScrollAnimatedRef.current;
    starredGalleryNextScrollAnimatedRef.current = false;
    starredGalleryScrollRef.current?.scrollTo({ x, animated });
  }, [dashboardQuickMetrics, starredGalleryIndex, starredGalleryPageWidth]);

  useEffect(() => {
    if (activeTab !== 'Insights' || activeInsightTab !== null) {
      return;
    }
    if (dashboardQuickMetrics.length <= 1) {
      return;
    }
    const intervalMs = 9000;
    const id = setInterval(() => {
      if (Date.now() < starredGallerySuppressAutoUntilRef.current) {
        return;
      }
      starredGalleryNextScrollAnimatedRef.current = true;
      suppressStarredGalleryLayoutScrollRef.current = false;
      setStarredGalleryIndex((i) => (i + 1) % dashboardQuickMetrics.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [activeTab, activeInsightTab, dashboardQuickMetrics]);

  useEffect(() => {
    if (activeTab !== 'Insights') {
      starredGalleryUserDraggingRef.current = false;
    }
  }, [activeTab]);

  return (
    <View style={mergePaletteLayer(layers, 'container', styles.container)}>
      <View style={mergePaletteLayer(layers, 'gridOverlay', styles.gridOverlay)} />
      <View style={mergePaletteLayer(layers, 'topGlow', styles.topGlow)} />
      <StatusBar style={theme?.isLight ? 'dark' : 'light'} />
      <View style={{ flex: 1, backgroundColor: canvasBg }}>
        {/* Dashboard stays mounted so local assets (e.g. chanmoji) are not torn down on every tab switch. */}
                      <View
          collapsable={false}
          pointerEvents={activeTab === 'Dashboard' ? 'auto' : 'none'}
                                      style={[
            mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer),
            {
              opacity: activeTab === 'Dashboard' ? 1 : 0,
              zIndex: activeTab === 'Dashboard' ? 2 : 0,
            },
          ]}
        >
        <>
        <ScrollView
          bounces={false}
          style={{ flex: 1, backgroundColor: canvasBg }}
          contentContainerStyle={mergePaletteLayer(layers, 'content', styles.content)}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 14, right: 14, left: 14, bottom: 6 }}
            onPress={() => setShowAlertsScreen(true)}
            style={styles.alertBlock}
          >
            <View style={styles.alertIconWrap}>
              <Svg height={28} pointerEvents="none" viewBox="0 0 48 32" width={40}>
                <Path
                  d="M9 8h4l3-3h16l3 3h4l3 4v11l-3 3h-4l-2 2H15l-2-2H9l-3-3V12l3-4zm7 4c-4 0-7 3-7 7s3 7 7 7h16c4 0 7-3 7-7s-3-7-7-7H16zm7 2h6v3h-6v-3z"
                  fill="none"
                  stroke={svgAlertBellStroke}
                  strokeWidth={2.2}
                />
              </Svg>
              {alertCount > 0 ? (
                <Animated.View
                  style={[
                    mergePaletteLayer(layers, 'alertBadge', styles.alertBadge),
                    {
                      transform: [
                        {
                          translateY: alertBadgeBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -10],
                          }),
                        },
                        {
                          scale: alertBadgeBounceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.22],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.alertBadgeText}>{alertCount}</Text>
                </Animated.View>
              ) : null}
            </View>
            <Text style={mergePaletteLayer(layers, 'alertText', styles.alertText)}>
              {alertCount > 0 ? `${alertCount} Alerts` : 'No alerts'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.headerLeft, { maxWidth: dashboardHeaderLeftMaxWidth }]}>
            <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.menuBtn}>
              <View style={mergePaletteLayer(layers, 'menuLine', styles.menuLine)} />
              <View style={mergePaletteLayer(layers, 'menuLine', styles.menuLine)} />
              <View style={mergePaletteLayer(layers, 'menuLine', styles.menuLine)} />
            </TouchableOpacity>
            <View style={styles.headerGreetingColumn}>
              <View style={styles.headerDateStack}>
                <Text
                  adjustsFontSizeToFit={Platform.OS === 'ios'}
                  ellipsizeMode="tail"
                  minimumFontScale={Platform.OS === 'ios' ? 0.85 : 1}
                  numberOfLines={1}
                  style={mergePaletteLayer(
                    layers,
                    'date',
                    styles.date,
                    styles.headerDateLine,
                    {
                      fontSize: dashboardHeaderDateTypography.datePrimaryFontSize,
                      lineHeight: dashboardHeaderDateTypography.datePrimaryLineHeight,
                    },
                  )}
                >
                  {dashboardHeaderDateLines.fullDate}
                </Text>
                <Text
                  adjustsFontSizeToFit={Platform.OS === 'ios'}
                  ellipsizeMode="tail"
                  minimumFontScale={Platform.OS === 'ios' ? 0.9 : 1}
                  numberOfLines={1}
                  style={mergePaletteLayer(
                    layers,
                    'dateTimeSub',
                    styles.date,
                    styles.dateTimeSub,
                    styles.headerDateLine,
                    {
                      fontSize: dashboardHeaderDateTypography.dateSecondaryFontSize,
                      lineHeight: dashboardHeaderDateTypography.dateSecondaryLineHeight,
                    },
                  )}
                >
                  {dashboardHeaderDateLines.timePart}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.weatherBlock}>
            <View style={styles.weatherStack}>
              <View style={styles.weatherTopRow}>
                <WeatherIcon size={36} weatherCode={weatherCode} />
                <Text style={mergePaletteLayer(layers, 'weatherText', styles.weatherText)}>{weatherF}°F</Text>
              </View>
              <Text style={mergePaletteLayer(layers, 'weatherSubText', styles.weatherSubText)}>{weatherLabel}</Text>
            </View>
          </View>
        </View>
        <View style={styles.scoreCard}>
          <View style={styles.gaugeWrap}>
            <Svg height={236} viewBox="0 0 320 236" width="100%">
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
                  <Path d="M -40 22 C 0 22 22 22 44 22 C 68 22 84 19 102 14 C 114 10 120 8 126 8" fill="none" stroke={gaugeStrokeDim} strokeLinecap="round" strokeWidth={1.35} />
                  <Path d="M 194 8 C 200 8 206 10 218 14 C 236 19 252 22 276 22 C 298 22 320 22 360 22" fill="none" stroke={gaugeStrokeDim} strokeLinecap="round" strokeWidth={1.35} />
                  <Path d="M -36 38 C 8 38 30 38 50 38 C 74 38 92 34 110 30 C 120 26 126 24 132 24" fill="none" stroke={gaugeStrokeFaint} strokeLinecap="round" strokeWidth={1.05} />
                  <Path d="M 188 24 C 194 24 200 26 210 30 C 228 34 246 38 270 38 C 290 38 312 38 356 38" fill="none" stroke={gaugeStrokeFaint} strokeLinecap="round" strokeWidth={1.05} />
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
                  <SvgText fill={gaugeScaleLabelFill} fontSize="16" fontWeight="700" x={pointOnArc(118, 0).x + 8} y={pointOnArc(118, 0).y - 10}>
                    0
                  </SvgText>
                  <SvgText fill={gaugeScaleLabelFill} fontSize="16" fontWeight="700" textAnchor="end" x={pointOnArc(118, 100).x - 8} y={pointOnArc(118, 100).y - 10}>
                    100
                  </SvgText>
                </Svg>
              </View>
              <Animated.Text style={[styles.scoreHeart, { opacity: heartPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }), transform: [{ scale: heartPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] }) }] }]}>♥</Animated.Text>
              <Text style={mergePaletteLayer(layers, 'scoreLabel', styles.scoreLabel)}>HEALTH SCORE</Text>
              <View style={styles.scoreRow}>
                <Text style={mergePaletteLayer(layers, 'score', styles.score)}>{displayScore}</Text>
                <Text style={mergePaletteLayer(layers, 'scoreUnit', styles.scoreUnit)}>/100</Text>
              </View>
              <Text style={[styles.scoreState, scorePresentation.band === 'good' ? styles.scoreStateGood : scorePresentation.band === 'poor' ? styles.scoreStatePoor : null]}>{scorePresentation.label}</Text>
              <Text style={mergePaletteLayer(layers, 'scoreSub', styles.scoreSub)}>{scorePresentation.subtitle}</Text>
            </View>
            <View style={styles.grid}>
              {dashboardMetrics.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  accessibilityHint={`Opens ${insightTabLabel(item.insightTab)} in Insights`}
                  accessibilityLabel={`${item.label}, ${item.value} ${item.unit}, ${item.status}`}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  onPress={() => openInsightFromDashboard(item.insightTab)}
                  style={mergePaletteLayer(layers, 'glassCard', styles.glassCard)}
                >
                  <Text style={mergePaletteLayer(layers, 'metricLabel', styles.metricLabel)}>{item.label}</Text>
                  <View style={styles.metricValueRow}>
                    <Text style={mergePaletteLayer(layers, 'metricValue', styles.metricValue)}>{item.value}</Text>
                    <Text style={mergePaletteLayer(layers, 'metricUnit', styles.metricUnit)}>{item.unit}</Text>
                  </View>
                  <Text style={[styles.metricStatus, { color: item.statusColor }]}>{item.status}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.neuralAdvisorSection}>
              <View style={mergePaletteLayer(layers, 'neuralAdvisorDivider', styles.neuralAdvisorDivider)} />
              <View style={styles.neuralAdvisorInner}>
                <Text style={mergePaletteLayer(layers, 'neuralAdvisorBadge', styles.cardBadge)}>NEURAL AI ADVISOR</Text>
                <View style={styles.advisorCardBody}>
                  <Image fadeDuration={0} resizeMode="contain" source={require('../../assets/chanmoji.png')} style={styles.advisorImage} />
                  <View
                    style={styles.advisorContent}
                    onLayout={(e) => {
                      const w = Math.floor(e.nativeEvent.layout.width);
                      if (w > 1 && Math.abs(w - advisorGallerySlideWidth) > 2) {
                        setAdvisorGallerySlideWidth(w);
                      }
                    }}
                  >
                    <Text style={mergePaletteLayer(layers, 'cardTitle', styles.cardTitle)}>Mr. Chan</Text>
                    <View
                      style={styles.neuralAdvisorGalleryShell}
                      onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        if (width > 0 && height > 0) {
                          setAdvisorGalleryShellLayout((prev) =>
                            prev.w === width && prev.h === height ? prev : { w: width, h: height },
                          );
                        }
                      }}
                    >
                      {advisorGalleryShellLayout.w > 48 &&
                      advisorGalleryShellLayout.h > 0 &&
                      advisorSlides.length > 0 ? (
                        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                          <Svg height={advisorGalleryShellLayout.h} width={advisorGalleryShellLayout.w}>
                            <Defs>
                              <LinearGradient id={`${advisorGalleryEdgeGid}-L`} x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0" stopColor={advisorGalleryFadeDark} stopOpacity="0.34" />
                                <Stop offset="0.55" stopColor={advisorGalleryFadeDark} stopOpacity="0.1" />
                                <Stop offset="1" stopColor={advisorGalleryFadeDark} stopOpacity="0" />
                              </LinearGradient>
                              <LinearGradient id={`${advisorGalleryEdgeGid}-R`} x1="1" y1="0" x2="0" y2="0">
                                <Stop offset="0" stopColor={advisorGalleryFadeDark} stopOpacity="0.34" />
                                <Stop offset="0.55" stopColor={advisorGalleryFadeDark} stopOpacity="0.1" />
                                <Stop offset="1" stopColor={advisorGalleryFadeDark} stopOpacity="0" />
                              </LinearGradient>
                              <LinearGradient id={`${advisorGalleryEdgeGid}-HL`} x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0" stopColor={advisorGalleryHiStop} stopOpacity="0.07" />
                                <Stop offset="0.4" stopColor={advisorGalleryHiStop} stopOpacity="0.02" />
                                <Stop offset="1" stopColor={advisorGalleryHiStop} stopOpacity="0" />
                              </LinearGradient>
                              <LinearGradient id={`${advisorGalleryEdgeGid}-HR`} x1="1" y1="0" x2="0" y2="0">
                                <Stop offset="0" stopColor={advisorGalleryHiStop} stopOpacity="0.07" />
                                <Stop offset="0.4" stopColor={advisorGalleryHiStop} stopOpacity="0.02" />
                                <Stop offset="1" stopColor={advisorGalleryHiStop} stopOpacity="0" />
                              </LinearGradient>
                            </Defs>
                            <Rect
                              fill={`url(#${advisorGalleryEdgeGid}-L)`}
                              height={advisorGalleryShellLayout.h}
                              opacity={advisorGalleryLeftEdgeOpacity}
                              width={20}
                              x={0}
                              y={0}
                            />
                            <Rect
                              fill={`url(#${advisorGalleryEdgeGid}-HL)`}
                              height={advisorGalleryShellLayout.h}
                              opacity={advisorGalleryLeftEdgeOpacity * 0.85}
                              width={12}
                              x={0}
                              y={0}
                            />
                            <Rect
                              fill={`url(#${advisorGalleryEdgeGid}-R)`}
                              height={advisorGalleryShellLayout.h}
                              opacity={advisorGalleryRightEdgeOpacity}
                              width={20}
                              x={advisorGalleryShellLayout.w - 20}
                              y={0}
                            />
                            <Rect
                              fill={`url(#${advisorGalleryEdgeGid}-HR)`}
                              height={advisorGalleryShellLayout.h}
                              opacity={advisorGalleryRightEdgeOpacity * 0.85}
                              width={12}
                              x={advisorGalleryShellLayout.w - 12}
                              y={0}
                            />
            </Svg>
          </View>
                      ) : null}
                      <ScrollView
                        key={advisorSlideKeySignature}
                        decelerationRate="fast"
                        horizontal
                        nestedScrollEnabled
                        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                          const w = advisorGallerySlideWidth;
                          if (w <= 0) {
                            return;
                          }
                          const x = e.nativeEvent.contentOffset.x;
                          const next = Math.round(x / w);
                          const max = Math.max(0, advisorSlides.length - 1);
                          const clamped = Math.min(Math.max(0, next), max);
                          setAdvisorGalleryIndex(clamped);
                          setAdvisorGalleryScrollX(clamped * w);
                        }}
                        onScroll={(e) => {
                          setAdvisorGalleryScrollX(e.nativeEvent.contentOffset.x);
                        }}
                        pagingEnabled
                        removeClippedSubviews={false}
                        scrollEventThrottle={24}
                        showsHorizontalScrollIndicator={false}
                        style={styles.neuralAdvisorGalleryScroll}
                      >
                        {advisorSlides.map((slide) => (
                          <View
                            key={slide.key}
            style={[
                              styles.advisorGallerySlide,
                              slide.key === 'steady' && styles.advisorGallerySlideSteadyOnly,
                              { width: advisorGallerySlideWidth },
                            ]}
                          >
          <Text
            style={[
              mergePaletteLayer(layers, 'advisorGallerySlideText', styles.advisorGallerySlideText),
              slide.key === 'steady' && mergePaletteLayer(layers, 'advisorGallerySlideTextSteady', styles.advisorGallerySlideTextSteady),
            ]}
          >
                              {slide.message}
          </Text>
                            {slide.key !== 'steady' ? (
                              <View style={styles.advisorGalleryBtnRow}>
                                <TouchableOpacity
                                  onPress={() => {
                                    const k = slide.key;
                                    if (k === 'steady') return;
                                    const req = (advisorSuggestionRequestRef.current += 1);
                                    setFoodSuggestionKind(k);
                                    setFoodSuggestionUnlocked(true);
                                    setFoodSuggestionGenerating(true);
                                    setFoodSuggestionBody('');
                                    void generateAdvisorSuggestionBody({
                                      metric: k,
                                      stressValue: stressNow,
                                      glucoseValue: glucoseNow,
                                      heartRateValue: heartRateNow,
                                    }).then((result) => {
                                      if (advisorSuggestionRequestRef.current !== req) {
                                        return;
                                      }
                                      setFoodSuggestionBody(result.body);
                                      setFoodSuggestionGenerating(false);
                                    });
                                  }}
                                  style={mergePaletteLayer(layers, 'advisorGalleryPrimaryBtn', styles.advisorGalleryPrimaryBtn)}
                                >
                                  <Text style={mergePaletteLayer(layers, 'advisorGalleryPrimaryBtnText', styles.advisorGalleryPrimaryBtnText)}>
                                    Suggestions
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => {
                                    const k = slide.key as AdvisorAlertSlideKey;
                                    appendAlertLog({
                                      level: 'info',
                                      source: `alert:${k}`,
                                      message: `${ADVISOR_ALERT_LABEL[k]} alert dismissed (Not now).`,
                                    });
                                    setDismissedAdvisorSlideKeys((prev) => ({ ...prev, [slide.key]: true }));
                                  }}
                                  style={mergePaletteLayer(layers, 'advisorGallerySecondaryBtn', styles.advisorGallerySecondaryBtn)}
                                >
                                  <Text style={mergePaletteLayer(layers, 'advisorGallerySecondaryBtnText', styles.advisorGallerySecondaryBtnText)}>
                                    Not Now
                                  </Text>
                                </TouchableOpacity>
        </View>
                            ) : null}
              </View>
                        ))}
                      </ScrollView>
                      {advisorGalleryShellLayout.w > 48 && advisorGalleryShellLayout.h > 0 ? (
                        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                          <Svg height={advisorGalleryShellLayout.h} width={advisorGalleryShellLayout.w}>
                            <Defs>
                              <LinearGradient id={`${advisorGalleryEdgeGid}-TF-L`} x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0" stopColor={advisorGalleryTopFade} stopOpacity="1" />
                                <Stop offset="0.38" stopColor={advisorGalleryTopFade} stopOpacity="0.45" />
                                <Stop offset="1" stopColor={advisorGalleryTopFade} stopOpacity="0" />
                              </LinearGradient>
                              <LinearGradient id={`${advisorGalleryEdgeGid}-TF-R`} x1="1" y1="0" x2="0" y2="0">
                                <Stop offset="0" stopColor={advisorGalleryTopFade} stopOpacity="1" />
                                <Stop offset="0.38" stopColor={advisorGalleryTopFade} stopOpacity="0.45" />
                                <Stop offset="1" stopColor={advisorGalleryTopFade} stopOpacity="0" />
                              </LinearGradient>
                            </Defs>
                            <Rect
                              fill={`url(#${advisorGalleryEdgeGid}-TF-L)`}
                              height={advisorGalleryShellLayout.h}
                              width={36}
                              x={0}
                              y={0}
                            />
                            <Rect
                              fill={`url(#${advisorGalleryEdgeGid}-TF-R)`}
                              height={advisorGalleryShellLayout.h}
                              width={36}
                              x={advisorGalleryShellLayout.w - 36}
                              y={0}
                            />
                          </Svg>
            </View>
                      ) : null}
                    </View>
                    {advisorSlides.length > 1 ? (
                      <View style={styles.advisorGalleryPagerDots}>
                        {advisorSlides.map((slide, idx) => (
                          <View
                            key={`advisor-gallery-dot-${slide.key}`}
                            style={[
                              mergePaletteLayer(layers, 'advisorGalleryPagerDot', styles.advisorGalleryPagerDot),
                              idx === advisorGalleryIndex && mergePaletteLayer(layers, 'advisorGalleryPagerDotActive', styles.advisorGalleryPagerDotActive),
                            ]}
                          />
          ))}
        </View>
                    ) : null}
          </View>
        </View>
              </View>
              <View style={mergePaletteLayer(layers, 'neuralAdvisorDivider', styles.neuralAdvisorDivider)} />
            </View>
            {foodSuggestionUnlocked && foodSuggestionKind ? (
        <View
          style={[
            mergePaletteLayer(layers, 'glassCardLarge', styles.glassCardLarge),
            mergePaletteLayer(layers, 'foodCard', styles.foodCard),
          ]}
        >
          <View style={styles.foodCardHeader}>
                  <Text style={mergePaletteLayer(layers, 'cardBadge', styles.cardBadge)}>
                    {SUGGESTION_CARD_BY_METRIC[foodSuggestionKind].badge}
                  </Text>
                  <TouchableOpacity
                    accessibilityLabel="Dismiss suggestion"
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      advisorSuggestionRequestRef.current += 1;
                      setFoodSuggestionUnlocked(false);
                      setFoodSuggestionKind(null);
                      setFoodSuggestionBody('');
                      setFoodSuggestionGenerating(false);
                    }}
                    style={mergePaletteLayer(layers, 'foodToggleBtn', styles.foodToggleBtn)}
                  >
                    <Text style={mergePaletteLayer(layers, 'foodToggleGlyph', styles.foodToggleGlyph)}>×</Text>
            </TouchableOpacity>
          </View>
                <View style={styles.foodCardBodyRow}>
                  <View style={styles.foodCardBodyText}>
                    {foodSuggestionGenerating ? (
                      <View style={styles.foodCardGeneratingRow}>
                        <ActivityIndicator color={theme?.textMuted ?? '#a1a1aa'} size="small" />
                        <Text style={mergePaletteLayer(layers, 'cardText', styles.cardText, styles.foodCardGeneratingLabel)}>
                          Generating a personalized tip on-edge…
                        </Text>
                      </View>
                    ) : (
                      <Text style={mergePaletteLayer(layers, 'cardText', styles.cardText)}>{foodSuggestionBody}</Text>
                    )}
                  </View>
                  {foodSuggestionGenerating ? null : (
                    <TouchableOpacity
                      accessibilityHint="Opens the matching metric in Insights"
                      accessibilityLabel={`${SUGGESTION_CARD_BY_METRIC[foodSuggestionKind].cta} for ${SUGGESTION_CARD_BY_METRIC[foodSuggestionKind].badge}`}
                      accessibilityRole="button"
                      onPress={() => openInsightFromDashboard(ADVISOR_VIEW_OPTIONS_INSIGHT_TAB[foodSuggestionKind])}
                      style={mergePaletteLayer(layers, 'foodBtn', styles.foodBtn)}
                    >
                      <Text style={mergePaletteLayer(layers, 'foodBtnText', styles.foodBtnText)}>
                        {SUGGESTION_CARD_BY_METRIC[foodSuggestionKind].cta}
                      </Text>
              </TouchableOpacity>
                  )}
        </View>
              </View>
            ) : null}
        <Text style={mergePaletteLayer(layers, 'sectionLabel', styles.sectionLabel)}>QUICK ACTIONS</Text>
            <DashboardQuickActionMetricsRow metrics={dashboardQuickMetrics} onMetricPress={openInsightFromDashboard} onReorder={setDashboardQuickMetrics} />
          </ScrollView>
        </>
        </View>
        {activeTab === 'Map' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), { zIndex: 2 }]}>
            <MapScreen
              activeMapLayer={activeMapLayer}
              mapCoords={mapCoords}
              mapDiscoveryEventsLoading={mapDiscoveryEventsLoading}
              mapLocationStatus={mapLocationStatus}
              mapRecommendations={mapRecommendations}
              mapViewRef={mapViewRef}
              openEventLinkPrompt={openEventLinkPrompt}
              recenterMapToCurrentLocation={recenterMapToCurrentLocation}
              setActiveMapLayer={setActiveMapLayer}
            />
          </View>
        ) : null}
        {activeTab === 'Insights' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), { zIndex: 2 }]}>
            <InsightsScreen
              activeInsightTab={activeInsightTab}
              dashboardQuickMetrics={dashboardQuickMetrics}
              expandedInsightGroups={expandedInsightGroups}
              filteredQuickMetricOptions={filteredQuickMetricOptions}
              healthKitLastError={healthKitLastError}
              healthKitLoading={healthKitLoading}
              healthKitStatus={healthKitStatus}
              initHealthKitAsync={initHealthKitAsync}
              insightContentByTab={insightContentByTab}
              insightTrendWindow={insightTrendWindow}
              insightsGalleryScrollPages={insightsGalleryScrollPages}
              onInsightsGalleryMomentumEnd={onInsightsGalleryMomentumEnd}
              onInsightsGalleryScroll={onInsightsGalleryScroll}
              onInsightTrendWindowChange={(next: InsightTrendWindow) => {
                setInsightTrendWindow(next);
                if (healthKitStatus === 'ready' && !healthKitLoading) {
                  void initHealthKitAsync(next);
                }
              }}
              quickMetricSearchQuery={quickMetricSearchQuery}
              selectedInsightContent={selectedInsightContent}
              onInsightDetailBack={handleInsightDetailBack}
              onOpenInsightTab={openInsightFromInsightsHub}
              setExpandedInsightGroups={setExpandedInsightGroups}
              setHealthKitStatus={setHealthKitStatus}
              setQuickMetricSearchQuery={setQuickMetricSearchQuery}
              setStarredGalleryIndex={setStarredGalleryIndex}
              starredGalleryIndex={starredGalleryIndex}
              starredGalleryPageWidth={starredGalleryPageWidth}
              starredGalleryScrollRef={starredGalleryScrollRef}
              starredGallerySuppressAutoUntilRef={starredGallerySuppressAutoUntilRef}
              starredGalleryUserDraggingRef={starredGalleryUserDraggingRef}
              suppressStarredGalleryLayoutScrollRef={suppressStarredGalleryLayoutScrollRef}
              toggleDashboardQuickMetric={toggleDashboardQuickMetric}
            />
                </View>
        ) : null}
        {activeTab === 'Goals' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), { zIndex: 2 }]}>
            <GoalsScreen
              challengeFilter={challengeFilter}
              communitySearchQuery={communitySearchQuery}
              displayedEvents={displayedEvents}
              eventsTab={eventsTab}
              filteredChallenges={filteredChallenges}
              filteredCommunities={filteredCommunities}
              goalsTab={goalsTab}
              inviteContactBySms={inviteContactBySms}
              inviteContacts={inviteContacts}
              isInteractingWithEventsList={isInteractingWithEventsList}
              joinedCommunities={joinedCommunities}
              joinedCommunityNames={joinedCommunityNames}
              loadingCommunityEvents={loadingCommunityEvents}
              loadingInviteContacts={loadingInviteContacts}
              openCreateProgressPostModal={openCreateProgressPostModal}
              openEventLinkPrompt={openEventLinkPrompt}
              openInviteContacts={openInviteContacts}
              progressPostsForSelectedCommunity={progressPostsForSelectedCommunity}
              selectedCommunityAction={selectedCommunityAction}
              selectedCommunityShareLink={selectedCommunityShareLink}
              selectedJoinedCommunity={selectedJoinedCommunity}
              setChallengeFilter={setChallengeFilter}
              setCommunitySearchQuery={setCommunitySearchQuery}
              setEventsTab={setEventsTab}
              setGoalsTab={setGoalsTab}
              setIsInteractingWithEventsList={setIsInteractingWithEventsList}
              setJoinedCommunityNames={setJoinedCommunityNames}
              setSelectedCommunityAction={setSelectedCommunityAction}
              setSelectedJoinedCommunityName={setSelectedJoinedCommunityName}
              setShowCreatePersonalChallengeModal={setShowCreatePersonalChallengeModal}
              setShowInvitePopup={setShowInvitePopup}
              setShowOverviewPopup={setShowOverviewPopup}
              showInvitePopup={showInvitePopup}
              showOverviewPopup={showOverviewPopup}
            />
              </View>
        ) : null}
        {activeTab === 'Swipes' ? (
          <View collapsable={false} style={[mergePaletteLayer(layers, 'tabStackLayer', styles.tabStackLayer), { zIndex: 2 }]}>
            <SwipesScreen />
          </View>
        ) : null}
            </View>

      <View style={mergePaletteLayer(layers, 'bottomNav', styles.bottomNav)}>
        <Svg pointerEvents="none" style={styles.navDividerSvg} viewBox="0 0 390 18">
          <Path
            d="M0 14 C 14 14 22 8 34 2 L356 2 C 368 8 376 14 390 14"
            fill="none"
            stroke={svgNavDividerStroke}
            strokeLinecap="round"
            strokeWidth={1.2}
          />
        </Svg>
        {NAV_ITEMS.map((item: { label: string; icon: string }) => (
          <TouchableOpacity key={item.label} onPress={() => handleMainNavPress(item.label)} style={styles.navItem}>
            {item.label === 'Dashboard' && alertCount > 0 ? (
              <Animated.View
                style={[
                  mergePaletteLayer(layers, 'navAlertBadge', styles.navAlertBadge),
                  {
                    transform: [
                      {
                        translateY: alertBadgeBounceAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6],
                        }),
                      },
                      {
                        scale: alertBadgeBounceAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.16],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.navAlertBadgeText}>{alertCount}</Text>
              </Animated.View>
            ) : null}
            {item.label === 'Insights' ? (
              <InsightsBulbIcon active={activeTab === item.label} />
            ) : (
              <Text
                style={[
                  mergePaletteLayer(layers, 'navIcon', styles.navIcon),
                  activeTab === item.label && mergePaletteLayer(layers, 'navActive', styles.navActive),
                ]}
              >
                {item.icon}
              </Text>
            )}
            <Text
              style={[
                mergePaletteLayer(layers, 'navText', styles.navText),
                activeTab === item.label && mergePaletteLayer(layers, 'navActive', styles.navActive),
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showCreatePersonalChallengeModal}
        onRequestClose={() => setShowCreatePersonalChallengeModal(false)}
      >
        <Pressable onPress={() => setShowCreatePersonalChallengeModal(false)} style={mergePaletteLayer(layers, 'challengeModalBackdrop', styles.challengeModalBackdrop)}>
          <Pressable onPress={() => {}} style={mergePaletteLayer(layers, 'challengeModalCard', styles.challengeModalCard)}>
            <Text style={mergePaletteLayer(layers, 'challengeModalTitle', styles.challengeModalTitle)}>Create Personal Challenge</Text>
            <Text style={mergePaletteLayer(layers, 'challengeModalHint', styles.challengeModalHint)}>Add a challenge just for you.</Text>
            <TextInput
              onChangeText={setNewChallengeTitle}
              placeholder="Challenge title"
              placeholderTextColor={inputPlaceholderColor}
              style={mergePaletteLayer(layers, 'challengeInput', styles.challengeInput)}
              value={newChallengeTitle}
            />
            <TextInput
              multiline
              onChangeText={setNewChallengeDetail}
              placeholder="Challenge details"
              placeholderTextColor={inputPlaceholderColor}
              style={mergePaletteLayer(layers, 'challengeInput', styles.challengeInput, styles.challengeInputMultiline)}
              value={newChallengeDetail}
            />
            <View style={styles.challengeModalActions}>
              <TouchableOpacity onPress={() => setShowCreatePersonalChallengeModal(false)} style={mergePaletteLayer(layers, 'challengeModalCancelBtn', styles.challengeModalCancelBtn)}>
                <Text style={mergePaletteLayer(layers, 'challengeModalCancelText', styles.challengeModalCancelText)}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createPersonalChallenge} style={mergePaletteLayer(layers, 'challengeModalCreateBtn', styles.challengeModalCreateBtn)}>
                <Text style={mergePaletteLayer(layers, 'challengeModalCreateText', styles.challengeModalCreateText)}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={showCreateProgressPostModal}
        onRequestClose={() => setShowCreateProgressPostModal(false)}
      >
        <Pressable onPress={() => setShowCreateProgressPostModal(false)} style={mergePaletteLayer(layers, 'challengeModalBackdrop', styles.challengeModalBackdrop)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            style={styles.createPostKeyboardAvoiding}
          >
            <Pressable onPress={Keyboard.dismiss} style={mergePaletteLayer(layers, 'challengeModalCard', styles.challengeModalCard)}>
              <Text style={mergePaletteLayer(layers, 'challengeModalTitle', styles.challengeModalTitle)}>Create Progress Post</Text>
              <Text style={mergePaletteLayer(layers, 'challengeModalHint', styles.challengeModalHint)}>Upload a photo and caption your update.</Text>
              {createPostImageUri ? (
                <Image resizeMode="cover" source={{ uri: createPostImageUri }} style={styles.createPostPreviewImage} />
              ) : null}
              <TextInput
                multiline
                onChangeText={setCreatePostCaption}
                placeholder="What progress did you make today?"
                placeholderTextColor={inputPlaceholderColor}
                style={mergePaletteLayer(layers, 'challengeInput', styles.challengeInput, styles.challengeInputMultiline)}
                value={createPostCaption}
              />
              <View style={styles.challengeModalActions}>
                <TouchableOpacity
                  disabled={isPublishingProgressPost}
                  onPress={() => setShowCreateProgressPostModal(false)}
                  style={mergePaletteLayer(layers, 'challengeModalCancelBtn', styles.challengeModalCancelBtn)}
                >
                  <Text style={mergePaletteLayer(layers, 'challengeModalCancelText', styles.challengeModalCancelText)}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isPublishingProgressPost}
                  onPress={createProgressPost}
                  style={mergePaletteLayer(layers, 'challengeModalCreateBtn', styles.challengeModalCreateBtn)}
                >
                  <Text style={mergePaletteLayer(layers, 'challengeModalCreateText', styles.challengeModalCreateText)}>
                    {isPublishingProgressPost ? 'Publishing...' : 'Publish'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={showAlertsScreen}
        onRequestClose={() => setShowAlertsScreen(false)}
      >
        <View style={mergePaletteLayer(layers, 'alertsModalBackdrop', styles.alertsModalBackdrop)}>
          <View style={mergePaletteLayer(layers, 'alertsModalCard', styles.alertsModalCard)}>
            <View style={styles.alertsModalHeader}>
              <TouchableOpacity onPress={() => setShowAlertsScreen(false)} style={mergePaletteLayer(layers, 'alertsBackBtn', styles.alertsBackBtn)}>
                <Ionicons name="chevron-back" size={20} color={theme?.textPrimary ?? '#f8fafc'} />
              </TouchableOpacity>
              <View style={styles.alertsHeaderTextWrap}>
                <Text style={mergePaletteLayer(layers, 'alertsTitle', styles.alertsTitle)}>Alert logs</Text>
                <Text style={mergePaletteLayer(layers, 'alertsSubtitle', styles.alertsSubtitle)}>Session timeline</Text>
              </View>
            </View>
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
              <Text style={mergePaletteLayer(layers, 'sidebarItemText', styles.sidebarItemText)}>Profile</Text>
            </TouchableOpacity>
            <View style={mergePaletteLayer(layers, 'sidebarDivider', styles.sidebarDivider)} />
            <Text style={mergePaletteLayer(layers, 'sidebarSectionTitle', styles.sidebarSectionTitle)}>Color palette</Text>
            {DEMO_PALETTE_CHOICES.map((choice) => {
              const selected = paletteId === choice.id;
              return (
                <TouchableOpacity
                  key={choice.id}
                  onPress={() => setPaletteId(choice.id)}
                  style={mergePaletteLayer(
                    layers,
                    selected ? 'demoPaletteRowActive' : 'demoPaletteRow',
                    styles.demoPaletteRow,
                    selected ? styles.demoPaletteRowActive : null,
                  )}
                >
                  <Text style={mergePaletteLayer(layers, 'demoPaletteRowLabel', styles.demoPaletteRowLabel)}>{choice.label}</Text>
                  <View style={styles.demoPaletteSwatches}>
                    {choice.swatches ? (
                      choice.swatches.map((hex) => (
                        <View key={hex} style={[styles.demoPaletteSwatchDot, { backgroundColor: hex }]} />
                      ))
                    ) : (
                      <Text style={mergePaletteLayer(layers, 'demoPaletteRowHint', styles.demoPaletteRowHint)}>As designed</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={mergePaletteLayer(layers, 'sidebarDivider', styles.sidebarDivider)} />
            <Text style={mergePaletteLayer(layers, 'sidebarSectionTitle', styles.sidebarSectionTitle)}>Demo Tools</Text>
            <TouchableOpacity onPress={toggleAllDemoTools} style={styles.demoToggleRow}>
              <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>All Demo Tools</Text>
              <View style={styles.demoToggleRowRight}>
                <View
                  style={[
                    mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                    allDemoToolsEnabled && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                  ]}
                >
                  <Text
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                      allDemoToolsEnabled && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                    ]}
                  >
                    {allDemoToolsEnabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation?.();
                    setDemoToolsDropdownOpen((v) => !v);
                  }}
                  style={mergePaletteLayer(layers, 'demoDropdownBtn', styles.demoDropdownBtn)}
                >
                  <Text style={mergePaletteLayer(layers, 'demoDropdownText', styles.demoDropdownText)}>
                    {demoToolsDropdownOpen ? '▾' : '▸'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoFastDriftEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
              <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Fast Drift Mode</Text>
              <View
                style={[
                  mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                  demoFastDriftEnabled && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                ]}
              >
                <Text
                  style={[
                    mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                    demoFastDriftEnabled && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                  ]}
                >
                  {demoFastDriftEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDemoAlertEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
              <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Alert</Text>
              <View
                style={[
                  mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                  demoAlertEnabled && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                ]}
              >
                <Text
                  style={[
                    mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                    demoAlertEnabled && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                  ]}
                >
                  {demoAlertEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </TouchableOpacity>
            {demoToolsDropdownOpen ? (
              <View style={styles.demoDropdownList}>
                <TouchableOpacity onPress={() => setDemoScoreDriftEnabled((v: boolean) => !v)} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Live Health Score Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoScoreDriftEnabled && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoScoreDriftEnabled && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoScoreDriftEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('glucose')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Glucose Card Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.glucose && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.glucose && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.glucose ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('stress')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Stress Card Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.stress && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.stress && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.stress ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('heartRateCard')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Heart Rate Card Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.heartRateCard && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.heartRateCard && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.heartRateCard ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('steps')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Steps Activity Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.steps && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.steps && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.steps ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('sleep')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Sleep Activity Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.sleep && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.sleep && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.sleep ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('meds')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Meds Activity Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.meds && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.meds && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.meds ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleDashboardValueDrift('water')} style={styles.demoToggleRow}>
                  <Text style={mergePaletteLayer(layers, 'demoToggleLabel', styles.demoToggleLabel)}>Water Activity Drift</Text>
                  <View
                    style={[
                      mergePaletteLayer(layers, 'demoTogglePill', styles.demoTogglePill),
                      demoDashboardValueDrift.water && mergePaletteLayer(layers, 'demoTogglePillActive', styles.demoTogglePillActive),
                    ]}
                  >
                    <Text
                      style={[
                        mergePaletteLayer(layers, 'demoTogglePillText', styles.demoTogglePillText),
                        demoDashboardValueDrift.water && mergePaletteLayer(layers, 'demoTogglePillTextActive', styles.demoTogglePillTextActive),
                      ]}
                    >
                      {demoDashboardValueDrift.water ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => setSidebarOpen(false)} style={styles.sidebarScrim} />
        </View>
      ) : null}
    </View>
  );
}

