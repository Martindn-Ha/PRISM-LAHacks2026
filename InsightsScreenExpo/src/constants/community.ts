import type { CommunityEventItem } from '../types/experience';

/** Populated at runtime when community events load; kept as stable references for state seeds. */
export const COMMUNITY_UPCOMING_EVENTS: CommunityEventItem[] = [];
export const COMMUNITY_PAST_EVENTS: CommunityEventItem[] = [];

export const COMMUNITY_DISCOVERY = [
  { name: 'LAHacks2026', city: 'Los Angeles, CA', members: '16,302 members' },
  { name: 'Mindful Minutes', city: 'Los Angeles, CA', members: '36,285 members' },
  { name: 'Hydration Squad', city: 'Los Angeles, CA', members: '20,217 members' },
  { name: 'Campus Recovery Club', city: 'Los Angeles, CA', members: '19,784 members' },
  { name: 'Morning Reset Group', city: 'Santa Monica, CA', members: '12,904 members' },
  { name: 'Sunset Walk Circle', city: 'Pasadena, CA', members: '9,846 members' },
  { name: 'Breathwork Collective', city: 'Irvine, CA', members: '14,119 members' },
  { name: 'Focus & Flow Crew', city: 'Long Beach, CA', members: '8,672 members' },
  { name: 'Weekly Wellness Wins', city: 'Glendale, CA', members: '11,530 members' },
  { name: 'Healthy Habits Hub', city: 'Burbank, CA', members: '13,407 members' },
  { name: 'Balanced Students Network', city: 'Westwood, CA', members: '7,994 members' },
  { name: 'Recover & Recharge', city: 'Culver City, CA', members: '10,288 members' },
] as const;

export const COMMUNITY_ACTIONS = [
  { label: 'Invite', icon: '+' },
  { label: 'Share', icon: '↗' },
  { label: 'Overview', icon: 'i' },
  { label: 'Events', icon: '◫' },
  { label: 'Progress Board', icon: '▤' },
] as const;

export const COMMUNITY_PROGRESS_POSTS = [
  { id: '1', author: 'Maya R.', time: '2h ago', caption: 'Hit my hydration target for 5 straight days. Feeling sharp.', imageLabel: 'Hydration check-in photo' },
  { id: '2', author: 'Ethan K.', time: 'Yesterday', caption: 'Morning walk streak keeps growing. 7 days in a row.', imageLabel: 'Morning walk snapshot' },
  { id: '3', author: 'Nora P.', time: '2d ago', caption: 'Sleep score improved after reducing caffeine at night.', imageLabel: 'Sleep stats screenshot' },
] as const;

export const COMMUNITY_OVERVIEW_DESCRIPTION =
  'This community helps members build consistent wellness habits through shared accountability, weekly events, and progress updates.';
