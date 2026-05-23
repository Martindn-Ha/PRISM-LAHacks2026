export const ACTIVITY = [
  { label: 'STEPS', value: '6,842', fill: 85, color: '#22c55e' },
  { label: 'SLEEP', value: '7h 15m', fill: 95, color: '#22c55e' },
  { label: 'MEDS', value: '2/2', fill: 100, color: '#22c55e' },
  { label: 'WATER', value: '6gl', fill: 75, color: '#3b82f6' },
];

export const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◉' },
  { label: 'Insights', icon: '◌' },
  { label: 'Swipes', icon: '⇄' },
  { label: 'Map', icon: '⌖' },
  { label: 'Goals', icon: '◎' },
];

export const MAP_LAYERS = ['All'] as const;
export type MapLayerFilter = (typeof MAP_LAYERS)[number];

export const GOALS_TABS = ['Active', 'Communities', 'Challenges'] as const;
export type GoalsTab = (typeof GOALS_TABS)[number];

export const CHALLENGE_FILTERS = ['All', 'Personal', 'Community'] as const;
export type ChallengeFilter = (typeof CHALLENGE_FILTERS)[number];

export type GoalChallenge = {
  title: string;
  detail: string;
  members: string;
  type: 'personal' | 'community';
};

export const GOALS_CHALLENGES: GoalChallenge[] = [
  { title: 'Campus Hydration Week', detail: 'Community goal: 10k cups logged', members: '248 joined', type: 'community' },
  { title: 'Indoor Movement Streak', detail: 'When AQI is rough, move inside', members: '132 joined', type: 'community' },
  { title: '7-Day Sleep Wind-Down', detail: 'Power down screens 30 minutes before bed', members: 'Solo plan', type: 'personal' },
];
