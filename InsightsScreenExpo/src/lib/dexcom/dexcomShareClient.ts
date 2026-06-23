/**
 * React Native Dexcom Share client (fetch-based port of pydexcom / jsdexcom logic).
 */
import type { DexcomCredentials, DexcomRegion, GlucoseSample } from './types';

const APPLICATION_ID = 'd89443d2-327c-4a6f-89e5-496bbb0317db';

const BASE_URLS: Record<DexcomRegion, string> = {
  us: 'https://share2.dexcom.com',
  ous: 'https://shareous1.dexcom.com',
  jp: 'https://shareous1.dexcom.com',
};

const TREND_ARROWS: Record<string, string> = {
  None: '→',
  DoubleUp: '↑↑',
  SingleUp: '↑',
  FortyFiveUp: '↗',
  Flat: '→',
  FortyFiveDown: '↘',
  SingleDown: '↓',
  DoubleDown: '↓↓',
  NotComputable: '?',
  RateOutOfRange: '⚠️',
};

type RawDexcomReading = {
  WT?: string;
  Value?: number;
  Trend?: string;
};

function parseDexcomTimestamp(wt: string | undefined): number {
  if (!wt) {
    return 0;
  }
  const match = wt.match(/\d+/);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[0], 10);
}

function formatReading(reading: RawDexcomReading): GlucoseSample | null {
  const valueMgDl = reading.Value ?? 0;
  const timestampMs = parseDexcomTimestamp(reading.WT);
  if (!Number.isFinite(valueMgDl) || valueMgDl <= 0 || !timestampMs) {
    return null;
  }
  const trendDirection = reading.Trend;
  return {
    valueMgDl,
    timestampMs,
    trendDirection,
    trendArrow: trendDirection ? (TREND_ARROWS[trendDirection] ?? '?') : undefined,
  };
}

async function postJson<T>(
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; text: string; json: T | null }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Dexcom Share/3.0.2.11',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json: T | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as T;
    } catch {
      json = null;
    }
  }
  return { ok: response.ok, status: response.status, text, json };
}

export class DexcomShareClient {
  private readonly baseUrl: string;
  private sessionId: string | null = null;
  private accountId: string | null = null;

  constructor(private readonly credentials: DexcomCredentials) {
    this.baseUrl = BASE_URLS[credentials.region] ?? BASE_URLS.us;
  }

  async authenticate(): Promise<void> {
    if (!this.accountId) {
      const auth = await postJson<string>(
        `${this.baseUrl}/ShareWebServices/Services/General/AuthenticatePublisherAccount`,
        {
          accountName: this.credentials.username,
          password: this.credentials.password,
          applicationId: APPLICATION_ID,
        },
      );
      if (!auth.ok) {
        throw new Error('Dexcom account authentication failed. Check username, password, and region.');
      }
      this.accountId = auth.text.replace(/"/g, '');
      if (this.accountId === '00000000-0000-0000-0000-000000000000') {
        throw new Error('Invalid Dexcom credentials.');
      }
    }

    const login = await postJson<string>(
      `${this.baseUrl}/ShareWebServices/Services/General/LoginPublisherAccountById`,
      {
        accountId: this.accountId,
        password: this.credentials.password,
        applicationId: APPLICATION_ID,
      },
    );
    if (!login.ok) {
      throw new Error('Dexcom session login failed.');
    }
    this.sessionId = login.text.replace(/"/g, '');
    if (this.sessionId === '00000000-0000-0000-0000-000000000000') {
      throw new Error('Dexcom login failed. Ensure Share is enabled with at least one follower.');
    }
  }

  async getReadings(minutes: number, maxCount: number): Promise<GlucoseSample[]> {
    if (!this.sessionId) {
      await this.authenticate();
    }

    const url =
      `${this.baseUrl}/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues` +
      `?sessionId=${encodeURIComponent(this.sessionId!)}&minutes=${minutes}&maxCount=${maxCount}`;
    const response = await postJson<RawDexcomReading[] | { Code?: string; Message?: string }>(url);

    if (response.status === 500 && response.json && typeof response.json === 'object' && !Array.isArray(response.json)) {
      const err = response.json as { Code?: string; Message?: string };
      if (err.Code === 'SessionIdNotFound') {
        this.sessionId = null;
        await this.authenticate();
        return this.getReadings(minutes, maxCount);
      }
      throw new Error(err.Message ?? 'Dexcom server error.');
    }

    if (!response.ok || !Array.isArray(response.json)) {
      throw new Error('Failed to fetch Dexcom glucose readings.');
    }

    return response.json
      .map(formatReading)
      .filter((sample): sample is GlucoseSample => sample != null)
      .sort((a, b) => a.timestampMs - b.timestampMs);
  }
}

export async function validateDexcomCredentials(credentials: DexcomCredentials): Promise<void> {
  const client = new DexcomShareClient(credentials);
  await client.authenticate();
  const readings = await client.getReadings(30, 1);
  if (readings.length === 0) {
    throw new Error('Dexcom connected but no recent glucose readings were found.');
  }
}

export async function fetchDexcomGlucoseSamples(
  credentials: DexcomCredentials,
  minutes: number,
  maxCount: number,
): Promise<GlucoseSample[]> {
  const client = new DexcomShareClient(credentials);
  return client.getReadings(minutes, maxCount);
}
