import type { DailyCheckinInput, InsightOutput, ResourceRecommendation } from '../types/wellness';

function buildRecommendations(input: DailyCheckinInput): ResourceRecommendation[] {
  const base: ResourceRecommendation[] = [
    {
      id: 'hydration-1',
      title: 'Hydration Reset',
      why: 'Small hydration actions improve energy and recovery quickly.',
      actionType: 'hydration',
    },
  ];

  if (input.stressLevel >= 7) {
    base.push({
      id: 'breathing-1',
      title: '2-Minute Breathing Break',
      why: 'Stress is elevated today, so a short reset is prioritized.',
      actionType: 'breathing',
    });
  }

  if (input.sleepHours < 6) {
    base.push({
      id: 'movement-1',
      title: 'Light Indoor Walk',
      why: 'Low sleep detected; low-intensity movement is recommended.',
      actionType: 'movement',
    });
  }

  if (input.goal === 'energy') {
    base.push({
      id: 'resource-1',
      title: 'Healthy Dining Option',
      why: 'Supports your energy goal with stable fuel.',
      actionType: 'resource',
    });
  }

  return base.slice(0, 3);
}

export function generateMockInsight(input: DailyCheckinInput): InsightOutput {
  const sleepPenalty = Math.max(0, (7 - input.sleepHours) * 6);
  const stressPenalty = Math.max(0, (input.stressLevel - 5) * 5);
  const activityBonus = Math.max(0, (input.activityLevel - 5) * 2);
  const hydrationBonus = Math.max(0, (input.hydrationLevel - 5) * 2);
  const moodBonus = Math.max(0, (input.moodLevel - 5) * 2);
  const rawScore = 72 - sleepPenalty - stressPenalty + activityBonus + hydrationBonus + moodBonus;
  const score = Math.min(95, Math.max(35, Math.round(rawScore)));

  const summary =
    score >= 80
      ? 'Today looks like a strong day. Keep the momentum with a focused routine.'
      : score <= 50
        ? 'Today looks tougher. Focus on one small recovery action first.'
        : 'Today is mixed. Prioritize hydration and one calming, practical step.';

  return {
    score,
    summary,
    recommendations: buildRecommendations(input),
  };
}
