export type HealthLogLevel = 'info' | 'warn' | 'error' | 'debug';

export type HealthLogEvent = {
  id: string;
  /** ISO-like timestamp string for stable demo ordering */
  at: string;
  level: HealthLogLevel;
  /** e.g. metric family or HealthKit sample type bucket */
  source: string;
  message: string;
};

/** Static demo health events for the Health logs tab (replace with real HealthKit / sync pipeline later). */
export const DUMMY_HEALTH_LOG_EVENTS: HealthLogEvent[] = [
  {
    id: 'hl-1',
    at: '2026-04-26T06:45:00.000Z',
    level: 'info',
    source: 'apple-health',
    message: 'Background delivery: 847 new step count samples merged for Apr 25–26.',
  },
  {
    id: 'hl-2',
    at: '2026-04-26T07:12:33.441Z',
    level: 'info',
    source: 'sleep',
    message: 'Sleep analysis window closed: 7h 15m in bed, 6h 48m asleep (Apple Watch).',
  },
  {
    id: 'hl-3',
    at: '2026-04-26T08:03:18.102Z',
    level: 'warn',
    source: 'heart-rate',
    message: 'Resting HR spike vs 14-day baseline (+12 bpm); flagged for review in Insights.',
  },
  {
    id: 'hl-4',
    at: '2026-04-26T08:30:00.000Z',
    level: 'debug',
    source: 'blood-glucose',
    message: 'CGM curve smoothed (3-point median); 42 readings attached to daily glucose card.',
  },
  {
    id: 'hl-5',
    at: '2026-04-26T09:15:22.550Z',
    level: 'info',
    source: 'medications',
    message: 'Dose event logged: Metformin 500mg — matches scheduled reminder window.',
  },
  {
    id: 'hl-6',
    at: '2026-04-26T10:02:09.881Z',
    level: 'warn',
    source: 'hydration',
    message: 'Water intake below goal at midday (4/8 glasses); nudge suppressed (focus mode).',
  },
  {
    id: 'hl-7',
    at: '2026-04-26T11:40:44.200Z',
    level: 'info',
    source: 'mindfulness',
    message: 'Mindful minute session 8m recorded; HRV snapshot queued for stress tile.',
  },
];
