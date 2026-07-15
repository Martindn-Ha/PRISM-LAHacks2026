/** Insight tabs — passive Apple Health metrics only (no manual logging). */
import { formatInsightMetricFreshness } from '../lib/insightMetricFreshness';
import type { InsightMetricFreshness } from '../lib/insightMetricFreshness';
import { insightDisplayValue } from '../lib/insightTrendDisplay';

export const INSIGHTS_TABS = [
  'Heart Rate',
  'Resting Heart Rate',
  'Heart Rate Variability',
  'Walking Heart Rate',
  'Respiratory Rate',
  'Blood Oxygen',
  'Steps',
  'Walking + Running Distance',
  'Flights Climbed',
  'Active Energy',
  'Resting Energy',
  'Exercise Minutes',
  'Stand Minutes',
  'Cardio Fitness',
  'Workouts',
  'Sleep',
  'Deep Sleep',
  'REM Sleep',
  'Core Sleep',
  'Body Temperature',
  'Blood Glucose',
] as const;

export type InsightTab = (typeof INSIGHTS_TABS)[number];

/** Metrics that commonly stay empty without Apple Watch / CGM-specific sources. */
export const INSIGHT_METRICS_UNLIKELY_APPLE_HEALTH: readonly InsightTab[] = [
  'Heart Rate Variability',
  'Walking Heart Rate',
  'Blood Oxygen',
  'Respiratory Rate',
  'Exercise Minutes',
  'Stand Minutes',
  'Cardio Fitness',
  'Body Temperature',
] as const;

export function insightMetricHasAppleHealthData(content: InsightContent | undefined): boolean {
  return content?.trendPoints.some((point) => point > 0) ?? false;
}

export function isInsightMetricGreyedOut(
  tab: InsightTab,
  content: InsightContent | undefined,
  healthKitReady: boolean,
): boolean {
  if (!healthKitReady) {
    return false;
  }
  if (!INSIGHT_METRICS_UNLIKELY_APPLE_HEALTH.includes(tab)) {
    return false;
  }
  return !insightMetricHasAppleHealthData(content);
}

/** Dashboard vitals row → Insights detail tab. */
export const DASHBOARD_METRIC_INSIGHT_TAB = {
  GLUCOSE: 'Blood Glucose',
  SLEEP: 'Sleep',
  'HEART RATE': 'Heart Rate',
} as const satisfies Record<string, InsightTab>;

export type DashboardMetricLabel = keyof typeof DASHBOARD_METRIC_INSIGHT_TAB;

/** Swipeable chart gallery on Dashboard (matches the three vitals cards). */
export const DASHBOARD_GALLERY_METRICS: InsightTab[] = [
  DASHBOARD_METRIC_INSIGHT_TAB.GLUCOSE,
  DASHBOARD_METRIC_INSIGHT_TAB.SLEEP,
  DASHBOARD_METRIC_INSIGHT_TAB['HEART RATE'],
];

/** Compact labels for tight UI (dashboard quick actions, chips). */
export const INSIGHT_TAB_SHORT_LABEL: Partial<Record<InsightTab, string>> = {
  'Walking + Running Distance': 'Distance',
};

export function insightTabLabel(tab: InsightTab): string {
  return INSIGHT_TAB_SHORT_LABEL[tab] ?? tab;
}

/** Nested under the Heart Rate hub in Insights (not shown as separate grid tiles). */
export type InsightHubRow = {
  label: string;
  tab: InsightTab;
};

export type InsightHubSection = {
  title?: string;
  rows: InsightHubRow[];
};

export type InsightHubConfig = {
  rootTab: InsightTab;
  nestedTabs: InsightTab[];
  sections: InsightHubSection[];
};

