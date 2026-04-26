export type DashboardValueDriftToggles = {
  glucose: boolean;
  stress: boolean;
  heartRateCard: boolean;
  steps: boolean;
  sleep: boolean;
  meds: boolean;
  water: boolean;
};

export type ProgressPostStatus = 'processing' | 'ready' | 'failed';

export type MediaVariants = {
  originalUrl: string;
  feedUrl: string;
  thumbUrl: string;
};

export type AristaEventContext = {
  name?: string;
  venue?: string;
  startTime?: string;
  endTime?: string;
  confidence?: number;
  sourceUrl?: string;
};

export type AristaResourceContext = {
  type?: string;
  name?: string;
  distanceMeters?: number;
  confidence?: number;
};

export type AristaContextPayload = {
  eventDetected?: boolean;
  event?: AristaEventContext | null;
  resources?: AristaResourceContext[];
  sourceMeta?: {
    primarySource?: string;
    sourceReliability?: number;
    scoringVersion?: string;
  };
};

export type CommunityEventItem = {
  id: string;
  month: string;
  day: string;
  dow: string;
  title: string;
  meta: string;
  rsvp: string;
  sourceUrl?: string | null;
  source?: string | null;
  venue?: string | null;
  /** Full street + locality from provider when available (Ticketmaster / Eventbrite venues). */
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type MapScreenPin = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
  pinColor?: string;
  linkedEvent?: CommunityEventItem;
};

export type ProgressBoardPost = {
  id: string;
  author: string;
  time: string;
  caption: string;
  imageLabel: string;
  imageUrl: string | null;
  mediaPublicId: string | null;
  mediaVariants: MediaVariants | null;
  mediaType: 'image';
  status: ProgressPostStatus;
  processingError: string | null;
};

export type InviteContact = {
  id: string;
  name: string;
  phone: string | null;
};
