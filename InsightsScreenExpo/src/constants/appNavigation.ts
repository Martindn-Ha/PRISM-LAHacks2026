export const ACTIVITY = [
  { label: 'STEPS', value: '6,842', fill: 85, color: '#22c55e' },
  { label: 'SLEEP', value: '7h 15m', fill: 95, color: '#22c55e' },
  { label: 'MEDS', value: '2/2', fill: 100, color: '#22c55e' },
  { label: 'WATER', value: '6gl', fill: 75, color: '#3b82f6' },
];

export const NAV_ITEMS = [
  { label: 'Personality', icon: 'personality' },
  { label: 'Insights', icon: 'insights' },
  { label: 'Dashboard', icon: 'home' },
  { label: 'Swipes', icon: 'swipes' },
  { label: 'Goals', icon: 'goals' },
] as const;

export const CENTER_NAV_LABEL = 'Dashboard' as const;

export type NavItemLabel = (typeof NAV_ITEMS)[number]['label'];
export type NavIconKey = (typeof NAV_ITEMS)[number]['icon'];
