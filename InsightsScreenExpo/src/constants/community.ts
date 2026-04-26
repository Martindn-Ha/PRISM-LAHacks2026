import type { CommunityEventItem } from '../types/experience';

/** Populated at runtime when community events load; kept as stable references for state seeds. */
export const COMMUNITY_UPCOMING_EVENTS: CommunityEventItem[] = [];
export const COMMUNITY_PAST_EVENTS: CommunityEventItem[] = [];

/** Deterministic placeholder art per community (Lorem Picsum; requires network on first load). */
const communityCoverUrl = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/720/360`;

export const COMMUNITY_DISCOVERY = [
  { name: 'LAHacks2026', city: 'Los Angeles, CA', members: '16,302 members', coverUrl: communityCoverUrl('cw-lahacks-2026') },
  { name: 'Mindful Minutes', city: 'Los Angeles, CA', members: '36,285 members', coverUrl: communityCoverUrl('cw-mindful-minutes') },
  { name: 'Hydration Squad', city: 'Los Angeles, CA', members: '20,217 members', coverUrl: communityCoverUrl('cw-hydration') },
  { name: 'Campus Recovery Club', city: 'Los Angeles, CA', members: '19,784 members', coverUrl: communityCoverUrl('cw-campus-recovery') },
  { name: 'Morning Reset Group', city: 'Santa Monica, CA', members: '12,904 members', coverUrl: communityCoverUrl('cw-morning-reset') },
  { name: 'Sunset Walk Circle', city: 'Pasadena, CA', members: '9,846 members', coverUrl: communityCoverUrl('cw-sunset-walk') },
  { name: 'Breathwork Collective', city: 'Irvine, CA', members: '14,119 members', coverUrl: communityCoverUrl('cw-breathwork') },
  { name: 'Focus & Flow Crew', city: 'Long Beach, CA', members: '8,672 members', coverUrl: communityCoverUrl('cw-focus-flow') },
  { name: 'Weekly Wellness Wins', city: 'Glendale, CA', members: '11,530 members', coverUrl: communityCoverUrl('cw-weekly-wins') },
  { name: 'Healthy Habits Hub', city: 'Burbank, CA', members: '13,407 members', coverUrl: communityCoverUrl('cw-healthy-habits') },
  { name: 'Balanced Students Network', city: 'Westwood, CA', members: '7,994 members', coverUrl: communityCoverUrl('cw-balanced-students') },
  { name: 'Recover & Recharge', city: 'Culver City, CA', members: '10,288 members', coverUrl: communityCoverUrl('cw-recover-recharge') },
] as const;

export type CommunityDiscoveryItem = (typeof COMMUNITY_DISCOVERY)[number];

export const COMMUNITY_ACTIONS = [
  { label: 'Invite', icon: '+' },
  { label: 'Share', icon: '↗' },
  { label: 'Overview', icon: 'i' },
  { label: 'Events', icon: '◫' },
  { label: 'Progress Board', icon: '▤' },
] as const;

/** Stock photos aligned with each seed caption (Unsplash). */
export const COMMUNITY_PROGRESS_POSTS = [
  {
    id: '1',
    author: 'Maya R.',
    time: '2h ago',
    caption: 'Hit my hydration target for 5 straight days. Feeling sharp.',
    imageLabel: 'Hydration check-in photo',
    demoCoverUrl:
      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '2',
    author: 'Ethan K.',
    time: 'Yesterday',
    caption: 'Morning walk streak keeps growing. 7 days in a row.',
    imageLabel: 'Morning walk snapshot',
    demoCoverUrl:
      'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: '3',
    author: 'Nora P.',
    time: '2d ago',
    caption: 'Sleep score improved after reducing caffeine at night.',
    imageLabel: 'Sleep stats screenshot',
    demoCoverUrl:
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80',
  },
] as const;

export const COMMUNITY_OVERVIEW_DESCRIPTION =
  'This community helps members build consistent wellness habits through shared accountability, weekly events, and progress updates.';
