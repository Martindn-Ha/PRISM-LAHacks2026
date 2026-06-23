import {
  DASHBOARD_QUICK_METRIC_PICKER_SECTIONS,
  INSIGHT_METRICS_UNLIKELY_APPLE_HEALTH,
  INSIGHT_UNITS,
  insightMetricHasAppleHealthData,
  insightTabLabel,
  isInsightMetricGreyedOut,
  type InsightContent,
  type InsightTab,
} from './insights';

export type GoalDirection = 'increase' | 'decrease' | 'in_range';
export type GoalPeriod = 'daily' | 'weekly';
export type GoalRangeTarget = { min: number; max: number };
export type GoalTarget = number | GoalRangeTarget;

export type MetricGoal = {
  id: string;
  metric: InsightTab;
  direction: GoalDirection;
  target: GoalTarget;
  period: GoalPeriod;
  label?: string;
  createdAt: string;
  deletedAt: string | null;
};

export type GoalMetricConfig = {
  defaultDirection: GoalDirection;
  defaultTarget: GoalTarget;
  defaultPeriod: GoalPeriod;
  weeklyAggregation: 'sum' | 'average';
};

/** Metrics where a user target is meaningful and PRISM reads passive Health data. */
export const GOAL_ELIGIBLE_METRICS: readonly InsightTab[] = [
  'Steps',
  'Walking + Running Distance',
  'Flights Climbed',
  'Active Energy',
  'Exercise Minutes',
  'Stand Minutes',
  'Workouts',
  'Sleep',
  'Deep Sleep',
  'REM Sleep',
  'Resting Heart Rate',
  'Heart Rate Variability',
  'Blood Glucose',
] as const;

export const GOAL_METRIC_CONFIG: Record<(typeof GOAL_ELIGIBLE_METRICS)[number], GoalMetricConfig> = {
  Steps: { defaultDirection: 'increase', defaultTarget: 10000, defaultPeriod: 'daily', weeklyAggregation: 'sum' },
  'Walking + Running Distance': { defaultDirection: 'increase', defaultTarget: 3, defaultPeriod: 'weekly', weeklyAggregation: 'sum' },
  'Flights Climbed': { defaultDirection: 'increase', defaultTarget: 10, defaultPeriod: 'daily', weeklyAggregation: 'sum' },
  'Active Energy': { defaultDirection: 'increase', defaultTarget: 400, defaultPeriod: 'daily', weeklyAggregation: 'sum' },
  'Exercise Minutes': { defaultDirection: 'increase', defaultTarget: 30, defaultPeriod: 'daily', weeklyAggregation: 'sum' },
  'Stand Minutes': { defaultDirection: 'increase', defaultTarget: 60, defaultPeriod: 'daily', weeklyAggregation: 'sum' },
  Workouts: { defaultDirection: 'increase', defaultTarget: 3, defaultPeriod: 'weekly', weeklyAggregation: 'sum' },
  Sleep: { defaultDirection: 'increase', defaultTarget: 7, defaultPeriod: 'daily', weeklyAggregation: 'average' },
  'Deep Sleep': { defaultDirection: 'increase', defaultTarget: 1.5, defaultPeriod: 'daily', weeklyAggregation: 'average' },
  'REM Sleep': { defaultDirection: 'increase', defaultTarget: 1.5, defaultPeriod: 'daily', weeklyAggregation: 'average' },
  'Resting Heart Rate': { defaultDirection: 'decrease', defaultTarget: 65, defaultPeriod: 'daily', weeklyAggregation: 'average' },
  'Heart Rate Variability': { defaultDirection: 'increase', defaultTarget: 50, defaultPeriod: 'daily', weeklyAggregation: 'average' },
  'Blood Glucose': { defaultDirection: 'in_range', defaultTarget: { min: 70, max: 140 }, defaultPeriod: 'daily', weeklyAggregation: 'average' },
};

