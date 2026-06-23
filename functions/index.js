const functions = require('firebase-functions');

const SOURCE_RELIABILITY = {
  curated: 0.95,
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
    const scoredResourcesWithMeta = rawResources
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
      .sort((a, b) => b.confidence - a.confidence);

    const topCommunityEvent = scoredResourcesWithMeta.find((resource) => resource.type === 'community-event') ?? null;
    const topAnyResource = scoredResourcesWithMeta[0] ?? null;
    const selectedEventResource = topCommunityEvent ?? topAnyResource;
    const topEventConfidence = selectedEventResource?.confidence ?? 0;
    const eventDetected = topEventConfidence >= 0.65;
    const eventName = selectedEventResource?.name ?? 'Nearby Wellness Event';
    const eventVenue = selectedEventResource?.name ?? 'Campus Center';
    const eventUrl = isLahacksCommunity ? 'https://www.lahacks.com' : null;

    const scoredResources = scoredResourcesWithMeta
      .map(({ startsAt: _startsAt, endsAt: _endsAt, source: _src, ...rest }) => rest);

    return sendJson(res, 200, {
      eventDetected,
      event: {
        name: eventName,
        venue: eventVenue,
        startTime: eventStart,
        endTime: eventEnd,
        confidence: topEventConfidence,
        sourceUrl: eventUrl,
      },
      resources: scoredResources,
      sourceMeta: {
        primarySource: 'curated',
        sourceReliability: SOURCE_RELIABILITY.curated,
        scoringVersion: 'v1-weighted',
      },
      requestEcho: {
        communityId: typeof communityId === 'string' ? communityId : null,
        lat,
        lon,
        desiredType: desiredType ?? null,
      },
    });
  });

/** Community discovery map/events: curated empty list (no third-party ticketing APIs). */
exports.communityEvents = functions
  .region('us-west1')
  .runWith({
    serviceAccount: 'lahacks2026@appspot.gserviceaccount.com',
  })
  .https.onRequest((req, res) => {
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
    return sendJson(res, 200, {
      events: [],
      sourceMeta: {
        providers: [],
        tab,
        communityId,
        count: 0,
        generatedAt: new Date().toISOString(),
        errors: [],
        geocoding: {
          provider: 'none',
          eventsMissingCoordsBefore: 0,
          queriesRun: 0,
          coordsFilledForEvents: 0,
        },
      },
    });
  });
