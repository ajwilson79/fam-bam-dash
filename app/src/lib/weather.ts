export type WeatherData = {
  current: {
    temperature: number
    windspeed: number
    weathercode: number
  }
  daily: {
    time: string[]
    weathercode: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

export function getEnvCoords() {
  const lat = import.meta.env.VITE_LAT
  const lon = import.meta.env.VITE_LON
  if (!lat || !lon) throw new Error('Missing VITE_LAT or VITE_LON in env')
  return { lat: Number(lat), lon: Number(lon) }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
  })
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch weather')
  const json = await res.json()
  // Normalize to our types
  const data: WeatherData = {
    current: {
      temperature: json.current?.temperature_2m,
      windspeed: json.current?.wind_speed_10m,
      weathercode: json.current?.weather_code,
    },
    daily: {
      time: json.daily?.time,
      weathercode: json.daily?.weather_code,
      temperature_2m_max: json.daily?.temperature_2m_max,
      temperature_2m_min: json.daily?.temperature_2m_min,
    },
  }
  return data
}

export function codeToIcon(code: number): string {
  // Simplified mapping based on Open-Meteo weather codes
  if ([0].includes(code)) return '☀️'
  if ([1,2].includes(code)) return '🌤️'
  if ([3].includes(code)) return '☁️'
  if ([45,48].includes(code)) return '🌫️'
  if ([51,53,55,56,57].includes(code)) return '🌦️'
  if ([61,63,65,66,67].includes(code)) return '🌧️'
  if ([71,73,75,77].includes(code)) return '❄️'
  if ([80,81,82].includes(code)) return '🌧️'
  if ([85,86].includes(code)) return '❄️'
  if ([95,96,99].includes(code)) return '⛈️'
  return '🌡️'
}
