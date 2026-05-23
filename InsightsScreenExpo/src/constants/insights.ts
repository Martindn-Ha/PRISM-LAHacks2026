export const METRICS = [
  { label: 'GLUCOSE', value: '142', unit: 'MG/DL', status: 'HIGH', statusColor: '#ef4444' },
  { label: 'STRESS LEVEL', value: '78', unit: '/100', status: 'HIGH', statusColor: '#f97316' },
  { label: 'HEART RATE', value: '68', unit: 'BPM', status: 'NORMAL', statusColor: '#22c55e' },
];

export const QUICK_ACTIONS = [
  { label: 'Log Glucose', icon: '◍' },
  { label: 'Log Heart Rate', icon: '♥' },
  { label: 'Log Stress', icon: '◔' },
  { label: 'Track Meal', icon: '◒' },
  { label: 'Track Activity', icon: '↟' },
  { label: 'How am I feeling', icon: '☺' },
];

export const INSIGHTS_TABS = [
  'Heart Rate',
  'Resting Heart Rate',
  'Heart Rate Variability',
  'Respiratory Rate',
  'Blood Oxygen',
  'Steps',
  'Walking + Running Distance',
  'Flights Climbed',
  'Active Energy',
  'Basal Energy',
  'Exercise Time',
  'Stand Time',
  'Sleep',
  'Mindfulness',
  'Body Temperature',
  'Weight',
  'VO2 Max',
  'Blood Glucose',
] as const;

export type InsightTab = (typeof INSIGHTS_TABS)[number];

/** Dashboard vitals row → Insights detail tab. */
export const DASHBOARD_METRIC_INSIGHT_TAB = {
  GLUCOSE: 'Blood Glucose',
  'STRESS LEVEL': 'Mindfulness',
  'HEART RATE': 'Heart Rate',
} as const satisfies Record<string, InsightTab>;

export type DashboardMetricLabel = keyof typeof DASHBOARD_METRIC_INSIGHT_TAB;

/** Compact labels for tight UI (dashboard quick actions, chips). */
export const INSIGHT_TAB_SHORT_LABEL: Partial<Record<InsightTab, string>> = {
  'Walking + Running Distance': 'Distance',
};

export function insightTabLabel(tab: InsightTab): string {
  return INSIGHT_TAB_SHORT_LABEL[tab] ?? tab;
}

export const INSIGHT_GROUPS = [
  {
    id: 'cardio',
    title: 'Cardiovascular',
    subtitle: 'Heart rhythm, oxygen delivery, and breathing efficiency.',
    color: '#7DA2C7',
    tabs: ['Heart Rate', 'Resting Heart Rate', 'Heart Rate Variability', 'Blood Oxygen', 'Respiratory Rate'] as InsightTab[],
  },
  {
    id: 'activity',
    title: 'Activity + Energy',
    subtitle: 'Movement volume, effort, and daily energy expenditure.',
    color: '#7CB89B',
    tabs: [
      'Steps',
      'Walking + Running Distance',
      'Flights Climbed',
      'Active Energy',
      'Basal Energy',
      'Exercise Time',
      'Stand Time',
      'VO2 Max',
    ] as InsightTab[],
  },
  {
    id: 'recovery',
    title: 'Recovery + Mind',
    subtitle: 'Sleep quality, stress reset, and mental recovery signals.',
    color: '#9B8FC6',
    tabs: ['Sleep', 'Mindfulness'] as InsightTab[],
  },
  {
    id: 'body',
    title: 'Body Metrics',
    subtitle: 'Core physiological measures and metabolic health markers.',
    color: '#C7A77D',
    tabs: ['Body Temperature', 'Weight', 'Blood Glucose'] as InsightTab[],
  },
] as const;

export type InsightTrendWindow = '7d' | '30d' | 'ytd';

export const INSIGHT_TREND_WINDOW_LABEL: Record<InsightTrendWindow, string> = {
  '7d': '7 days',
  '30d': '30 days',
  ytd: 'Year to date',
};