export const INSIGHT_HUBS: InsightHubConfig[] = [
  {
    rootTab: 'Heart Rate',
    nestedTabs: ['Resting Heart Rate', 'Heart Rate Variability', 'Walking Heart Rate'],
    sections: [
      {
        title: 'At rest',
        rows: [
          { label: 'Latest', tab: 'Heart Rate' },
          { label: 'Resting', tab: 'Resting Heart Rate' },
          { label: 'HRV', tab: 'Heart Rate Variability' },
        ],
      },
      {
        title: 'During activity',
        rows: [{ label: 'Walking avg', tab: 'Walking Heart Rate' }],
      },
    ],
  },
  {
    rootTab: 'Blood Oxygen',
    nestedTabs: ['Respiratory Rate'],
    sections: [
      {
        rows: [
          { label: 'SpO₂', tab: 'Blood Oxygen' },
          { label: 'Breathing rate', tab: 'Respiratory Rate' },
        ],
      },
    ],
  },
  {
    rootTab: 'Steps',
    nestedTabs: ['Walking + Running Distance', 'Flights Climbed'],
    sections: [
      {
        rows: [
          { label: 'Steps', tab: 'Steps' },
          { label: 'Distance', tab: 'Walking + Running Distance' },
          { label: 'Floors', tab: 'Flights Climbed' },
        ],
      },
    ],
  },
  {
    rootTab: 'Active Energy',
    nestedTabs: ['Resting Energy'],
    sections: [
      {
        rows: [
          { label: 'Active', tab: 'Active Energy' },
          { label: 'Resting', tab: 'Resting Energy' },
        ],
      },
    ],
  },
  {
    rootTab: 'Exercise Minutes',
    nestedTabs: ['Stand Minutes'],
    sections: [
      {
        rows: [
          { label: 'Exercise', tab: 'Exercise Minutes' },
          { label: 'Stand', tab: 'Stand Minutes' },
        ],
      },
    ],
  },
  {
    rootTab: 'Workouts',
    nestedTabs: ['Cardio Fitness'],
    sections: [
      {
        rows: [
          { label: 'Today', tab: 'Workouts' },
          { label: 'VO₂ max', tab: 'Cardio Fitness' },
        ],
      },
    ],
  },
  {
    rootTab: 'Sleep',
    nestedTabs: ['Deep Sleep', 'REM Sleep', 'Core Sleep'],
    sections: [
      {
        title: 'Overview',
        rows: [{ label: 'Total', tab: 'Sleep' }],
      },
      {
        title: 'Stages',
        rows: [
          { label: 'Deep', tab: 'Deep Sleep' },
          { label: 'REM', tab: 'REM Sleep' },
          { label: 'Core', tab: 'Core Sleep' },
        ],
      },
    ],
  },
];

export function getInsightHubRoot(tab: InsightTab): InsightTab {
  for (const hub of INSIGHT_HUBS) {
    if (hub.rootTab === tab || hub.nestedTabs.includes(tab)) {
      return hub.rootTab;
    }
  }
  return tab;
}

export function getInsightHubConfig(tab: InsightTab): InsightHubConfig | undefined {
  const root = getInsightHubRoot(tab);
  return INSIGHT_HUBS.find((hub) => hub.rootTab === root);
}

export function isInsightHubRoot(tab: InsightTab): boolean {
  return INSIGHT_HUBS.some((hub) => hub.rootTab === tab);
}

/** Maps nested metrics to their hub detail screen. */
export function resolveInsightDetailTab(tab: InsightTab): InsightTab {
  return getInsightHubRoot(tab);
}

export type InsightMetricInfo = {
  whatItIs: string;
  howCollected: string;
};

