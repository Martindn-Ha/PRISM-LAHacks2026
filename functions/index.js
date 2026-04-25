const functions = require('firebase-functions');
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY ?? '';
const EVENTBRITE_PRIVATE_TOKEN = process.env.EVENTBRITE_PRIVATE_TOKEN ?? '';
/** Optional: Geocode address-only events in parallel (Maps Geocoding API). */
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

const SOURCE_RELIABILITY = {
  curated: 0.95,
  ticketmaster: 0.85,
  eventbrite: 0.8,
  fallback: 0.6,
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const scoreDistance = (distanceMeters, cutoffMeters = 2000) => clamp01(1 - distanceMeters / cutoffMeters);

const scoreTime = (nowIso, startsAt, endsAt) => {
  if (!startsAt || !endsAt) {
    return 0.5;
  }
  const now = new Date(nowIso).getTime();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(now) || Number.isNaN(start) || Number.isNaN(end)) {
    return 0.5;
  }
  if (now >= start && now <= end) {
    return 1;
  }
  if (now < start) {
    const minsUntilStart = (start - now) / 60000;
    return clamp01(1 - minsUntilStart / 120);
  }
  const minsSinceEnd = (now - end) / 60000;
  return clamp01(1 - minsSinceEnd / 60);
};

const scoreContextFit = (candidateType, desiredType) => {
  if (!candidateType || !desiredType) {
    return 0.5;
  }
  if (candidateType === desiredType) {
    return 1;
  }
  return 0.3;
};

const scoreCandidate = ({ distanceMeters, startsAt, endsAt, type, source }, { nowIso, desiredType }) => {
  const distance = scoreDistance(distanceMeters);
  const time = scoreTime(nowIso, startsAt, endsAt);
  const fit = scoreContextFit(type, desiredType);
  const sourceReliability = SOURCE_RELIABILITY[source] ?? 0.5;
  const finalScore = 0.4 * distance + 0.3 * time + 0.2 * fit + 0.1 * sourceReliability;
  return {
    finalScore: clamp01(finalScore),
    components: {
      distance,
      time,
      fit,
      source: sourceReliability,
    },
  };
};

const sendJson = (res, status, payload) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.status(status).json(payload);
};

const GEOCODE_META_SKIP = new Set(['Location TBD', 'Online event']);

const geocodeQueryForEvent = (event) => {
  const fromAddress = typeof event.address === 'string' && event.address.trim();
  if (fromAddress) {
    return fromAddress;
  }
  const meta = typeof event.meta === 'string' && event.meta.trim();
  if (!meta || GEOCODE_META_SKIP.has(meta)) {
    return null;
  }
  return meta;
};

const eventHasCoordinates = (event) => {
  const { latitude: la, longitude: lo } = event;
  return typeof la === 'number' && typeof lo === 'number' && Number.isFinite(la) && Number.isFinite(lo);
};

const eventNeedsGeocode = (event) => !eventHasCoordinates(event) && Boolean(geocodeQueryForEvent(event));

const geocodeWithGoogle = async (query) => {
  if (!GOOGLE_MAPS_API_KEY.trim()) {
    return null;
  }
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
    return null;
  }
  const { lat, lng } = data.results[0].geometry.location;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { latitude: lat, longitude: lng };
};

const geocodeWithNominatim = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'LAHacks2026-CommunityEvents/1.0 (Firebase Cloud Function)',
    },
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) {
    return null;
  }
  const la = parseFloat(data[0].lat);
  const lo = parseFloat(data[0].lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return null;
  }
  return { latitude: la, longitude: lo };
};

/**
 * Map UIs need lat/lon. When the provider omits coordinates but we have an address (or city line),
 * fill coordinates via Google (if GOOGLE_MAPS_API_KEY) or OpenStreetMap Nominatim (slower, capped).
 */