export const INSIGHT_TAB_EXPORT_KEY: Partial<Record<InsightTab, string>> = {
  'Heart Rate': 'heartRate',
  'Resting Heart Rate': 'restingHeartRate',
  'Heart Rate Variability': 'hrv',
  'Walking Heart Rate': 'walkingHeartRate',
  'Respiratory Rate': 'respiratoryRate',
  'Blood Oxygen': 'bloodOxygen',
  Steps: 'steps',
  'Walking + Running Distance': 'distance',
  'Flights Climbed': 'flights',
  'Active Energy': 'activeEnergy',
  'Resting Energy': 'basalEnergy',
  'Exercise Minutes': 'exerciseTime',
  'Stand Minutes': 'standTime',
  Sleep: 'sleep',
  'Deep Sleep': 'sleep',
  'REM Sleep': 'sleep',
  'Core Sleep': 'sleep',
  'Body Temperature': 'bodyTemperature',
  'Cardio Fitness': 'vo2Max',
  'Blood Glucose': 'bloodGlucose',
  Workouts: 'workouts',
};

export function isGoalEligibleMetric(metric: InsightTab): metric is (typeof GOAL_ELIGIBLE_METRICS)[number] {
  return (GOAL_ELIGIBLE_METRICS as readonly InsightTab[]).includes(metric);
}

/** Goals may only target Insight metrics that are present and not greyed out in Health. */
export function isGoalMetricAvailable(
  tab: InsightTab,
  content: InsightContent | undefined,
  healthKitReady: boolean,
): tab is (typeof GOAL_ELIGIBLE_METRICS)[number] {
  if (!isGoalEligibleMetric(tab)) {
    return false;
  }
  if (!healthKitReady) {
    if ((INSIGHT_METRICS_UNLIKELY_APPLE_HEALTH as readonly InsightTab[]).includes(tab)) {
      return false;
    }
    if (tab === 'Blood Glucose' && !insightMetricHasAppleHealthData(content)) {
      return false;
    }
    return true;
  }
  if (isInsightMetricGreyedOut(tab, content, healthKitReady)) {
    return false;
  }
  if (!insightMetricHasAppleHealthData(content)) {
    return false;
  }
  return true;
}

export function buildGoalPickerSections(
  insightContentByTab: Record<InsightTab, InsightContent>,
  healthKitReady: boolean,
) {
  return DASHBOARD_QUICK_METRIC_PICKER_SECTIONS.map((section) => ({
    ...section,
    tabs: section.tabs.filter((tab): tab is (typeof GOAL_ELIGIBLE_METRICS)[number] =>
      isGoalMetricAvailable(tab, insightContentByTab[tab], healthKitReady),
    ),
  })).filter((section) => section.tabs.length > 0);
}

export function isRangeTarget(target: GoalTarget): target is GoalRangeTarget {
  return typeof target === 'object' && target != null && 'min' in target && 'max' in target;
}

export function isGoalActive(goal: MetricGoal, atMs: number = Date.now()): boolean {
  if (goal.deletedAt != null) {
    return false;
  }
  return new Date(goal.createdAt).getTime() <= atMs;
}

export function goalWasActiveOnDate(goal: MetricGoal, dayKey: string): boolean {
  const createdKey = goal.createdAt.slice(0, 10);
  if (dayKey < createdKey) {
    return false;
  }
  if (goal.deletedAt != null) {
    const deletedKey = goal.deletedAt.slice(0, 10);
    return dayKey <= deletedKey;
  }
  return true;
}

export function goalDisplayTitle(goal: MetricGoal): string {
  if (goal.label?.trim()) {
    return goal.label.trim();
  }
  return insightTabLabel(goal.metric);
}

export function goalMetricUnit(metric: InsightTab): string {
  return INSIGHT_UNITS[metric];
}

export function goalExportKey(metric: InsightTab): string | undefined {
  return INSIGHT_TAB_EXPORT_KEY[metric];
}

export function defaultConfigForMetric(metric: (typeof GOAL_ELIGIBLE_METRICS)[number]): GoalMetricConfig {
  return GOAL_METRIC_CONFIG[metric];
}

export function formatGoalTarget(goal: MetricGoal): string {
  const unit = goalMetricUnit(goal.metric);
  if (isRangeTarget(goal.target)) {
    return `${goal.target.min}–${goal.target.max} ${unit}`;
  }
  if (goal.direction === 'decrease') {
    return `≤ ${goal.target} ${unit}`;
  }
  return `≥ ${goal.target} ${unit}`;
}
