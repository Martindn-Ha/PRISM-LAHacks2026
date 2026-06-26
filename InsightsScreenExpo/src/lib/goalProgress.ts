import {
  defaultConfigForMetric,
  formatGoalTarget,
  goalDisplayTitle,
  goalExportKey,
  goalMetricUnit,
  goalWasActiveOnDate,
  isGoalEligibleMetric,
  isRangeTarget,
  type GoalPeriod,
  type MetricGoal,
} from '../constants/goals';
import type { InsightContent, InsightTab } from '../constants/insights';
import { insightDisplayValue } from './insightTrendDisplay';
import type { ExportRow, ExportWorkoutRow } from './healthDataExportCore';

export type GoalProgressSnapshot = {
  current: number | null;
  progress: number | null;
  met: boolean | null;
  summary: string;
  detail: string;
};

export type GoalProgressExportRow = {
  goalId: string;
  metric: string;
  date: string;
  period: GoalPeriod;
  target: string;
  actual: number | '';
  progressPct: number | '';
  met: boolean | '';
  goalActiveOnDate: boolean;
  goalStatus: 'active' | 'deleted';
};

export type PrismGoalExportRow = {
  id: string;
  metric: string;
  direction: MetricGoal['direction'];
  target: MetricGoal['target'];
  period: GoalPeriod;
  label: string;
  createdAt: string;
  deletedAt: string | null;
  status: 'active' | 'deleted';
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const SLEEP_TABS: InsightTab[] = ['Sleep', 'Deep Sleep', 'REM Sleep', 'Core Sleep'];

function allowsZeroValue(metric: InsightTab): boolean {
  return SLEEP_TABS.includes(metric);
}

function aggregateTrendValues(values: number[], aggregation: 'sum' | 'average'): number | null {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0);
  if (usable.length === 0) {
    return null;
  }
  if (aggregation === 'sum') {
    return usable.reduce((sum, value) => sum + value, 0);
  }
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

export function periodValueFromTrend(
  trendPoints: number[],
  period: GoalPeriod,
  aggregation: 'sum' | 'average',
  metric: InsightTab,
): number | null {
  if (period === 'daily') {
    const today = trendPoints[trendPoints.length - 1];
    if (today == null || !Number.isFinite(today)) {
      return null;
    }
    if (today > 0 || (allowsZeroValue(metric) && today === 0)) {
      return today;
    }
    return null;
  }
  return aggregateTrendValues(trendPoints, aggregation);
}

export function evaluateGoalValue(goal: MetricGoal, actual: number): { progress: number; met: boolean } {
  if (!Number.isFinite(actual)) {
    return { progress: 0, met: false };
  }
  if (actual <= 0 && !allowsZeroValue(goal.metric)) {
    return { progress: 0, met: false };
  }

  if (goal.direction === 'in_range' && isRangeTarget(goal.target)) {
    const met = actual >= goal.target.min && actual <= goal.target.max;
    if (met) {
      return { progress: 1, met: true };
    }
    const distance =
      actual < goal.target.min ? goal.target.min - actual : actual - goal.target.max;
    const span = goal.target.max - goal.target.min;
    const progress = span > 0 ? clamp01(1 - distance / span) : 0;
    return { progress, met: false };
  }

  if (typeof goal.target !== 'number') {
    return { progress: 0, met: false };
  }

  if (goal.direction === 'increase') {
    const progress = clamp01(actual / goal.target);
    return { progress, met: actual >= goal.target };
  }

  if (actual <= 0) {
    return { progress: 0, met: false };
  }
  const progress = actual <= goal.target ? 1 : clamp01(goal.target / actual);
  return { progress, met: actual <= goal.target };
}

export function computeGoalProgressFromInsight(goal: MetricGoal, content: InsightContent): GoalProgressSnapshot {
  const config = defaultConfigForMetric(goal.metric);
  const trendPoints = content.trendPoints ?? [];
  let current: number | null;

  if (goal.period === 'daily') {
    const raw = insightDisplayValue(content);
    current = raw > 0 || (allowsZeroValue(goal.metric) && raw === 0) ? raw : null;
  } else {
    current = periodValueFromTrend(trendPoints, goal.period, config.weeklyAggregation, goal.metric);
  }

  if (current == null) {
    return {
      current: null,
      progress: null,
      met: null,
      summary: 'No data yet',
      detail: formatGoalTarget(goal),
    };
  }

  const { progress, met } = evaluateGoalValue(goal, current);
  const unit = goalMetricUnit(goal.metric);
  const periodLabel = goal.period === 'weekly' ? 'This week' : 'Today';
  const formattedCurrent =
    goal.metric === 'Walking + Running Distance'
      ? current.toFixed(2)
      : SLEEP_TABS.includes(goal.metric) && current % 1 !== 0
        ? current.toFixed(1)
        : String(Math.round(current));

  let summary = `${periodLabel}: ${formattedCurrent} ${unit}`;
  if (typeof goal.target === 'number') {
    summary += ` · ${Math.round(progress * 100)}%`;
  } else {
    summary += met ? ' · In range' : ' · Out of range';
  }

  return {
    current,
    progress,
    met,
    summary,
    detail: formatGoalTarget(goal),
  };
}

function toUtcDayKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function eachUtcDayBetween(startIso: string, endIso: string): string[] {
  const days: string[] = [];
  const cursor = new Date(startIso);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(endIso);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    days.push(toUtcDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function isExportRow(row: ExportRow | ExportWorkoutRow): row is ExportRow {
  return 'value' in row && !('activityName' in row);
}

function dailyValuesFromHealthRows(
  rows: ExportRow[] | ExportWorkoutRow[] | undefined,
  metric: InsightTab,
): Map<string, number> {
  const byDay = new Map<string, number[]>();
  if (!rows) {
    return new Map();
  }

  for (const row of rows) {
    if (!isExportRow(row)) {
      continue;
    }
    const numeric = typeof row.value === 'number' ? row.value : Number(row.value);
    if (!Number.isFinite(numeric)) {
      continue;
    }
    const day = toUtcDayKey(row.startDate);
    const bucket = byDay.get(day) ?? [];
    bucket.push(numeric);
    byDay.set(day, bucket);
  }

  const config = isGoalEligibleMetric(metric) ? defaultConfigForMetric(metric) : null;
  const aggregation = config?.weeklyAggregation ?? 'average';
  const result = new Map<string, number>();

  for (const [day, values] of byDay.entries()) {
    if (metric === 'Workouts') {
      result.set(day, values.length);
      continue;
    }
    if (aggregation === 'sum' && values.length > 1) {
      result.set(day, values.reduce((sum, value) => sum + value, 0));
    } else {
      result.set(day, values.reduce((sum, value) => sum + value, 0) / values.length);
    }
  }

  return result;
}

export function serializeGoalsForExport(goals: MetricGoal[]): PrismGoalExportRow[] {
  return goals.map((goal) => ({
    id: goal.id,
    metric: goal.metric,
    direction: goal.direction,
    target: goal.target,
    period: goal.period,
    label: goalDisplayTitle(goal),
    createdAt: goal.createdAt,
    deletedAt: goal.deletedAt,
    status: goal.deletedAt == null ? 'active' : 'deleted',
  }));
}

export function buildGoalProgressExportRows(
  goals: MetricGoal[],
  health: Record<string, ExportRow[] | ExportWorkoutRow[]>,
  dateRange: { start: string; end: string },
): GoalProgressExportRow[] {
  const rows: GoalProgressExportRow[] = [];
  const days = eachUtcDayBetween(dateRange.start, dateRange.end);

  for (const goal of goals) {
    const exportKey = goalExportKey(goal.metric);
    const dailyValues = dailyValuesFromHealthRows(exportKey ? health[exportKey] : undefined, goal.metric);
    const config = defaultConfigForMetric(goal.metric);
    const targetLabel = formatGoalTarget(goal);
    const status = goal.deletedAt == null ? 'active' : 'deleted';

    for (const day of days) {
      const activeOnDate = goalWasActiveOnDate(goal, day);
      const actual = dailyValues.get(day);

      if (!activeOnDate) {
        rows.push({
          goalId: goal.id,
          metric: goal.metric,
          date: day,
          period: goal.period,
          target: targetLabel,
          actual: '',
          progressPct: '',
          met: '',
          goalActiveOnDate: false,
          goalStatus: status,
        });
        continue;
      }

      if (actual == null || (!allowsZeroValue(goal.metric) && actual <= 0)) {
        rows.push({
          goalId: goal.id,
          metric: goal.metric,
          date: day,
          period: goal.period,
          target: targetLabel,
          actual: '',
          progressPct: '',
          met: '',
          goalActiveOnDate: true,
          goalStatus: status,
        });
        continue;
      }

      let evaluatedActual = actual;
      if (goal.period === 'weekly') {
        const dayIndex = days.indexOf(day);
        const window = days.slice(Math.max(0, dayIndex - 6), dayIndex + 1);
        const windowValues = window
          .map((windowDay) => dailyValues.get(windowDay))
          .filter((value): value is number => value != null && (value > 0 || allowsZeroValue(goal.metric)));
        if (windowValues.length === 0) {
          rows.push({
            goalId: goal.id,
            metric: goal.metric,
            date: day,
            period: goal.period,
            target: targetLabel,
            actual: '',
            progressPct: '',
            met: '',
            goalActiveOnDate: true,
            goalStatus: status,
          });
          continue;
        }
        evaluatedActual =
          config.weeklyAggregation === 'sum'
            ? windowValues.reduce((sum, value) => sum + value, 0)
            : windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
      }

      const { progress, met } = evaluateGoalValue(goal, evaluatedActual);
      rows.push({
        goalId: goal.id,
        metric: goal.metric,
        date: day,
        period: goal.period,
        target: targetLabel,
        actual: evaluatedActual,
        progressPct: Math.round(progress * 1000) / 10,
        met,
        goalActiveOnDate: true,
        goalStatus: status,
      });
    }
  }

  return rows;
}
