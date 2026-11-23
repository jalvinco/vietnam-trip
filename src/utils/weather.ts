export type DayWeather = {
  date: string;
  city: "Hội An" | "Đà Nẵng";
  tempMax: number;
  tempMin: number;
  tempCurrent?: number;
  weatherCode: number;
  label: string;
  emoji: string;
};

export type TripWeatherForecast = {
  byDate: Record<string, DayWeather>;
  hoiAnSummary: DayWeather | null;
  daNangSummary: DayWeather | null;
};

const TRIP_DATES = [
  "2026-11-24",
  "2026-11-25",
  "2026-11-26",
  "2026-11-27",
  "2026-11-28",
  "2026-11-29",
] as const;

const HOI_AN_COORDS = { latitude: 15.8801, longitude: 108.338 };
const DA_NANG_COORDS = { latitude: 16.0544, longitude: 108.2022 };

export function describeWeatherCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "Clear", emoji: "☀️" };
  if (code === 1) return { label: "Mostly clear", emoji: "🌤️" };
  if (code === 2) return { label: "Partly cloudy", emoji: "⛅" };
  if (code === 3) return { label: "Cloudy", emoji: "☁️" };
  if (code === 45 || code === 48) return { label: "Fog", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", emoji: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Rain", emoji: "🌧️" };
  if (code >= 80 && code <= 82) return { label: "Showers", emoji: "🌦️" };
  if (code >= 95) return { label: "Thunderstorm", emoji: "⛈️" };
  return { label: "Fair", emoji: "🌤️" };
}

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

async function fetchLocationMeteo(coords: {
  latitude: number;
  longitude: number;
}): Promise<OpenMeteoResponse> {
  const baseParams = `latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FHo_Chi_Minh`;
  const targetRangeUrl = `https://api.open-meteo.com/v1/forecast?${baseParams}&start_date=2026-11-24&end_date=2026-11-29`;

  const rangeRes = await fetch(targetRangeUrl);
  if (rangeRes.ok) {
    return (await rangeRes.json()) as OpenMeteoResponse;
  }

  const liveForecastUrl = `https://api.open-meteo.com/v1/forecast?${baseParams}&forecast_days=7`;
  const liveRes = await fetch(liveForecastUrl);
  if (!liveRes.ok) {
    throw new Error("Could not load Open-Meteo weather forecast.");
  }
  return (await liveRes.json()) as OpenMeteoResponse;
}

function buildDayWeather(
  date: string,
  city: "Hội An" | "Đà Nẵng",
  data: OpenMeteoResponse,
  fallbackIndex: number,
): DayWeather | null {
  const times = data.daily?.time ?? [];
  const exactIdx = times.indexOf(date);
  const idx = exactIdx !== -1 ? exactIdx : Math.min(fallbackIndex, Math.max(0, times.length - 1));

  const maxArr = data.daily?.temperature_2m_max ?? [];
  const minArr = data.daily?.temperature_2m_min ?? [];
  const codeArr = data.daily?.weather_code ?? [];

  const rawMax = maxArr[idx];
  const rawMin = minArr[idx];
  const rawCode = codeArr[idx] ?? data.current?.weather_code ?? 1;

  if (rawMax === undefined && data.current?.temperature_2m === undefined) {
    return null;
  }

  const tempMax = Math.round(rawMax ?? data.current?.temperature_2m ?? 28);
  const tempMin = Math.round(rawMin ?? tempMax - 4);
  const tempCurrent =
    data.current?.temperature_2m !== undefined
      ? Math.round(data.current.temperature_2m)
      : undefined;
  const { label, emoji } = describeWeatherCode(rawCode);

  return {
    date,
    city,
    tempMax,
    tempMin,
    tempCurrent,
    weatherCode: rawCode,
    label,
    emoji,
  };
}

export async function fetchTripWeather(): Promise<TripWeatherForecast> {
  const [hoiAnData, daNangData] = await Promise.all([
    fetchLocationMeteo(HOI_AN_COORDS),
    fetchLocationMeteo(DA_NANG_COORDS),
  ]);

  const byDate: Record<string, DayWeather> = {};

  TRIP_DATES.forEach((date, index) => {
    // Nov 24-26 in Hoi An, Nov 27-29 in Da Nang (Nov 27 is transition day Hoi An -> Da Nang)
    const isDaNang = date >= "2026-11-27";
    const city = isDaNang ? "Đà Nẵng" : "Hội An";
    const source = isDaNang ? daNangData : hoiAnData;
    const item = buildDayWeather(date, city, source, index);
    if (item) {
      byDate[date] = item;
    }
  });

  const hoiAnSummary =
    buildDayWeather("2026-11-24", "Hội An", hoiAnData, 0) ?? byDate["2026-11-24"] ?? null;
  const daNangSummary =
    buildDayWeather("2026-11-27", "Đà Nẵng", daNangData, 3) ?? byDate["2026-11-27"] ?? null;

  return {
    byDate,
    hoiAnSummary,
    daNangSummary,
  };
}