/** Plain-language copy aligned with Apple Health metric names. */
export const INSIGHT_METRIC_INFO: Record<InsightTab, InsightMetricInfo> = {
  'Heart Rate': {
    whatItIs: 'Apple Health “Heart Rate” — beats per minute.',
    howCollected: 'Apple Watch sensors, or iPhone motion estimates.',
  },
  'Resting Heart Rate': {
    whatItIs: 'Apple Health “Resting Heart Rate” — bpm while calm and inactive.',
    howCollected: 'Apple Watch while you are still, often overnight.',
  },
  'Heart Rate Variability': {
    whatItIs: 'Apple Health “Heart Rate Variability” (HRV) in milliseconds.',
    howCollected: 'Apple Watch during sleep or quiet rest.',
  },
  'Walking Heart Rate': {
    whatItIs: 'Apple Health “Walking Heart Rate Average” — bpm while walking.',
    howCollected: 'Apple Watch during walks and daily movement.',
  },
  'Blood Oxygen': {
    whatItIs: 'Apple Health “Blood Oxygen” (SpO₂) as a percentage.',
    howCollected: 'Apple Watch blood oxygen readings when supported.',
  },
  'Respiratory Rate': {
    whatItIs: 'Apple Health “Respiratory Rate” — breaths per minute at rest.',
    howCollected: 'Apple Watch, often during sleep.',
  },
  Steps: {
    whatItIs: 'Apple Health “Steps” — daily step count.',
    howCollected: 'iPhone and/or Apple Watch motion sensors.',
  },
  'Walking + Running Distance': {
    whatItIs: 'Apple Health “Walking + Running Distance” in miles.',
    howCollected: 'GPS and motion from iPhone or Apple Watch.',
  },
  'Flights Climbed': {
    whatItIs: 'Apple Health “Flights Climbed” — floors of elevation gain.',
    howCollected: 'Barometer on iPhone or Apple Watch.',
  },
  'Active Energy': {
    whatItIs: 'Apple Health “Active Energy” — movement calories (kcal).',
    howCollected: 'Estimated by Apple from activity, heart rate, and your profile.',
  },
  'Resting Energy': {
    whatItIs: 'Apple Health “Resting Energy” — calories burned at rest (kcal).',
    howCollected: 'Estimated by Apple from age, sex, weight, and height.',
  },
  'Exercise Minutes': {
    whatItIs: 'Apple Health “Exercise Minutes” — Apple Watch Exercise ring time.',
    howCollected: 'Apple Watch during elevated heart rate and movement.',
  },
  'Stand Minutes': {
    whatItIs: 'Apple Health “Stand Minutes” — Apple Watch Stand ring time.',
    howCollected: 'Apple Watch when you stand and move within an hour.',
  },
  'Cardio Fitness': {
    whatItIs: 'Apple Health “Cardio Fitness” — VO₂ max estimate (mL/kg/min).',
    howCollected: 'Apple Watch from outdoor walks/runs with GPS and heart rate.',
  },
  Workouts: {
    whatItIs: 'Apple Health workouts — auto-detected or Watch-recorded sessions.',
    howCollected: 'Apple Watch and iPhone activity detection saved to Health.',
  },
  Sleep: {
    whatItIs: 'Apple Health “Sleep” — total time asleep, not time in bed awake.',
    howCollected: 'Apple Watch sleep tracking overnight.',
  },
  'Deep Sleep': {
    whatItIs: 'Apple Health deep sleep stage — restorative sleep time.',
    howCollected: 'Apple Watch sleep stage analysis overnight.',
  },
  'REM Sleep': {
    whatItIs: 'Apple Health REM sleep stage time.',
    howCollected: 'Apple Watch sleep stage analysis overnight.',
  },
  'Core Sleep': {
    whatItIs: 'Apple Health core/light sleep stage time.',
    howCollected: 'Apple Watch sleep stage analysis overnight.',
  },
  'Body Temperature': {
    whatItIs: 'Apple Health wrist temperature in °F (overnight trend).',
    howCollected: 'Apple Watch wrist temperature during sleep.',
  },
  'Blood Glucose': {
    whatItIs: 'Blood glucose in mg/dL from Dexcom Share or Apple Health.',
    howCollected: 'Dexcom Share (direct) when connected; Apple Health CGM sync as fallback.',
  },
};

export function insightMetricInfo(tab: InsightTab): InsightMetricInfo {
  return INSIGHT_METRIC_INFO[tab];
}

