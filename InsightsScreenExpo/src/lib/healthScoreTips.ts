import type { ComponentScores } from './healthScoreFromMetrics';

export type HealthScoreRaiseTip = {
  key: keyof ComponentScores;
  label: string;
  tip: string;
};

const TIP_DEFS: Array<{ key: keyof ComponentScores; label: string; tip: string }> = [
  {
    key: 'glucose',
    label: 'Glucose',
    tip: 'Walk 10–15 minutes after meals and space large carb portions.',
  },
  {
    key: 'sleep',
    label: 'Sleep',
    tip: 'Set a fixed bedtime tonight and aim for about 7 hours of sleep.',
  },
  {
    key: 'heartRate',
    label: 'Heart rate',
    tip: 'Try 5 minutes of slow breathing and cut caffeine for the day.',
  },
];

/** Tips for score factors that need raising (available and below the strong threshold). */
export function getHealthScoreRaiseTips(components: ComponentScores): HealthScoreRaiseTip[] {
  return TIP_DEFS.map((def) => ({
    ...def,
    score: components[def.key],
  }))
    .filter((row): row is typeof row & { score: number } => row.score != null && Number.isFinite(row.score) && row.score < 0.8)
    .sort((a, b) => a.score - b.score)
    .map(({ key, label, tip }) => ({ key, label, tip }));
}
