export interface WeatherInfo {
  tempC: number;
  conditionKey: string;
}

const CONDITION_MAP: Record<number, string> = {
  0: 'clear',
  1: 'clear',
  2: 'cloudy',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'rain',
  67: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'rain',
  81: 'rain',
  82: 'rain',
  85: 'snow',
  86: 'snow',
  95: 'storm',
  96: 'storm',
  99: 'storm',
};

function conditionKeyFor(code: number) {
  return CONDITION_MAP[code] ?? 'cloudy';
}

function dateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchWeather(
  lat: number,
  lng: number,
  timestamp: number,
): Promise<WeatherInfo | null> {
  try {
    const date = new Date(timestamp);
    const now = Date.now();
    const isPast = now - timestamp > 5 * 24 * 60 * 60 * 1000;

    if (isPast) {
      const dateParam = dateString(date);
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateParam}&end_date=${dateParam}&daily=temperature_2m_max,weather_code&timezone=auto`,
      );
      const data = await response.json();
      const tempC = data?.daily?.temperature_2m_max?.[0];
      const code = data?.daily?.weather_code?.[0];
      if (tempC === null || tempC === undefined || code === null || code === undefined) {
        return null;
      }
      return { tempC: Math.round(tempC), conditionKey: conditionKeyFor(code) };
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`,
    );
    const data = await response.json();
    const tempC = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;
    if (tempC === null || tempC === undefined || code === null || code === undefined) {
      return null;
    }
    return { tempC: Math.round(tempC), conditionKey: conditionKeyFor(code) };
  } catch {
    return null;
  }
}