const enrichEventsWithGeocodedCoords = async (events) => {
  const queriesInOrder = [];
  const seen = new Set();
  for (const event of events) {
    if (!eventNeedsGeocode(event)) {
      continue;
    }
    const q = geocodeQueryForEvent(event);
    if (!q || q.length < 4 || seen.has(q)) {
      continue;
    }
    seen.add(q);
    queriesInOrder.push(q);
  }
  if (queriesInOrder.length === 0) {
    return {
      events,
      geocodingMeta: {
        provider: 'none',
        eventsMissingCoordsBefore: events.filter((e) => !eventHasCoordinates(e)).length,
        queriesRun: 0,
        coordsFilledForEvents: 0,
      },
    };
  }

  const coordByQuery = new Map();
  let provider = 'none';

  if (GOOGLE_MAPS_API_KEY.trim()) {
    provider = 'google';
    await Promise.all(
      queriesInOrder.map(async (q) => {
        const c = await geocodeWithGoogle(q);
        if (c) {
          coordByQuery.set(q, c);
        }
      }),
    );
  } else {
    provider = 'nominatim';
    const cap = Math.min(queriesInOrder.length, 12);
    for (let i = 0; i < cap; i++) {
      const q = queriesInOrder[i];
      const c = await geocodeWithNominatim(q);
      if (c) {
        coordByQuery.set(q, c);
      }
      if (i + 1 < cap) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }
  }

  const missingBefore = events.filter((e) => !eventHasCoordinates(e)).length;
  const nextEvents = events.map((e) => {
    if (!eventNeedsGeocode(e)) {
      return e;
    }
    const q = geocodeQueryForEvent(e);
    if (!q) {
      return e;
    }
    const c = coordByQuery.get(q);
    if (!c) {
      return e;
    }
    return { ...e, latitude: c.latitude, longitude: c.longitude };
  });
  const missingAfter = nextEvents.filter((e) => !eventHasCoordinates(e)).length;

  return {
    events: nextEvents,
    geocodingMeta: {
      provider,
      googleConfigured: GOOGLE_MAPS_API_KEY.trim().length > 0,
      eventsMissingCoordsBefore: missingBefore,
      eventsMissingCoordsAfter: missingAfter,
      coordsFilledForEvents: missingBefore - missingAfter,
      queriesRun: GOOGLE_MAPS_API_KEY.trim() ? queriesInOrder.length : Math.min(queriesInOrder.length, 12),
      nominatimCapped: !GOOGLE_MAPS_API_KEY.trim() && queriesInOrder.length > 12,
    },
  };
};

const formatTicketmasterVenueAddress = (venue) => {
  if (!venue) {
    return '';
  }
  const line1 = venue.address?.line1 ?? '';
  const line2 = venue.address?.line2 ?? '';
  const line3 = venue.address?.line3 ?? '';
  const cityName = venue.city?.name ?? '';
  const stateCode = venue.state?.stateCode ?? '';
  const postalCode = venue.postalCode ?? venue.address?.postalCode ?? '';
  const country = venue.country?.name ?? venue.country?.countryCode ?? '';
  const streetBlock = [line1, line2, line3].filter((part) => part && String(part).trim()).join(', ');
  const cityState = [cityName, stateCode].filter(Boolean).join(', ');
  const localityBlock = [cityState, postalCode].filter(Boolean).join(' ').trim();
  const withCountry = [localityBlock, country].filter(Boolean).join(', ');
  const parts = [streetBlock, withCountry].filter(Boolean);
  return parts.join(' · ') || '';
};

const formatEventbriteVenueAddress = (venue, isOnline) => {
  if (!venue || isOnline) {
    return '';
  }
  const addr = venue.address ?? {};
  const localized = addr.localized_address_display ?? addr.localized_multi_line_display;
  if (typeof localized === 'string' && localized.trim()) {
    return localized.trim();
  }
  if (Array.isArray(localized)) {
    const joined = localized.filter(Boolean).map((s) => String(s).trim()).filter(Boolean).join(', ');
    if (joined) {
      return joined;
    }
  }
  const line1 = addr.address_1 ?? '';
  const line2 = addr.address_2 ?? '';
  const cityName = addr.city ?? '';
  const region = addr.region ?? '';
  const postal = addr.postal_code ?? '';
  const country = addr.country ?? '';
  const streetBlock = [line1, line2].filter((part) => part && String(part).trim()).join(', ');
  const cityState = [cityName, region].filter(Boolean).join(', ');
  const localityBlock = [cityState, postal].filter(Boolean).join(' ').trim();
  const withCountry = [localityBlock, country].filter(Boolean).join(', ');
  const parts = [streetBlock, withCountry].filter(Boolean);
  return parts.join(' · ') || '';
};