/** Short time-context label shown under the hero value on metric detail screens. */
export const INSIGHT_METRIC_TIME_CONTEXT: Partial<Record<InsightTab, string>> = {
  'Heart Rate': 'Latest reading',
  'Resting Heart Rate': 'Today avg',
  'Heart Rate Variability': 'Today avg',
  'Walking Heart Rate': 'Today avg',
  'Blood Oxygen': 'Today avg',
  'Respiratory Rate': 'Today avg',
  Sleep: 'Last recorded night',
  'Deep Sleep': 'Last recorded night',
  'REM Sleep': 'Last recorded night',
  'Core Sleep': 'Last recorded night',
  'Body Temperature': 'Today or last recorded',
  'Cardio Fitness': 'Today or last recorded',
  'Blood Glucose': 'Latest or today avg',
};

/** Apple Health–style chart per metric (day view vs week bars, etc.). */
export const INSIGHT_METRIC_CHART_STYLE: Partial<Record<InsightTab, InsightMetricChartStyle>> = {
  'Resting Heart Rate': 'daily-bars',
  'Heart Rate Variability': 'daily-bars',
  'Walking Heart Rate': 'daily-bars',
};

export function insightMetricChartStyle(tab: InsightTab): InsightMetricChartStyle {
  return INSIGHT_METRIC_CHART_STYLE[tab] ?? 'none';
}

/** Apple Health uses red/pink for heart-rate charts. */
export const APPLE_HEART_RATE_CHART_COLOR = '#FF375F';

/** Resting heart rate detail charts use the hub blue tone. */
export const RESTING_HEART_RATE_CHART_COLOR = '#7DA2C7';

export const INSIGHT_GROUPS = [
  {
    id: 'cardio',
    title: 'Cardiovascular',
    color: '#7DA2C7',
    tabs: ['Heart Rate', 'Blood Oxygen'] as InsightTab[],
  },
  {
    id: 'activity',
    title: 'Activity / Energy',
    color: '#7CB89B',
    tabs: ['Steps', 'Active Energy', 'Exercise Minutes', 'Workouts'] as InsightTab[],
  },
  {
    id: 'recovery',
    title: 'Recovery',
    color: '#9B8FC6',
    tabs: ['Sleep'] as InsightTab[],
  },
  {
    id: 'body',
    title: 'Body Metrics',
    color: '#C7A77D',
    tabs: ['Body Temperature', 'Blood Glucose'] as InsightTab[],
  },
] as const;

/**
 * Dashboard quick-action picker options — one entry per Insights screen.
 * Hub-nested metrics are omitted (they open the same detail as the hub root).
 */
export const DASHBOARD_QUICK_METRIC_PICKER_SECTIONS = [
  {
    title: 'Cardiovascular',
    color: '#7DA2C7',
    tabs: ['Heart Rate', 'Blood Oxygen'] as InsightTab[],
  },
  {
    title: 'Activity / Energy',
    color: '#7CB89B',
    tabs: ['Steps', 'Active Energy', 'Exercise Minutes', 'Workouts'] as InsightTab[],
  },
  {
    title: 'Recovery',
    color: '#9B8FC6',
    tabs: ['Sleep'] as InsightTab[],
  },
  {
    title: 'Body Metrics',
    color: '#C7A77D',
    tabs: ['Body Temperature', 'Blood Glucose'] as InsightTab[],
  },
] as const;

export type InsightIntradayPoint = {
  value: number;
  atMs: number;
};

export type InsightChartPeriod = 'H' | 'D' | 'W' | 'M' | 'Y';

/** Apple Health order: Hour, Day, Week, Month, Year. */
export const INSIGHT_CHART_PERIODS: InsightChartPeriod[] = ['H', 'D', 'W', 'M', 'Y'];

/** Resting heart rate omits the hour view — one daily average per day. */
export const RESTING_HEART_RATE_CHART_PERIODS: InsightChartPeriod[] = ['D', 'W', 'M', 'Y'];

/** Sleep uses day/week/month/year — no hour view. */
export const SLEEP_CHART_PERIODS: InsightChartPeriod[] = ['D', 'W', 'M', 'Y'];

export const SLEEP_CHART_COLOR = '#9B8FC6';

export type InsightHeartRateDayBucket = {
  dayStartMs: number;
  shortLabel: string;
  min: number;
  max: number;
  latest: number;
  avg: number;
  samples: InsightIntradayPoint[];
};

