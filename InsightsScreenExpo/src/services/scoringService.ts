import type { ScorePresentation } from '../types/wellness';

export function getScorePresentation(score: number): ScorePresentation {
  if (score >= 80) {
    return {
      band: 'high',
      label: 'HIGH',
      subtitle: 'Nice job!',
      color: '#22c55e',
    };
  }

  if (score <= 50) {
    return {
      band: 'low',
      label: 'LOW',
      subtitle: "Don't give up!",
      color: '#ef4444',
    };
  }

  return {
    band: 'medium',
    label: 'MEDIUM',
    subtitle: "Keep going, you're making progress.",
    color: '#facc15',
  };
}

export function getNextDemoScore(current: number, direction: 1 | -1, fastMode: boolean) {
  const step = fastMode ? 1.4 : 0.6;
  let next = current + direction * step;
  let nextDirection = direction;

  if (next >= 92) {
    next = 92;
    nextDirection = -1;
  } else if (next <= 38) {
    next = 38;
    nextDirection = 1;
  }

  return { next, nextDirection };
}
