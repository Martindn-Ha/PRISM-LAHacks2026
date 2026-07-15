import AsyncStorage from '@react-native-async-storage/async-storage';

export const UI_INTERACTIONS_STORAGE_KEY = 'prism.uiInteractions.log';
export const UI_INTERACTIONS_MAX_ROWS = 5000;

export type UiInteractionGesture = 'tap' | 'swipe';
export type UiInteractionDirection = '' | 'left' | 'right' | 'up' | 'down';

export type UiInteractionEvent = {
  id: string;
  at: string;
  screen: string;
  gesture: UiInteractionGesture;
  target: string;
  direction: UiInteractionDirection;
};

function isValidEvent(raw: unknown): raw is UiInteractionEvent {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const row = raw as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.at === 'string' &&
    typeof row.screen === 'string' &&
    (row.gesture === 'tap' || row.gesture === 'swipe') &&
    typeof row.target === 'string' &&
    (row.direction === '' ||
      row.direction === 'left' ||
      row.direction === 'right' ||
      row.direction === 'up' ||
      row.direction === 'down')
  );
}

export async function loadUiInteractions(): Promise<UiInteractionEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(UI_INTERACTIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidEvent);
  } catch {
    return [];
  }
}

export async function appendUiInteractions(events: UiInteractionEvent[]): Promise<UiInteractionEvent[]> {
  if (events.length === 0) {
    return loadUiInteractions();
  }
  const existing = await loadUiInteractions();
  const existingIds = new Set(existing.map((event) => event.id));
  const merged = [...events.filter((event) => !existingIds.has(event.id)), ...existing]
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, UI_INTERACTIONS_MAX_ROWS);
  await AsyncStorage.setItem(UI_INTERACTIONS_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export async function clearUiInteractions(): Promise<void> {
  await AsyncStorage.removeItem(UI_INTERACTIONS_STORAGE_KEY);
}

export function filterUiInteractionsForExport(
  events: UiInteractionEvent[],
  dateRange: { start: string; end: string },
): UiInteractionEvent[] {
  const startMs = new Date(dateRange.start).getTime();
  const endMs = new Date(dateRange.end).getTime();
  return events.filter((event) => {
    const atMs = new Date(event.at).getTime();
    return Number.isFinite(atMs) && atMs >= startMs && atMs <= endMs;
  });
}
