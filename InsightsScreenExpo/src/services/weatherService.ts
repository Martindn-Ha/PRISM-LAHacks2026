export interface WeatherSnapshot {
  temperatureF: number;
  conditionLabel: string;
}

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
  61: 'Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Heavy Showers',
  95: 'Thunderstorm',
};

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
  };
}