const parseTicketmasterEvent = (event) => {
  const localDate = event?.dates?.start?.localDate;
  const localTime = event?.dates?.start?.localTime ?? '';
  const startIso = event?.dates?.start?.dateTime ?? (localDate ? `${localDate}T${localTime || '00:00:00'}Z` : null);
  const startDate = startIso ? new Date(startIso) : null;
  const venue = event?._embedded?.venues?.[0];
  const city = venue?.city?.name ?? '';
  const state = venue?.state?.stateCode ?? venue?.country?.countryCode ?? '';
  const distanceMeters = typeof event?.distance === 'number' ? Math.round(event.distance * 1609.34) : null;
  const address = formatTicketmasterVenueAddress(venue);
  const loc = venue?.location;
  const rawLat = loc?.latitude;
  const rawLon = loc?.longitude;
  let latitude = null;
  let longitude = null;
  if (rawLat != null && rawLon != null && rawLat !== '' && rawLon !== '') {
    const la = Number(rawLat);
    const lo = Number(rawLon);
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      latitude = la;
      longitude = lo;
    }
  }
  const metaFallback = [city, state].filter(Boolean).join(', ') || 'Location TBD';
  const meta = address || metaFallback;
  return {
    id: event?.id ?? `${event?.name ?? 'event'}-${startIso ?? 'unknown'}`,
    title: event?.name ?? 'Untitled event',
    venue: venue?.name ?? 'Unknown venue',
    address: address || null,
    latitude,
    longitude,
    startTime: startIso,
    distanceMeters,
    source: 'ticketmaster',
    sourceUrl: event?.url ?? null,
    month: startDate ? startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'TBD',
    day: startDate ? String(startDate.getDate()) : '--',
    dow: startDate ? startDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase() : 'TBD',
    meta,
    rsvp: 'Live event listing',
  };
};

const parseEventbriteEvent = (event) => {
  const startIso = event?.start?.utc ?? null;
  const startDate = startIso ? new Date(startIso) : null;
  const isOnline = Boolean(event?.online_event);
  const venueName = isOnline ? 'Online event' : (event?.venue?.name ?? 'Unknown venue');
  const city = event?.venue?.address?.city ?? '';
  const region = event?.venue?.address?.region ?? event?.venue?.address?.country ?? '';
  let latitude = null;
  let longitude = null;
  const ven = event?.venue;
  if (ven && !isOnline) {
    const la = ven.latitude != null && ven.latitude !== '' ? Number(ven.latitude) : NaN;
    const lo = ven.longitude != null && ven.longitude !== '' ? Number(ven.longitude) : NaN;
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      latitude = la;
      longitude = lo;
    }
  }
  const address = formatEventbriteVenueAddress(ven, isOnline);
  const metaFallback = isOnline
    ? 'Online event'
    : [city, region].filter(Boolean).join(', ') || 'Location TBD';
  const meta = address || metaFallback;
  return {
    id: event?.id ?? `${event?.name?.text ?? 'event'}-${startIso ?? 'unknown'}`,
    title: event?.name?.text ?? 'Untitled event',
    venue: venueName,
    address: address || null,
    latitude,
    longitude,
    startTime: startIso,
    distanceMeters: null,
    source: 'eventbrite',
    sourceUrl: event?.url ?? null,
    month: startDate ? startDate.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'TBD',
    day: startDate ? String(startDate.getDate()) : '--',
    dow: startDate ? startDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase() : 'TBD',
    meta,
    rsvp: 'Source: Eventbrite',
  };
};

const toTicketmasterDateTime = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

const fetchTicketmasterEvents = async ({ lat, lon, tab }) => {
  if (!TICKETMASTER_API_KEY.trim()) {
    return [];
  }
  const nowIso = toTicketmasterDateTime(new Date());
  const params = new URLSearchParams({
    apikey: TICKETMASTER_API_KEY,
    latlong: `${lat},${lon}`,
    radius: '25',
    unit: 'miles',
    locale: '*',
    size: '20',
    sort: tab === 'Past' ? 'date,desc' : 'date,asc',
  });
  if (tab === 'Past') {
    params.set('endDateTime', nowIso);
  } else {
    params.set('startDateTime', nowIso);
  }
  const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = '';
    }
    throw new Error(`Ticketmaster request failed (${response.status})${errorText ? `: ${errorText}` : ''}`);
  }
  const json = await response.json();
  const events = json?._embedded?.events;
  if (!Array.isArray(events)) {
    return [];
  }
  return events.map(parseTicketmasterEvent);
};