/** Short labels for trend window chips and chart headers */
export const INSIGHT_TREND_WINDOW_CHIP: Record<InsightTrendWindow, string> = {
  '7d': '7D',
  '30d': '30D',
  ytd: 'YTD',
};

export const INSIGHT_TREND_WINDOW_ORDER: InsightTrendWindow[] = ['7d', '30d', 'ytd'];

export type InsightContent = {
  title: string;
  summary: string;
  trend: string;
  recommendation: string;
  trendPoints: number[];
  trendLabels: string[];
  trendUnit: string;
};

export const INSIGHT_UNITS: Record<InsightTab, string> = {
  'Heart Rate': 'bpm',
  'Resting Heart Rate': 'bpm',
  'Heart Rate Variability': 'ms',
  'Respiratory Rate': 'br/min',
  'Blood Oxygen': '%',
  Steps: 'steps',
  'Walking + Running Distance': 'mi',
  'Flights Climbed': 'floors',
  'Active Energy': 'kcal',
  'Basal Energy': 'kcal',
  'Exercise Time': 'min',
  'Stand Time': 'min',
  Sleep: 'h',
  Mindfulness: 'sessions',
  'Body Temperature': 'degF',
  Weight: 'lb',
  'VO2 Max': 'mL/kg/min',
  'Blood Glucose': 'mg/dL',
};

export const INSIGHTS_TAB_CONTENT: Record<InsightTab, InsightContent> = INSIGHTS_TABS.reduce((acc, tab) => {
  acc[tab] = {
    title: insightTabLabel(tab),
    summary: `Connect Apple Health to view ${tab.toLowerCase()} data.`,
    trend: 'Trend: unavailable',
    recommendation: `Track ${tab.toLowerCase()} consistently for stronger trends.`,
    trendPoints: [0, 0, 0, 0, 0, 0, 0],
    trendLabels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    trendUnit: INSIGHT_UNITS[tab],
  };
  return acc;
}, {} as Record<InsightTab, InsightContent>);

export const QUICK_ACTION_METRIC_OPTIONS: InsightTab[] = [
  'Walking + Running Distance',
  'Steps',
  'Sleep',
  'Active Energy',
  'Flights Climbed',
  'Blood Glucose',
  'Heart Rate',
  'Mindfulness',
  'Resting Heart Rate',
  'Exercise Time',
  'Blood Oxygen',
];

export const DASHBOARD_QUICK_ACTION_SLOTS = 3;

export const QUICK_ACTION_ICON_BY_TAB: Record<InsightTab, string> = {
  'Heart Rate': '♥',
  'Resting Heart Rate': '♡',
  'Heart Rate Variability': '≈',
  'Respiratory Rate': '◔',
  'Blood Oxygen': '◉',
  Steps: '↟',
  'Walking + Running Distance': '⇄',
  'Flights Climbed': '⇡',
  'Active Energy': '⚡',
  'Basal Energy': '◌',
  'Exercise Time': '⌛',
  'Stand Time': '↕',
  Sleep: '☾',
  Mindfulness: '☯',
  'Body Temperature': '◍',
  Weight: '◒',
  'VO2 Max': '◎',
  'Blood Glucose': '◈',
};

export const QUICK_ACTION_THEME_COLOR_BY_TAB: Record<InsightTab, string> = {
  'Heart Rate': '#7DA2C7',
  'Resting Heart Rate': '#7DA2C7',
  'Heart Rate Variability': '#7DA2C7',
  'Respiratory Rate': '#7DA2C7',
  'Blood Oxygen': '#7DA2C7',
  Steps: '#7CB89B',
  'Walking + Running Distance': '#7CB89B',
  'Flights Climbed': '#7CB89B',
  'Active Energy': '#7CB89B',
  'Basal Energy': '#7CB89B',
  'Exercise Time': '#7CB89B',
  'Stand Time': '#7CB89B',
  Sleep: '#9B8FC6',
  Mindfulness: '#9B8FC6',
  'Body Temperature': '#C7A77D',
  Weight: '#C7A77D',
  'VO2 Max': '#7CB89B',
  'Blood Glucose': '#C7A77D',
};
