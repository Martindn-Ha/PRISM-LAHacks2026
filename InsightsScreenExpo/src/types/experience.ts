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
  /** Full street + locality when available from the event listing. */
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

/** Alert log row: one entry per dashboard alert lifecycle event (threshold, recovery, dismiss, demo push). Shown in home alert modal. */
export type AlertLogLevel = 'info' | 'warn' | 'error' | 'debug';

export type AlertLogEvent = {
  id: string;
  at: string;
  level: AlertLogLevel;
  source: string;
  message: string;
  glucoseValue?: number;
  glucoseAt?: string;
  latitude?: number;
  longitude?: number;
  locationAt?: string;
  direction?: string;
};