const fetchEventbriteEvents = async ({ lat, lon, tab }) => {
  if (!EVENTBRITE_PRIVATE_TOKEN.trim()) {
    return [];
  }
  const now = new Date();
  const nowIso = now.toISOString();
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${EVENTBRITE_PRIVATE_TOKEN}`,
  };
  const orgsResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', { method: 'GET', headers });
  if (!orgsResponse.ok) {
    const err = await orgsResponse.text();
    throw new Error(`Eventbrite org fetch failed (${orgsResponse.status})${err ? `: ${err}` : ''}`);
  }
  const orgsJson = await orgsResponse.json();
  const organizations = Array.isArray(orgsJson?.organizations) ? orgsJson.organizations : [];
  if (organizations.length === 0) {
    return [];
  }

  const eventResults = await Promise.allSettled(
    organizations.map(async (org) => {
      const orgId = org?.id;
      if (!orgId) {
        return [];
      }
      const params = new URLSearchParams({
        expand: 'venue',
        order_by: tab === 'Past' ? 'start_desc' : 'start_asc',
        status: tab === 'Past' ? 'ended' : 'live,started',
        page_size: '20',
      });
      const response = await fetch(`https://www.eventbriteapi.com/v3/organizations/${orgId}/events/?${params.toString()}`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Eventbrite org events failed (${response.status})${err ? `: ${err}` : ''}`);
      }
      const json = await response.json();
      const events = Array.isArray(json?.events) ? json.events : [];
      return events
        .filter((event) => {
          const startIso = event?.start?.utc;
          if (!startIso) {
            return false;
          }
          const start = new Date(startIso).getTime();
          if (Number.isNaN(start)) {
            return false;
          }
          return tab === 'Past' ? start < now.getTime() : start >= now.getTime();
        })
        .map(parseEventbriteEvent);
    }),
  );

  return eventResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
};

