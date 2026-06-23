import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isDashboardQuickAction,
  normalizeDashboardQuickActions,
  type DashboardQuickAction,
} from '../constants/dashboardQuickActions';

const DASHBOARD_QUICK_METRICS_KEY = 'prism.dashboard.quickMetrics';

export async function loadDashboardQuickMetrics(): Promise<DashboardQuickAction[] | null> {
  try {
    const raw = await AsyncStorage.getItem(DASHBOARD_QUICK_METRICS_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const metrics = parsed.filter(isDashboardQuickAction);
    return metrics.length > 0 ? normalizeDashboardQuickActions(metrics) : null;
  } catch {
    return null;
  }
}

export async function saveDashboardQuickMetrics(metrics: DashboardQuickAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DASHBOARD_QUICK_METRICS_KEY, JSON.stringify(normalizeDashboardQuickActions(metrics)));
  } catch {
    // Ignore persistence failures for this session.
  }
}