export type InsightHeartRateMonthBucket = {
  monthStartMs: number;
  shortLabel: string;
  min: number;
  max: number;
  avg: number;
};

export type InsightHeartRateChartData = {
  days: InsightHeartRateDayBucket[];
  months: InsightHeartRateMonthBucket[];
};

export type InsightSleepSegment = {
  startMs: number;
  endMs: number;
  stage: 'DEEP' | 'REM' | 'CORE' | 'ASLEEP';
};

export type InsightSleepChartData = InsightHeartRateChartData & {
  segmentsByDayMs: Record<number, InsightSleepSegment[]>;
};

/** Chart presentation aligned with Apple Health patterns (not embeddable). */
export type InsightMetricChartStyle = 'intraday-line' | 'daily-bars' | 'none';

export type InsightContent = {
  title: string;
  summary: string;
  trend: string;
  recommendation: string;
  trendPoints: number[];
  trendLabels: string[];
  trendUnit: string;
  /** Explicit hub row value — must match the summary time context. */
  hubValue?: number;
  /** When the displayed value was recorded — shown under metric rows and hero values. */
  freshness?: InsightMetricFreshness;
  /** @deprecated Use heartRateChart for Heart Rate detail. */
  intradaySeries?: InsightIntradayPoint[];
  intradayDayStartMs?: number;
  /** Apple Health–style heart rate buckets (30 days + 12 months). */
  heartRateChart?: InsightHeartRateChartData;
  /** Apple Health–style glucose buckets for dashboard hour gallery. */
  glucoseChart?: InsightHeartRateChartData;
  /** Apple Health–style sleep buckets with nightly stage segments. */
  sleepChart?: InsightSleepChartData;
};

export const INSIGHT_UNITS: Record<InsightTab, string> = {
  'Heart Rate': 'bpm',
  'Resting Heart Rate': 'bpm',
  'Heart Rate Variability': 'ms',
  'Walking Heart Rate': 'bpm',
  'Respiratory Rate': 'br/min',
  'Blood Oxygen': '%',
  Steps: 'steps',
  'Walking + Running Distance': 'mi',
  'Flights Climbed': 'floors',
  'Active Energy': 'kcal',
  'Resting Energy': 'kcal',
  'Exercise Minutes': 'min',
  'Stand Minutes': 'min',
  'Cardio Fitness': 'mL/kg/min',
  Workouts: 'sessions',
  Sleep: 'h',
  'Deep Sleep': 'h',
  'REM Sleep': 'h',
  'Core Sleep': 'h',
  'Body Temperature': 'degF',
  'Blood Glucose': 'mg/dL',
};

/** Latest display value for a metric row in an Insights hub. */
function formatHubMetricValue(tab: InsightTab, raw: number): string {
  if (tab === 'Walking + Running Distance') {
    return raw.toFixed(2);
  }
  if (tab === 'Sleep' || tab === 'Deep Sleep' || tab === 'REM Sleep' || tab === 'Core Sleep') {
    return raw % 1 === 0 ? String(Math.round(raw)) : raw.toFixed(1);
  }
  if (tab === 'Cardio Fitness') {
    return raw % 1 === 0 ? String(Math.round(raw)) : raw.toFixed(1);
  }
  return String(Math.round(raw));
}

const SLEEP_INSIGHT_TABS: InsightTab[] = ['Sleep', 'Deep Sleep', 'REM Sleep', 'Core Sleep'];

export function insightMetricLatestDisplay(
  tab: InsightTab,
  content: InsightContent,
): { value: string; unit: string } {
  const unit = INSIGHT_UNITS[tab];
  const raw = insightDisplayValue(content);
  const hasExplicitSleepZero =
    SLEEP_INSIGHT_TABS.includes(tab) && content.hubValue != null && Number.isFinite(content.hubValue);
  const showValue = raw > 0 || hasExplicitSleepZero;
  return { value: showValue ? formatHubMetricValue(tab, raw) : '—', unit };
}

