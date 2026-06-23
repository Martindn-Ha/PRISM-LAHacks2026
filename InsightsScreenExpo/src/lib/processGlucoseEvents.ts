import type { HealthKitApi } from './appleHealthKit';
import type { GlucoseSampleInput } from './healthEventCorrelator';
import { correlateGlucoseSamples } from './healthEventCorrelator';
import {
  appendHealthEvents,
  loadGlucoseRangeState,
  loadHealthEvents,
  loadLastProcessedSampleMs,
  saveGlucoseRangeState,
  saveLastProcessedSampleMs,
  type HealthCorrelatedEvent,
} from './healthEventStorage';
import { loadTrail, matchLocationAtTime } from './locationTrail';
import { isLocationCorrelationEnabled } from './locationCorrelationSettings';
import { areEventNotificationsMuted } from './eventNotificationSettings';
import { Notifications } from './expoNotifications';

type HealthKitValueSample = {
  value?: number;
  startDate?: string;
  endDate?: string;
};

function sampleTimestampMs(sample: HealthKitValueSample): number {
  const raw = sample.startDate ?? sample.endDate;
  if (!raw) {
    return 0;
  }
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function loadHealthKitGlucoseSamplesSince(
  healthKit: HealthKitApi,
  startDate: string,
  endDate: string,
): Promise<HealthKitValueSample[]> {
  return new Promise((resolve) => {
    if (!healthKit.getBloodGlucoseSamples) {
      resolve([]);
      return;
    }
    healthKit.getBloodGlucoseSamples(
      {
        startDate,
        endDate,
        unit: healthKit.Constants?.Units?.mgPerdL ?? 'mgPerdL',
        ascending: true,
      },
      (_error, result) => {
        resolve(result ?? []);
      },
    );
  });
}

function mapHealthKitSamples(samples: HealthKitValueSample[]): GlucoseSampleInput[] {
  return samples
    .map((sample) => {
      const valueMgDl = typeof sample.value === 'number' ? sample.value : Number(sample.value);
      const timestampMs = sampleTimestampMs(sample);
      if (!Number.isFinite(valueMgDl) || valueMgDl <= 0 || !timestampMs) {
        return null;
      }
      return { valueMgDl, timestampMs, source: 'healthkit' as const };
    })
    .filter((row): row is GlucoseSampleInput => row != null);
}

async function notifyForEvents(events: HealthCorrelatedEvent[]): Promise<void> {
  if (!Notifications?.scheduleNotificationAsync) {
    return;
  }
  if (await areEventNotificationsMuted()) {
    return;
  }
  for (const event of events) {
    if (event.direction === 'returned_in_range') {
      continue;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'PRISM glucose alert',
          body: event.message,
          sound: true,
        },
        trigger: null,
      });
    } catch {
      // Ignore notification failures.
    }
  }
}

export type ProcessGlucoseEventsResult = {
  newEvents: HealthCorrelatedEvent[];
  allEvents: HealthCorrelatedEvent[];
};

export async function processGlucoseEvents(healthKit: HealthKitApi, now = new Date()): Promise<ProcessGlucoseEventsResult> {
  const correlationEnabled = await isLocationCorrelationEnabled();
  const [cursorMs, previousState, trail, existingEvents] = await Promise.all([
    loadLastProcessedSampleMs(),
    loadGlucoseRangeState(),
    correlationEnabled ? loadTrail() : Promise.resolve([]),
    loadHealthEvents(),
  ]);

  const lookbackStart = new Date(Math.max(0, cursorMs - 60 * 60 * 1000, now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const samples = await loadHealthKitGlucoseSamplesSince(
    healthKit,
    lookbackStart.toISOString(),
    now.toISOString(),
  );
  const mapped = mapHealthKitSamples(samples);
  const newSamples = mapped.filter((sample) => sample.timestampMs > cursorMs);

  const existingEventIds = new Set(existingEvents.map((event) => event.id));
  const { events, nextState } = correlateGlucoseSamples(
    newSamples,
    previousState,
    (timestampMs) => (correlationEnabled ? matchLocationAtTime(trail, timestampMs) : null),
    existingEventIds,
  );

  if (newSamples.length > 0) {
    const maxTs = Math.max(...newSamples.map((sample) => sample.timestampMs));
    await saveLastProcessedSampleMs(maxTs);
  }
  await saveGlucoseRangeState(nextState);

  const allEvents = await appendHealthEvents(events);
  await notifyForEvents(events);

  return { newEvents: events, allEvents };
}

export async function processGlucoseEventsIfEnabled(healthKit: HealthKitApi): Promise<ProcessGlucoseEventsResult | null> {
  const enabled = await isLocationCorrelationEnabled();
  if (!enabled) {
    return null;
  }
  return processGlucoseEvents(healthKit);
}
