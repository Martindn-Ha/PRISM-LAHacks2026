export type ScoreBand = 'high' | 'medium' | 'low';

export interface ScorePresentation {
  band: ScoreBand;
  label: string;
  subtitle: string;
  color: string;
}

export interface DailyCheckinInput {
  sleepHours: number;
  stressLevel: number;
  moodLevel: number;
  hydrationLevel: number;
  activityLevel: number;
  notes?: string;
  goal: 'recovery' | 'energy' | 'stress' | 'sleep' | 'general';
}

export interface ResourceRecommendation {
  id: string;
  title: string;
  why: string;
  actionType: 'hydration' | 'movement' | 'breathing' | 'sleep' | 'resource';
}

export interface InsightOutput {
  score: number;
  summary: string;
  recommendations: ResourceRecommendation[];
}