/** Human-readable time context for a metric value (e.g. "Latest · 12m ago", "Today avg"). */
export function insightMetricTimeContextLabel(content: InsightContent, nowMs: number = Date.now()): string {
  const fromFreshness = formatInsightMetricFreshness(content.freshness, nowMs);
  if (fromFreshness) {
    return fromFreshness;
  }
  return '';
}

export const INSIGHTS_TAB_CONTENT: Record<InsightTab, InsightContent> = INSIGHTS_TABS.reduce((acc, tab) => {
  acc[tab] = {
    title: insightTabLabel(tab),
    summary: `Connect Apple Health to view ${insightTabLabel(tab).toLowerCase()} data.`,
    trend: 'Trend: unavailable',
    recommendation: `Track ${insightTabLabel(tab).toLowerCase()} consistently for stronger trends.`,
    trendPoints: [0, 0, 0, 0, 0, 0, 0],
    trendLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    trendUnit: INSIGHT_UNITS[tab],
  };
  return acc;
}, {} as Record<InsightTab, InsightContent>);

export const QUICK_ACTION_METRIC_OPTIONS: InsightTab[] = [
  'Steps',
  'Sleep',
  'Heart Rate',
  'Active Energy',
  'Blood Glucose',
  'Exercise Minutes',
  'Blood Oxygen',
  'Workouts',
  'Body Temperature',
];

export const DASHBOARD_QUICK_ACTION_SLOTS = 3;

export function normalizeDashboardQuickMetrics(metrics: InsightTab[]): InsightTab[] {
  const valid = new Set<InsightTab>();
  for (const metric of metrics) {
    if (INSIGHTS_TABS.includes(metric)) {
      valid.add(resolveInsightDetailTab(metric));
    }
  }
  const unique = [...valid].slice(0, DASHBOARD_QUICK_ACTION_SLOTS);
  for (const fallback of QUICK_ACTION_METRIC_OPTIONS) {
    if (unique.length >= DASHBOARD_QUICK_ACTION_SLOTS) {
      break;
    }
    if (!unique.includes(fallback)) {
      unique.push(fallback);
    }
  }
  return unique;
}

export const QUICK_ACTION_ICON_BY_TAB: Record<InsightTab, string> = {
  'Heart Rate': '♥',
  'Resting Heart Rate': '♡',
  'Heart Rate Variability': '≈',
  'Walking Heart Rate': '♥',
  'Respiratory Rate': '◔',
  'Blood Oxygen': '◉',
  Steps: '↟',
  'Walking + Running Distance': '⇄',
  'Flights Climbed': '⇡',
  'Active Energy': '⚡',
  'Resting Energy': '◌',
  'Exercise Minutes': '⌛',
  'Stand Minutes': '↕',
  Sleep: '☾',
  'Deep Sleep': '☾',
  'REM Sleep': '☾',
  'Core Sleep': '☾',
  Workouts: '◎',
  'Body Temperature': '◍',
  'Cardio Fitness': '◎',
  'Blood Glucose': '◈',
};

export const QUICK_ACTION_THEME_COLOR_BY_TAB: Record<InsightTab, string> = {
  'Heart Rate': '#7DA2C7',
  'Resting Heart Rate': '#7DA2C7',
  'Heart Rate Variability': '#7DA2C7',
  'Walking Heart Rate': '#7DA2C7',
  'Respiratory Rate': '#7DA2C7',
  'Blood Oxygen': '#7DA2C7',
  Steps: '#7CB89B',
  'Walking + Running Distance': '#7CB89B',
  'Flights Climbed': '#7CB89B',
  'Active Energy': '#7CB89B',
  'Resting Energy': '#7CB89B',
  'Exercise Minutes': '#7CB89B',
  'Stand Minutes': '#7CB89B',
  Workouts: '#7CB89B',
  Sleep: '#9B8FC6',
  'Deep Sleep': '#9B8FC6',
  'REM Sleep': '#9B8FC6',
  'Core Sleep': '#9B8FC6',
  'Body Temperature': '#C7A77D',
  'Cardio Fitness': '#7CB89B',
  'Blood Glucose': '#C7A77D',
};
