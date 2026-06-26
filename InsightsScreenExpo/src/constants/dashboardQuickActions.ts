import { MEDICATIONS_SECTION_COLOR } from './medications';
import {
  DASHBOARD_QUICK_ACTION_SLOTS,
  INSIGHTS_TABS,
  QUICK_ACTION_METRIC_OPTIONS,
  QUICK_ACTION_THEME_COLOR_BY_TAB,
  insightTabLabel,
  type InsightTab,
} from './insights';

export const DASHBOARD_QUICK_ACTION_MEDICATIONS = 'Medications' as const;

export type DashboardQuickActionSpecial = typeof DASHBOARD_QUICK_ACTION_MEDICATIONS;

export type DashboardQuickAction = InsightTab | DashboardQuickActionSpecial;

export function isDashboardQuickActionMedications(
  action: DashboardQuickAction,
): action is DashboardQuickActionSpecial {
  return action === DASHBOARD_QUICK_ACTION_MEDICATIONS;
}

export function isDashboardQuickAction(value: unknown): value is DashboardQuickAction {
  return (
    value === DASHBOARD_QUICK_ACTION_MEDICATIONS ||
    (typeof value === 'string' && (INSIGHTS_TABS as readonly string[]).includes(value))
  );
}

export function dashboardQuickActionLabel(action: DashboardQuickAction): string {
  if (isDashboardQuickActionMedications(action)) {
    return 'Medications';
  }
  return insightTabLabel(action);
}

export function dashboardQuickActionThemeColor(action: DashboardQuickAction): string {
  if (isDashboardQuickActionMedications(action)) {
    return MEDICATIONS_SECTION_COLOR;
  }
  return QUICK_ACTION_THEME_COLOR_BY_TAB[action];
}

export const DASHBOARD_QUICK_ACTION_FALLBACKS: DashboardQuickAction[] = [
  ...QUICK_ACTION_METRIC_OPTIONS,
  DASHBOARD_QUICK_ACTION_MEDICATIONS,
];

export function normalizeDashboardQuickActions(actions: DashboardQuickAction[]): DashboardQuickAction[] {
  const unique: DashboardQuickAction[] = [];
  for (const action of actions) {
    if (!isDashboardQuickAction(action) || unique.includes(action)) {
      continue;
    }
    unique.push(action);
    if (unique.length >= DASHBOARD_QUICK_ACTION_SLOTS) {
      break;
    }
  }
  for (const fallback of DASHBOARD_QUICK_ACTION_FALLBACKS) {
    if (unique.length >= DASHBOARD_QUICK_ACTION_SLOTS) {
      break;
    }
    if (!unique.includes(fallback)) {
      unique.push(fallback);
    }
  }
  return unique;
}

export function moveDashboardQuickAction(
  list: DashboardQuickAction[],
  from: number,
  to: number,
): DashboardQuickAction[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed!);
  return next;
}
