import {
  appendUiInteractions,
  type UiInteractionDirection,
  type UiInteractionEvent,
  type UiInteractionGesture,
} from './uiInteractionStorage';

const FLUSH_BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 2000;

let currentScreen = 'Dashboard';
let pending: UiInteractionEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let idCounter = 0;

function nextId(at: string): string {
  idCounter += 1;
  return `ui-${at}-${idCounter}`;
}

export function setUiInteractionScreen(screen: string): void {
  if (screen.trim().length === 0) {
    return;
  }
  currentScreen = screen;
}

export function getUiInteractionScreen(): string {
  return currentScreen;
}

export function logUiInteraction(input: {
  target: string;
  gesture?: UiInteractionGesture;
  direction?: UiInteractionDirection;
  screen?: string;
  at?: string;
}): void {
  const target = input.target.trim();
  if (!target) {
    return;
  }
  const at = input.at ?? new Date().toISOString();
  pending.push({
    id: nextId(at),
    at,
    screen: input.screen ?? currentScreen,
    gesture: input.gesture ?? 'tap',
    target,
    direction: input.direction ?? '',
  });
  if (pending.length >= FLUSH_BATCH_SIZE) {
    void flushUiInteractions();
    return;
  }
  if (flushTimer == null) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushUiInteractions();
    }, FLUSH_INTERVAL_MS);
  }
}

export async function flushUiInteractions(): Promise<void> {
  if (flushing || pending.length === 0) {
    return;
  }
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushing = true;
  const batch = pending;
  pending = [];
  try {
    await appendUiInteractions(batch);
  } catch {
    pending = [...batch, ...pending];
  } finally {
    flushing = false;
  }
}

/** Test helper — resets in-memory queue/screen. */
export function resetUiInteractionLogForTests(): void {
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pending = [];
  flushing = false;
  idCounter = 0;
  currentScreen = 'Dashboard';
}
