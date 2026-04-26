import { ARISTA_COMMUNITY_EVENTS_URL, ARISTA_CONTEXT_URL } from '../config/publicEnv';
import type { AristaContextPayload, CommunityEventItem } from '../types/experience';

export const fetchAristaContext = async (payload: {
  lat: number;
  lon: number;
  timestamp: string;
  communityId: string;
}): Promise<AristaContextPayload | null> => {
  if (!ARISTA_CONTEXT_URL.trim()) {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(ARISTA_CONTEXT_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return null;
    }
    const json = await response.json() as AristaContextPayload;
    return json;
  } catch {
    return null;
  }
};

export const fetchAristaCommunityEvents = async (payload: {
  lat: number;
  lon: number;
  communityId: string;
  tab: 'Upcoming' | 'Past';
}): Promise<CommunityEventItem[] | null> => {
  if (!ARISTA_COMMUNITY_EVENTS_URL.trim()) {
    return null;
  }
  try {
    const params = new URLSearchParams({
      lat: String(payload.lat),
      lon: String(payload.lon),
      communityId: payload.communityId,
      tab: payload.tab,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${ARISTA_COMMUNITY_EVENTS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return null;
    }
    const json = await response.json() as { events?: Array<CommunityEventItem> };
    if (!Array.isArray(json.events)) {
      return [];
    }
    return json.events.map((event) => ({
      id: event.id,
      month: event.month,
      day: event.day,
      dow: event.dow,
      title: event.title,
      meta: event.meta,
      rsvp: event.rsvp,
      sourceUrl: event.sourceUrl ?? null,
      source: event.source ?? null,
      venue: event.venue ?? null,
      address: typeof event.address === 'string' && event.address.trim().length > 0 ? event.address.trim() : null,
      latitude: typeof event.latitude === 'number' && Number.isFinite(event.latitude) ? event.latitude : null,
      longitude: typeof event.longitude === 'number' && Number.isFinite(event.longitude) ? event.longitude : null,
    }));
  } catch {
    return null;
  }
};