exports.nearbyEventContext = functions
  .region('us-west1')
  .runWith({
    serviceAccount: 'lahacks2026@appspot.gserviceaccount.com',
  })
  .https.onRequest((req, res) => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Use POST' });
    }

    const { lat, lon, timestamp, communityId } = req.body || {};
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return sendJson(res, 400, { error: 'lat and lon are required as numbers' });
    }

    const nowIso = typeof timestamp === 'string' ? timestamp : new Date().toISOString();
    const hasTicketmasterKey = TICKETMASTER_API_KEY.trim().length > 0;
    const communityIdText = typeof communityId === 'string' ? communityId.toLowerCase() : '';
    const isLahacksCommunity = communityIdText.includes('lahacks2026');
    const desiredType = communityIdText.includes('hydration')
      ? 'hydration'
      : communityIdText.includes('stress')
        ? 'quiet-space'
        : isLahacksCommunity
          ? 'community-event'
        : undefined;
    const eventStart = nowIso;
    const eventEnd = new Date(new Date(nowIso).getTime() + 2 * 60 * 60 * 1000).toISOString();

    const eventScore = scoreCandidate(
      {
        distanceMeters: 180,
        startsAt: eventStart,
        endsAt: eventEnd,
        type: 'community-event',
        source: 'curated',
      },
      { nowIso, desiredType },
    );

    const rawResources = [
      {
        type: 'hydration',
        name: 'Hydration Station',
        distanceMeters: 140,
        startsAt: eventStart,
        endsAt: eventEnd,
        source: 'curated',
      },
      {
        type: 'community-event',
        name: 'Pauley Pavilion',
        distanceMeters: 200,
        startsAt: eventStart,
        endsAt: eventEnd,
        source: 'curated',
      },
      {
        type: 'quiet-space',
        name: 'Study Lounge',
        distanceMeters: 260,
        startsAt: eventStart,
        endsAt: eventEnd,
        source: 'curated',
      },
    ];
    const scoredResources = rawResources
      .map((resource) => {
        const score = scoreCandidate(resource, { nowIso, desiredType });
        const lahacksBoost = isLahacksCommunity && resource.name === 'Pauley Pavilion' ? 0.15 : 0;
        const boostedScore = clamp01(score.finalScore + lahacksBoost);
        return {
          ...resource,
          confidence: Number(boostedScore.toFixed(2)),
          scoringComponents: {
            distance: Number(score.components.distance.toFixed(2)),
            time: Number(score.components.time.toFixed(2)),
            fit: Number(score.components.fit.toFixed(2)),
            source: Number(score.components.source.toFixed(2)),
            lahacksBoost: Number(lahacksBoost.toFixed(2)),
          },
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .map(({ startsAt, endsAt, source, ...rest }) => rest);
    const topEventConfidence = Number(eventScore.finalScore.toFixed(2));
    const eventDetected = topEventConfidence >= 0.65;

    return sendJson(res, 200, {
      eventDetected,
      event: {
        name: 'Nearby Wellness Event',
        venue: 'Campus Center',
        startTime: eventStart,
        endTime: eventEnd,
        confidence: topEventConfidence,
        sourceUrl: 'https://www.lahacks.com',
      },
      resources: scoredResources,
      sourceMeta: {
        primarySource: 'curated',
        sourceReliability: SOURCE_RELIABILITY.curated,
        scoringVersion: 'v1-weighted',
        ticketmasterConfigured: hasTicketmasterKey,
      },
      requestEcho: {
        communityId: typeof communityId === 'string' ? communityId : null,
        lat,
        lon,
        desiredType: desiredType ?? null,
      },
    });
  });

exports.communityEvents = functions
  .region('us-west1')
  .runWith({
    serviceAccount: 'lahacks2026@appspot.gserviceaccount.com',
  })
  .https.onRequest(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      return res.status(204).send('');
    }
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Use GET' });
    }
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const tab = req.query.tab === 'Past' ? 'Past' : 'Upcoming';
    const communityId = typeof req.query.communityId === 'string' ? req.query.communityId : '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return sendJson(res, 400, { error: 'lat/lon query params are required numbers' });
    }
    try {
      const [ticketmasterEvents, eventbriteEvents] = await Promise.allSettled([
        fetchTicketmasterEvents({ lat, lon, tab }),
        fetchEventbriteEvents({ lat, lon, tab }),
      ]);
      const tmEvents = ticketmasterEvents.status === 'fulfilled' ? ticketmasterEvents.value : [];
      const ebEvents = eventbriteEvents.status === 'fulfilled' ? eventbriteEvents.value : [];
      let events = [...tmEvents, ...ebEvents]
        .filter((event) => Boolean(event.startTime))
        .sort((a, b) => {
          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          if (tab === 'Upcoming') {
            const aEventbrite = a.source === 'eventbrite' ? 1 : 0;
            const bEventbrite = b.source === 'eventbrite' ? 1 : 0;
            if (aEventbrite !== bEventbrite) {
              return bEventbrite - aEventbrite;
            }
            return aTime - bTime;
          }
          return bTime - aTime;
        })
        .slice(0, 25);
      const { events: geocodedEvents, geocodingMeta } = await enrichEventsWithGeocodedCoords(events);
      events = geocodedEvents;
      const providerErrors = [
        ticketmasterEvents.status === 'rejected' ? `ticketmaster: ${String(ticketmasterEvents.reason)}` : null,
        eventbriteEvents.status === 'rejected' ? `eventbrite: ${String(eventbriteEvents.reason)}` : null,
      ].filter(Boolean);
      return sendJson(res, 200, {
        events,
        sourceMeta: {
          providers: ['ticketmaster', 'eventbrite'],
          ticketmasterConfigured: TICKETMASTER_API_KEY.trim().length > 0,
          eventbriteConfigured: EVENTBRITE_PRIVATE_TOKEN.trim().length > 0,
          tab,
          communityId,
          count: events.length,
          generatedAt: new Date().toISOString(),
          errors: providerErrors,
          geocoding: geocodingMeta,
        },
      });
    } catch (error) {
      return sendJson(res, 200, {
        events: [],
        sourceMeta: {
          provider: 'ticketmaster',
          ticketmasterConfigured: TICKETMASTER_API_KEY.trim().length > 0,
          tab,
          communityId,
          count: 0,
          generatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
