import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  defaultConfigForMetric,
  GOAL_ELIGIBLE_METRICS,
  isGoalEligibleMetric,
  isRangeTarget,
  type GoalDirection,
  type GoalPeriod,
  type GoalTarget,
  type MetricGoal,
} from '../constants/goals';
import type { InsightTab } from '../constants/insights';

const GOALS_STORAGE_KEY = 'prism.goals';

function createGoalId(): string {
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeGoal(raw: unknown): MetricGoal | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const metric = row.metric;
  if (typeof metric !== 'string' || !isGoalEligibleMetric(metric as InsightTab)) {
    return null;
  }
  const direction = row.direction;
  if (direction !== 'increase' && direction !== 'decrease' && direction !== 'in_range') {
    return null;
  }
  const period = row.period;
  if (period !== 'daily' && period !== 'weekly') {
    return null;
  }
  let target: GoalTarget | null = null;
  if (isRangeTarget(row.target as GoalTarget)) {
    const range = row.target as { min: unknown; max: unknown };
    const min = Number(range.min);
    const max = Number(range.max);
    if (Number.isFinite(min) && Number.isFinite(max) && min < max) {
      target = { min, max };
    }
  } else {
    const numeric = Number(row.target);
    if (Number.isFinite(numeric) && numeric > 0) {
      target = numeric;
    }
  }
  if (target == null) {
    return null;
  }
  const id = typeof row.id === 'string' ? row.id : '';
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : '';
  if (!id || !createdAt) {
    return null;
  }
  const deletedAt = row.deletedAt == null ? null : typeof row.deletedAt === 'string' ? row.deletedAt : null;
  const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : undefined;
  return {
    id,
    metric,
    direction: direction as GoalDirection,
    target,
    period: period as GoalPeriod,
    label,
    createdAt,
    deletedAt,
  };
}

async function saveAllGoals(goals: MetricGoal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // Ignore persistence failures for this session.
  }
}

export async function loadAllGoals(): Promise<MetricGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(sanitizeGoal).filter((goal): goal is MetricGoal => goal != null);
  } catch {
    return [];
  }
}

export async function loadActiveGoals(): Promise<MetricGoal[]> {
  const goals = await loadAllGoals();
  return goals.filter((goal) => goal.deletedAt == null);
}

export type CreateGoalInput = {
  metric: (typeof GOAL_ELIGIBLE_METRICS)[number];
  direction?: GoalDirection;
  target?: GoalTarget;
  period?: GoalPeriod;
  label?: string;
};

export async function createGoal(input: CreateGoalInput): Promise<MetricGoal> {
  const defaults = defaultConfigForMetric(input.metric);
  const goal: MetricGoal = {
    id: createGoalId(),
    metric: input.metric,
    direction: input.direction ?? defaults.defaultDirection,
    target: input.target ?? defaults.defaultTarget,
    period: input.period ?? defaults.defaultPeriod,
    label: input.label?.trim() || undefined,
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };
  const goals = await loadAllGoals();
  goals.unshift(goal);
  await saveAllGoals(goals);
  return goal;
}

export async function softDeleteGoal(goalId: string): Promise<MetricGoal | null> {
  const goals = await loadAllGoals();
  const index = goals.findIndex((goal) => goal.id === goalId);
  if (index < 0) {
    return null;
  }
  const updated: MetricGoal = {
    ...goals[index]!,
    deletedAt: new Date().toISOString(),
  };
  goals[index] = updated;
  await saveAllGoals(goals);
  return updated;
}
