export type ProfileBadge = {
  id: string;
  name: string;
  /** Short symbol shown in the badge tile. */
  glyph: string;
  unlocked: boolean;
};

/** Demo achievements for the profile showcase; `unlocked` drives filled vs greyed styling. */
export const PROFILE_BADGES: ProfileBadge[] = [
  { id: 'first-steps', name: 'First Steps', glyph: '👟', unlocked: true },
  { id: 'hydration-hero', name: 'Hydration Hero', glyph: '💧', unlocked: true },
  { id: 'insight-explorer', name: 'Insight Explorer', glyph: '◌', unlocked: true },
  { id: 'community-spark', name: 'Community Spark', glyph: '◎', unlocked: true },
  { id: 'balance-seeker', name: 'Balance Seeker', glyph: '☯', unlocked: true },
  { id: 'iron-circadian', name: 'Iron Circadian', glyph: '🌙', unlocked: false },
  { id: 'marathon-month', name: 'Marathon Month', glyph: '📈', unlocked: false },
  { id: 'zen-anchor', name: 'Zen Anchor', glyph: '🧘', unlocked: false },
  { id: 'prism-luminary', name: 'Prism Luminary', glyph: '✦', unlocked: false },
  { id: 'beacon-mentor', name: 'Beacon Mentor', glyph: '🗼', unlocked: false },
];
