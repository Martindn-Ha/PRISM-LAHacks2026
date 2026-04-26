export interface WeatherSnapshot {
  temperatureF: number;
  conditionLabel: string;
  /** WMO weather interpretation code (Open-Meteo `current.weather_code`). */
  weatherCode: number;
}

/** Visual bucket for icons; derived from WMO codes used by Open-Meteo. */
export type WeatherIconKind =
  | 'clear'
  | 'mostly_clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'showers'
  | 'thunderstorm'
  | 'unknown';

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Cloudy',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  77: 'Snow Grains',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Heavy Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  97: 'Thunderstorm',
  98: 'Thunderstorm',
  99: 'Thunderstorm',
};

export function weatherCodeToIconKind(code: number): WeatherIconKind {
  if (!Number.isFinite(code)) {
    return 'unknown';
  }
  if (code === 0) {
    return 'clear';
  }
  if (code === 1) {
    return 'mostly_clear';
  }
  if (code === 2) {
    return 'partly_cloudy';
  }
  if (code === 3) {
    return 'cloudy';
  }
  if (code === 45 || code === 48) {
    return 'fog';
  }
  if (code >= 51 && code <= 57) {
    return 'drizzle';
  }
  if (code >= 61 && code <= 67) {
    return 'rain';
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'snow';
  }
  if (code >= 80 && code <= 82) {
    return 'showers';
  }
  if (code >= 95 && code <= 99) {
    return 'thunderstorm';
  }
  return 'unknown';
}

function cToF(celsius: number) {
  return Math.round((celsius * 9) / 5 + 32);
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code&temperature_unit=celsius';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`weather fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const celsius = Number(data?.current?.temperature_2m);
  const code = Number(data?.current?.weather_code);

  if (!Number.isFinite(celsius) || !Number.isFinite(code)) {
    throw new Error('weather payload missing expected fields');
  }

  return {
    temperatureF: cToF(celsius),
    conditionLabel: WEATHER_CODES[code] ?? 'Weather',
    weatherCode: code,
  };
}
